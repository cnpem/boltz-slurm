from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yaml
import subprocess
import os
import tempfile
from pathlib import Path
import logging
import datetime
import hashlib
import json
from typing import List, Optional, Union, Dict, Any
import zipfile
import io

#============== CONFIGURAÇÃO INICIAL DO SISTEMA ==============#
# Configuração de logs para monitoramento e depuração do sistema
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Criação da aplicação FastAPI com título e descrição
app = FastAPI(
    title="Boltz Affinity Prediction", 
    description="Interface web para predição de afinidade proteína-ligante usando Boltz"
)

#============== CONFIGURAÇÃO CORS ==============#
'''
Esta configuração adiciona middleware CORS para permitir que o frontend React 
se comunique com o backend FastAPI.

CORS é necessário porque:
- Frontend (React) roda na porta 6868
- Backend (FastAPI) roda na porta 6969  
- Navegadores bloqueiam requisições entre portas diferentes por segurança
- Esta configuração remove essa restrição para nossa aplicação
'''
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:6868"],  # Permite apenas nossa aplicação React
    allow_credentials=True,                   # Permite cookies e credenciais
    allow_methods=["*"],                      # Permite todos os métodos HTTP
    allow_headers=["*"],                      # Permite todos os cabeçalhos
)

# Criação do diretório base para armazenar todos os trabalhos de predição
jobs_dir = Path("jobs")
jobs_dir.mkdir(exist_ok=True)  # exist_ok=True evita erro se já existir

#============== MODELOS DE DADOS (ESTRUTURAS PYDANTIC) ==============#
"""
Estes modelos definem a estrutura dos dados que nossa API aceita e retorna.
É como criar um "formulário" que especifica exatamente que informações 
são obrigatórias e opcionais para cada tipo de requisição.
"""

class Modification(BaseModel):
    """Representa modificações químicas em resíduos de proteínas"""
    position: int  # Posição do resíduo na sequência
    ccd: str      # Código do Chemical Component Dictionary

class SequenceEntity(BaseModel):
    """Representa uma entidade biológica (proteína, DNA, RNA ou ligante)"""
    entity_type: str                              # Tipo: protein, dna, rna, ligand
    id: Union[str, List[str]]                    # Identificador único ou lista de IDs
    sequence: Optional[str] = None               # Sequência de aminoácidos/nucleotídeos
    smiles: Optional[str] = None                 # Notação SMILES para ligantes
    ccd: Optional[str] = None                    # Código CCD para ligantes
    msa: Optional[str] = None                    # Arquivo de alinhamento múltiplo
    modifications: Optional[List[Modification]] = None  # Modificações químicas
    cyclic: Optional[bool] = False               # Se a molécula é cíclica

class BondConstraint(BaseModel):
    """Define uma ligação forçada entre dois átomos específicos"""
    atom1: List[Union[str, int]]  # [CADEIA, RESÍDUO, ÁTOMO]
    atom2: List[Union[str, int]]  # [CADEIA, RESÍDUO, ÁTOMO]

class PocketConstraint(BaseModel):
    """Define que o ligante deve ficar próximo a resíduos específicos"""
    binder: str                               # ID do ligante
    contacts: List[List[Union[str, int]]]     # Lista de contatos obrigatórios
    max_distance: Optional[float] = None      # Distância máxima permitida

class ContactConstraint(BaseModel):
    """Define proximidade obrigatória entre dois resíduos/átomos"""
    token1: List[Union[str, int]]         # Primeiro resíduo/átomo
    token2: List[Union[str, int]]         # Segundo resíduo/átomo
    max_distance: Optional[float] = None  # Distância máxima permitida

class Constraint(BaseModel):
    """Container para diferentes tipos de restrições estruturais"""
    bond: Optional[BondConstraint] = None       # Restrição de ligação química
    pocket: Optional[PocketConstraint] = None   # Restrição de sítio de ligação
    contact: Optional[ContactConstraint] = None # Restrição de contato

class Template(BaseModel):
    """Estrutura 3D de referência para guiar a predição"""
    cif: str                                           # Caminho do arquivo de estrutura
    chain_id: Optional[Union[str, List[str]]] = None  # Cadeia(s) específica(s) a usar
    template_id: Optional[List[str]] = None           # ID(s) do template

class AffinityProperty(BaseModel):
    """Configuração para cálculo de afinidade de ligação"""
    binder: str  # ID da molécula que se liga (geralmente o ligante)

class Property(BaseModel):
    """Container para propriedades a serem calculadas"""
    affinity: Optional[AffinityProperty] = None  # Cálculo de afinidade

class BoltzRequest(BaseModel):
    """Estrutura completa de uma requisição de predição"""
    sequences: List[SequenceEntity]              # Lista de sequências de ligante, protein, rna ou dna
    constraints: Optional[List[Constraint]] = None   # Restrições estruturais opcionais
    templates: Optional[List[Template]] = None       # Estruturas de referência opcionais  
    properties: Optional[List[Property]] = None      # Propriedades a calcular opcionais
    job_name: Optional[str] = None                   # Nome personalizado do trabalho
    version: int = 1                                 # Versão do formato de entrada

class PredictionResponse(BaseModel):
    """Resposta retornada após uma predição"""
    success: bool        # Se a predição foi bem-sucedida
    message: str         # Mensagem explicativa
    output: str = ""     # Saída do programa Boltz
    yaml_content: str = ""  # Conteúdo do arquivo YAML gerado
    job_id: str = ""     # ID único do trabalho
    job_dir: str = ""    # Diretório onde estão os arquivos
    timestamp: str = ""  # Momento da criação

class JobInfo(BaseModel):
    """Informações básicas de um trabalho (para compatibilidade)"""
    job_id: str
    timestamp: str
    status: str
    protein_id: str
    ligand_id: str
    ligand_smiles: str
    job_dir: str
    yaml_file: str
    output_dir: str

#============== FUNÇÕES AUXILIARES ==============#

def generate_job_id() -> str:
    """
    Gera um ID único para cada trabalho usando timestamp + hash.
    
    Formato: job_YYYYMMDD_HHMMSS_HASH8
    Exemplo: job_20240129_143052_a7b2c9d1
    
    O hash extra garante unicidade mesmo se múltiplos jobs forem 
    criados no mesmo segundo.
    """
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Criamos hash usando microssegundos para garantir unicidade
    hash_input = f"{timestamp}_{datetime.datetime.now().microsecond}"
    short_hash = hashlib.md5(hash_input.encode()).hexdigest()[:8]
    
    return f"job_{timestamp}_{short_hash}"

def create_job_directory(job_id: str) -> Path:
    """
    Cria diretório específico para um trabalho.
    
    Estrutura criada:
    jobs/
    └── job_20240129_143052_a7b2c9d1/
        ├── boltz_input.yaml      (criado depois)
        ├── job_info.json         (criado depois)  
        └── boltz_output/         (criado depois)
    """
    job_path = jobs_dir / job_id
    job_path.mkdir(exist_ok=True)
    return job_path

def save_job_info(job_dir: Path, job_info: dict):
    """
    Salva metadados do trabalho em arquivo JSON.
    
    Este arquivo contém todas as informações importantes:
    - Status do trabalho (running, completed, failed, etc.)
    - Timestamps de criação e conclusão
    - Comando executado
    - Informações das entidades processadas
    - Mensagens de erro (se houver)
    """
    info_file = job_dir / "job_info.json"
    with open(info_file, 'w') as f:
        json.dump(job_info, f, indent=2, default=str)

def load_job_info(job_dir: Path) -> dict:
    """
    Carrega metadados do trabalho a partir do arquivo JSON.
    
    Retorna dicionário vazio se o arquivo não existir.
    """
    info_file = job_dir / "job_info.json"
    
    if info_file.exists():
        with open(info_file, 'r') as f:
            return json.load(f)
    return {}

#============== ENDPOINTS DA API ==============#

@app.get("/api/jobs")
async def list_jobs():
    """
    Lista todos os trabalhos de predição existentes.
    
    Varre o diretório 'jobs' procurando por subdiretórios que começam 
    com 'job_' e carrega suas informações básicas.
    
    Retorna lista ordenada por data (mais recentes primeiro).
    """
    jobs = []
    
    # Itera por todos os diretórios dentro de 'jobs/'
    for job_dir in jobs_dir.iterdir():
        if job_dir.is_dir() and job_dir.name.startswith("job_"):
            try:
                job_info = load_job_info(job_dir)
                if job_info:  # Só adiciona se conseguiu carregar as informações
                    jobs.append(job_info)
            except Exception as e:
                logger.warning(f"Falha ao carregar informações do job {job_dir.name}: {e}")
    
    # Ordena por timestamp (mais recentes primeiro)
    jobs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    return {"jobs": jobs}

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    """
    Obtém informações detalhadas de um trabalho específico.
    
    Útil para verificar status, ver parâmetros usados, 
    mensagens de erro, etc.
    """
    job_path = jobs_dir / job_id
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Trabalho não encontrado")
    
    job_info = load_job_info(job_path)
    if not job_info:
        raise HTTPException(status_code=404, detail="Informações do trabalho não encontradas")
    
    return job_info

@app.get("/api/jobs/{job_id}/file/{filename}")
async def get_job_file(job_id: str, filename: str):
    """
    Obtém arquivos específicos de resultados de um trabalho.
    
    Por segurança, só permite acesso a arquivos pré-aprovados:
    - affinity_boltz_input.json: Resultados de afinidade
    - confidence_boltz_input_model_0.json: Métricas de confiança  
    - boltz_input.yaml: Configuração usada na predição
    
    Busca em múltiplas localizações pois o Boltz pode organizar
    arquivos diferentemente dependendo da versão.
    """
    job_path = jobs_dir / job_id
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Trabalho não encontrado")
    
    # Lista de arquivos permitidos (whitelist de segurança)
    allowed_files = [
        "affinity_boltz_input.json", 
        "confidence_boltz_input_model_0.json",
        "boltz_input.yaml"
    ]
    if filename not in allowed_files:
        raise HTTPException(status_code=403, detail="Arquivo não permitido")
    
    # Possíveis localizações do arquivo
    possible_paths = [
        job_path / "boltz_output" / filename,
        job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / filename,
        job_path / filename
    ]

    # Procura o arquivo na primeira localização disponível
    file_path = None
    for path in possible_paths:
        if path.exists():
            file_path = path
            break
    
    if not file_path:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    # Carrega e retorna conteúdo JSON
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao ler arquivo: {str(e)}")

@app.post("/upload_msa")
async def upload_msa(file: UploadFile = File(...)):
    """
    Upload de arquivos MSA (Multiple Sequence Alignment).
    
    MSA são alinhamentos de sequências homólogas que ajudam o Boltz
    a entender melhor a estrutura e evolução da proteína.
    
    Apenas arquivos .a3m são aceitos (formato padrão do HHblits).
    """
    if not file.filename.endswith('.a3m'):
        raise HTTPException(status_code=400, detail="Apenas arquivos .a3m são permitidos")
    
    # Cria diretório de uploads se não existir
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    
    # Gera nome único para evitar conflitos
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{timestamp}_{file.filename}"
    file_path = uploads_dir / unique_filename

    # Salva arquivo enviado
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return {"filename": unique_filename, "path": str(file_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao salvar arquivo: {str(e)}")

@app.post("/upload_template")
async def upload_template(file: UploadFile = File(...)):
    """
    Upload de arquivos de template (estruturas de referência).
    
    Templates são estruturas 3D conhecidas (.cif ou .pdb) que servem
    como "guias" para o Boltz durante a predição estrutural.
    
    É como dar uma foto de referência para um artista.
    """
    if not (file.filename.endswith('.cif') or file.filename.endswith('.pdb')):
        raise HTTPException(status_code=400, detail="Apenas arquivos .cif e .pdb são permitidos")
    
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)

    # Gera nome único com timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{timestamp}_{file.filename}"
    file_path = uploads_dir / unique_filename

    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return {"filename": unique_filename, "path": str(file_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao salvar arquivo: {str(e)}")

@app.post("/predict", response_model=PredictionResponse)
async def predict_boltz(request: BoltzRequest):
    """
    Endpoint principal para executar predições com o Boltz.
    
    Este é o coração da aplicação. Recebe uma requisição estruturada,
    converte para formato YAML que o Boltz entende, executa a predição
    e retorna os resultados.
    
    Fluxo do processo:
    1. Gera ID único e cria diretório do trabalho
    2. Converte requisição para formato YAML
    3. Salva configuração e metadados  
    4. Executa comando Boltz
    5. Processa resultados e retorna resposta
    """
    # Inicialização do trabalho
    job_id = generate_job_id()
    job_path = create_job_directory(job_id)
    timestamp = datetime.datetime.now().isoformat()
    
    try:
        #============== MONTAGEM DA CONFIGURAÇÃO YAML ==============#
        """
        Convertemos a requisição estruturada em formato YAML que o Boltz entende.
        É como traduzir instruções de uma linguagem para outra.
        """
        yaml_data = {
            "version": request.version,
            "sequences": []
        }
        
        # Processamento das sequências (proteínas, ligantes, DNA, RNA)
        for seq in request.sequences:
            seq_dict = {
                seq.entity_type: {
                    "id": seq.id
                }
            }
            
            # Adiciona campos opcionais apenas se presentes
            optional_fields = ['sequence', 'smiles', 'ccd', 'msa', 'cyclic']
            for field in optional_fields:
                value = getattr(seq, field)
                if value is not None and value != "":
                    seq_dict[seq.entity_type][field] = value
            
            # Processa modificações químicas se presentes
            if seq.modifications:
                seq_dict[seq.entity_type]["modifications"] = [
                    {"position": mod.position, "ccd": mod.ccd} 
                    for mod in seq.modifications
                ]

            yaml_data["sequences"].append(seq_dict)

        #============== PROCESSAMENTO DAS RESTRIÇÕES ==============#
        """
        Restrições são "regras" que forçam o Boltz a criar estruturas
        com características específicas (ligações, proximidades, etc.).
        """
        if request.constraints:
            yaml_data["constraints"] = []

            for constraint in request.constraints:
                constraint_dict = {}
                
                if constraint.bond:
                    constraint_dict["bond"] = {
                        "atom1": constraint.bond.atom1,
                        "atom2": constraint.bond.atom2
                    }
                elif constraint.pocket:
                    pocket_dict = {
                        "binder": constraint.pocket.binder,
                        "contacts": constraint.pocket.contacts
                    }
                    if constraint.pocket.max_distance:
                        pocket_dict["max_distance"] = constraint.pocket.max_distance
                    constraint_dict["pocket"] = pocket_dict
                elif constraint.contact:
                    contact_dict = {
                        "token1": constraint.contact.token1,
                        "token2": constraint.contact.token2
                    }
                    if constraint.contact.max_distance:
                        contact_dict["max_distance"] = constraint.contact.max_distance
                    constraint_dict["contact"] = contact_dict
                
                if constraint_dict:
                    yaml_data["constraints"].append(constraint_dict)

        #============== PROCESSAMENTO DOS TEMPLATES ==============#
        """
        Templates são estruturas 3D conhecidas que servem como "moldes"
        para guiar o Boltz. É como dar uma foto de referência para um artista.
        """
        if request.templates:
            yaml_data["templates"] = []
            
            for template in request.templates:
                template_dict = {"cif": template.cif}
                
                # Adiciona informações opcionais do template
                if template.chain_id:
                    template_dict["chain_id"] = template.chain_id
                if template.template_id:
                    template_dict["template_id"] = template.template_id
                
                yaml_data["templates"].append(template_dict)

        #============== PROCESSAMENTO DAS PROPRIEDADES ==============#
        """
        Propriedades definem QUE TIPO DE CÁLCULO queremos que o Boltz faça.
        Atualmente suportamos apenas cálculo de afinidade (força da ligação).
        """
        if request.properties:
            yaml_data["properties"] = []
            
            for prop in request.properties:
                prop_dict = {}
                
                if prop.affinity:
                    prop_dict["affinity"] = {"binder": prop.affinity.binder}
                
                if prop_dict:
                    yaml_data["properties"].append(prop_dict)

        #============== GERAÇÃO DO ARQUIVO YAML ==============#
        yaml_file = job_path / "boltz_input.yaml"

        # Classe customizada para formatação bonita do YAML
        class CustomDumper(yaml.SafeDumper):
            def write_line_break(self, data=None):
                super().write_line_break(data)

        def represent_list(dumper, data):
            """
            Formata listas de forma otimizada:
            - Coordenadas/contatos: formato compacto [[A, 10, CA], [B, 20, CB]]
            - Outras listas: formato expandido (uma linha por item)
            """
            if (isinstance(data, list) and len(data) > 0 and 
                isinstance(data[0], list) and len(data[0]) >= 2):
                return dumper.represent_sequence('tag:yaml.org,2002:seq', data, flow_style=True)
            return dumper.represent_sequence('tag:yaml.org,2002:seq', data, flow_style=False)

        CustomDumper.add_representer(list, represent_list)
        
        with open(yaml_file, 'w') as f:
            yaml.dump(yaml_data, f, Dumper=CustomDumper, default_flow_style=False)

        #============== PREPARAÇÃO PARA EXECUÇÃO ==============#
        output_dir = job_path / "boltz_output"
        output_dir.mkdir(exist_ok=True)
        
        # Extrai resumo das entidades para os metadados
        entities_summary = []
        for seq in request.sequences:
            entity_info = {
                "type": seq.entity_type,
                "id": seq.id if isinstance(seq.id, str) else seq.id[0],
            }
            
            # Adiciona informações específicas se disponíveis
            if seq.sequence:
                entity_info["sequence_length"] = len(seq.sequence)
            if seq.smiles:
                entity_info["smiles"] = seq.smiles
            if seq.ccd:
                entity_info["ccd"] = seq.ccd
                
            entities_summary.append(entity_info)
        
        # Cria registro completo do trabalho
        job_info = {
            "job_id": job_id,
            "timestamp": timestamp,
            "status": "running",
            "entities": entities_summary,
            "has_affinity": bool(request.properties and any(p.affinity for p in request.properties)),
            "job_dir": str(job_path),
            "yaml_file": str(yaml_file),
            "output_dir": str(output_dir),
            "command": ""
        }

        if request.job_name:
            job_info["job_name"] = request.job_name
            
        save_job_info(job_path, job_info)

        #============== EXECUÇÃO DO BOLTZ ==============#
        """
        Monta e executa o comando do Boltz com parâmetros apropriados.
        """
        cmd = ["boltz", "predict", "boltz_input.yaml", "--out_dir", "boltz_output"]

        # Verifica se há arquivos MSA fornecidos
        has_msa_files = any(seq.msa and seq.msa.strip() and seq.msa != "empty" 
                           for seq in request.sequences)
        if not has_msa_files:
            cmd.append("--use_msa_server")  # Usa servidor MSA automático
        
        cmd.extend(["--output_format", "pdb"])

        job_info["command"] = " ".join(cmd)
        logger.info(f"Executando comando para job {job_id}: {' '.join(cmd)}")
        save_job_info(job_path, job_info)
        
        # Executa com timeout de 10 minutos
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,
            cwd=str(job_path)
        )

        yaml_content = yaml.dump(yaml_data, default_flow_style=False)

        #============== PROCESSAMENTO DOS RESULTADOS ==============#
        if result.returncode == 0:
            # SUCESSO
            job_info.update({
                "status": "completed",
                "completion_time": datetime.datetime.now().isoformat(),
                "stdout": result.stdout,
                "stderr": result.stderr
            })
            save_job_info(job_path, job_info)
            
            return PredictionResponse(
                success=True,
                message=f"Predição concluída com sucesso! Job ID: {job_id}",
                output=result.stdout,
                yaml_content=yaml_content,
                job_id=job_id,
                job_dir=str(job_path),
                timestamp=timestamp
            )
        else:
            # FALHA
            job_info.update({
                "status": "failed",
                "completion_time": datetime.datetime.now().isoformat(),
                "stdout": result.stdout,
                "stderr": result.stderr,
                "return_code": result.returncode
            })
            save_job_info(job_path, job_info)
            
            return PredictionResponse(
                success=False,
                message=f"Predição falhou com código {result.returncode}. Job ID: {job_id}",
                output=f"STDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}",
                yaml_content=yaml_content,
                job_id=job_id,
                job_dir=str(job_path),
                timestamp=timestamp
            )

    #============== TRATAMENTO DE ERROS ==============#
    except subprocess.TimeoutExpired:
        """Timeout após 10 minutos - protege contra travamentos"""
        job_info.update({
            "status": "timeout",
            "completion_time": datetime.datetime.now().isoformat(),
            "error": "Predição excedeu tempo limite de 10 minutos"
        })
        save_job_info(job_path, job_info)
        
        return PredictionResponse(
            success=False,
            message=f"Predição excedeu tempo limite. Job ID: {job_id}",
            output="O processo demorou muito e foi interrompido.",
            job_id=job_id,
            job_dir=str(job_path),
            timestamp=timestamp
        )
    
    except Exception as e:
        """Tratamento para erros inesperados"""
        logger.error(f"Erro durante predição do job {job_id}: {str(e)}")
        
        job_info.update({
            "status": "error",
            "completion_time": datetime.datetime.now().isoformat(),
            "error": str(e)
        })
        save_job_info(job_path, job_info)
        
        return PredictionResponse(
            success=False,
            message=f"Erro inesperado: {str(e)}. Job ID: {job_id}",
            output="",
            job_id=job_id,
            job_dir=str(job_path),
            timestamp=timestamp
        )

#============== ENDPOINTS DE RESULTADOS ==============#

@app.get("/health")
async def health_check():
    """Verifica se o serviço está funcionando"""
    return {"status": "healthy", "service": "Boltz Affinity Prediction"}

@app.get("/api/jobs/{job_id}/results")
async def get_job_results(job_id: str):
    """
    Obtém resultados formatados de um trabalho específico.
    
    Busca e formata:
    - Resultados de afinidade (força da ligação)
    - Métricas de confiança (qualidade da predição)
    - Informações gerais do trabalho
    
    Retorna dados tanto em formato resumido (para interface)
    quanto detalhado (para análise avançada).
    """
    job_path = jobs_dir / job_id
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Trabalho não encontrado")

    job_info = load_job_info(job_path)
    if not job_info:
        raise HTTPException(status_code=404, detail="Informações do trabalho não encontradas")
    
    results = {
        "job_info": job_info,
        "affinity_results": None,
        "confidence_results": None
    }

    # Busca resultados de afinidade em múltiplas localizações
    affinity_paths = [
        job_path / "boltz_output" / "affinity_boltz_input.json",
        job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / "affinity_boltz_input.json"
    ]

    for path in affinity_paths:
        if path.exists():
            try:
                with open(path, 'r') as f:
                    affinity_data = json.load(f)
                    results["affinity_results"] = format_affinity_results(affinity_data)
                break
            except Exception as e:
                logger.warning(f"Falha ao carregar resultados de afinidade de {path}: {e}")

    # Busca resultados de confiança
    confidence_paths = [
        job_path / "boltz_output" / "confidence_boltz_input_model_0.json",
        job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / "confidence_boltz_input_model_0.json"
    ]
    
    for path in confidence_paths:
        if path.exists():
            try:
                with open(path, 'r') as f:
                    confidence_data = json.load(f)
                    results["confidence_results"] = format_confidence_results(confidence_data)
                break
            except Exception as e:
                logger.warning(f"Falha ao carregar resultados de confiança de {path}: {e}")
    
    return results

#============== FUNÇÕES DE FORMATAÇÃO ==============#

def format_affinity_results(data):
    """
    Formata resultados de afinidade para exibição amigável.
    
    Transforma dados técnicos em formato mais acessível:
    - Resume informações principais (afinidade, confiança, unidades)
    - Mantém dados completos para análise detalhada
    
    É como criar um "resumo executivo" de um relatório técnico.
    """
    if not data or not isinstance(data, dict):
        return None
    
    formatted = {
        "summary": {},      # Informações principais para interface
        "detailed": data    # Dados completos para análise avançada
    }
    
    # Extrai métricas principais
    key_metrics = {
        "affinity": "binding_affinity",           # Força da ligação
        "affinity_confidence": "confidence",      # Confiabilidade do resultado
        "units": "units"                          # Unidades de medida
    }
    
    for source_key, target_key in key_metrics.items():
        if source_key in data:
            formatted["summary"][target_key] = data[source_key]
    
    return formatted

def format_confidence_results(data):
    """
    Formata resultados de confiança para exibição amigável.
    
    Processa métricas de qualidade da predição:
    - Confiança geral da estrutura
    - Estatísticas por resíduo (média, min, max)
    - Mantém dados detalhados disponíveis
    """
    if not data or not isinstance(data, dict):
        return None
    
    formatted = {
        "summary": {},
        "detailed": data
    }

    if "confidence" in data:
        conf_data = data["confidence"]
        
        if isinstance(conf_data, dict):
            # Confiança geral
            if "overall" in conf_data:
                formatted["summary"]["overall_confidence"] = conf_data["overall"]

            # Estatísticas por resíduo
            if "per_residue" in conf_data:
                per_res = conf_data["per_residue"]
                if isinstance(per_res, list) and per_res:
                    formatted["summary"].update({
                        "mean_confidence": sum(per_res) / len(per_res),
                        "min_confidence": min(per_res),
                        "max_confidence": max(per_res)
                    })
        else:
            formatted["summary"]["confidence_score"] = conf_data
    
    return formatted

#============== ENDPOINTS DE DOWNLOAD ==============#

@app.get("/api/jobs/{job_id}/pdb")
async def get_job_pdb(job_id: str):
    """
    Download do arquivo PDB (estrutura 3D) de um trabalho.
    
    O arquivo PDB contém a estrutura 3D predita em formato padrão
    que pode ser visualizado em:
    - PyMOL, ChimeraX (programas desktop)
    - Mol* Viewer, 3Dmol.js (visualizadores web)
    - Qualquer software de visualização molecular
    
    É como baixar uma "foto 3D" da molécula criada pelo Boltz.
    """
    job_path = jobs_dir / job_id
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Trabalho não encontrado")
    
    # Localizações possíveis do arquivo PDB
    possible_paths = [
        job_path / "boltz_output" / "boltz_input.pdb",
        job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / "boltz_input.pdb",
        job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / "boltz_input_model_0.pdb",
        job_path / "boltz_output" / "boltz_input_model_0.pdb"
    ]
    
    # Busca recursiva por qualquer arquivo .pdb
    output_dir = job_path / "boltz_output"
    if output_dir.exists():
        for pdb_file in output_dir.rglob("*.pdb"):
            possible_paths.append(pdb_file)
    
    # Usa o primeiro arquivo encontrado
    pdb_file_path = None
    for path in possible_paths:
        if path.exists():
            pdb_file_path = path
            break
    
    if not pdb_file_path:
        raise HTTPException(status_code=404, detail="Arquivo PDB não encontrado")
    
    return FileResponse(
        pdb_file_path,
        media_type="chemical/x-pdb",      # Tipo MIME específico para PDB
        filename=f"{job_id}.pdb"
    )

@app.get("/api/jobs/{job_id}/download")
async def download_job_archive(job_id: str):
    """
    Download de arquivo ZIP com todos os resultados de um trabalho.
    
    O arquivo ZIP contém:
    - Metadados do trabalho (job_info.json)
    - Configuração usada (boltz_input.yaml)  
    - Estrutura 3D predita (.pdb)
    - Resultados de afinidade e confiança (.json)
    - Resultados formatados para interface
    - Logs e outros arquivos auxiliares
    
    É como baixar uma "pasta completa" com tudo relacionado ao trabalho.
    """
    job_path = jobs_dir / job_id
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Trabalho não encontrado")
    
    job_info = load_job_info(job_path)
    if not job_info:
        raise HTTPException(status_code=404, detail="Informações do trabalho não encontradas")
    
    # Cria ZIP na memória (sem arquivos temporários no disco)
    zip_buffer = io.BytesIO()
    
    try:
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Adiciona metadados do trabalho
            job_info_json = json.dumps(job_info, indent=2, default=str)
            zip_file.writestr(f"{job_id}_info.json", job_info_json)

            # Adiciona configuração YAML
            yaml_file = job_path / "boltz_input.yaml"
            if yaml_file.exists():
                zip_file.write(yaml_file, f"{job_id}_input.yaml")

            # Adiciona arquivo PDB (busca em múltiplas localizações)
            pdb_paths = [
                job_path / "boltz_output" / "boltz_input.pdb",
                job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / "boltz_input.pdb",
                job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / "boltz_input_model_0.pdb",
                job_path / "boltz_output" / "boltz_input_model_0.pdb"
            ]

            # Busca recursiva por arquivos PDB
            output_dir = job_path / "boltz_output"
            if output_dir.exists():
                for pdb_file in output_dir.rglob("*.pdb"):
                    pdb_paths.append(pdb_file)
            
            # Adiciona primeiro PDB encontrado
            pdb_added = False
            for pdb_path in pdb_paths:
                if pdb_path.exists() and not pdb_added:
                    zip_file.write(pdb_path, f"{job_id}_structure.pdb")
                    pdb_added = True
                    break

            # Adiciona arquivos de resultados
            result_files = [
                ("affinity_boltz_input.json", f"{job_id}_affinity_results.json"),
                ("confidence_boltz_input_model_0.json", f"{job_id}_confidence_results.json")
            ]
            
            for result_file, archive_name in result_files:
                possible_paths = [
                    job_path / "boltz_output" / result_file,
                    job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / result_file
                ]
                
                for path in possible_paths:
                    if path.exists():
                        zip_file.write(path, archive_name)
                        break

            # Adiciona resultados formatados
            try:
                response = await get_job_results(job_id)
                formatted_results = json.dumps(response, indent=2, default=str)
                zip_file.writestr(f"{job_id}_formatted_results.json", formatted_results)
            except:
                pass  # Ignora se falhar

            # Adiciona arquivos de log
            if output_dir.exists():
                for file_path in output_dir.rglob("*.log"):
                    if file_path.is_file():
                        relative_path = file_path.relative_to(job_path)
                        zip_file.write(file_path, f"{job_id}_{relative_path.name}")
        
        zip_buffer.seek(0)
        
        # Nome do arquivo baseado no nome do trabalho ou job_id
        job_name = job_info.get('job_name', job_id)
        filename = f"{job_name}_complete.zip" if job_info.get('job_name') else f"{job_id}_complete.zip"
        
        # Cria arquivo temporário para servir o ZIP
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_file:
            tmp_file.write(zip_buffer.getvalue())
            tmp_file_path = tmp_file.name
        
        return FileResponse(
            path=tmp_file_path,
            media_type="application/zip",
            filename=filename
        )
        
    except Exception as e:
        logger.error(f"Falha ao criar arquivo ZIP para job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Falha ao criar arquivo de download: {str(e)}")