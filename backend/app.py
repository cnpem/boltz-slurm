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

# Configuração de loggings para depuração e monitoramento de erros e demais informações
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Aqui estamos criando a aplicação do FastAPI onde definimos o titulo e a descrição da aplicação
app = FastAPI(title="Boltz Affinity Prediction", description="Web interface for Boltz protein-ligand affinity prediction")

#============== CONFIGURAÇÃO CORS ==============#
'''
Esta configuração adiciona middleware CORS para permitir que o frontend React se comunique com o backend FastAPI.

Esse CORS é necessário porque o frontend e o backend estão rodando em portas diferentes (6868 para React e 6969 para FastAPI), e os navegadores bloqueiam requisições cross-origin por padrão por razões de segurança.
'''
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:6868"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Criamos o diretório base para armazenar os trabalhos de predição do Boltz e verificamos se ele existe.
jobs_dir = Path("jobs")
jobs_dir.mkdir(exist_ok=True)


#============== MODELOS DE DADOS PARA REQUISIÇÕES E RESPOSTAS ==============#
# Modelos Pydantic para validação e estruturação dos dados de entrada e saída

class Modification(BaseModel):
    position: int
    ccd: str

class SequenceEntity(BaseModel):
    entity_type: str  # protein, dna, rna, ligand
    id: Union[str, List[str]]
    sequence: Optional[str] = None  # protein, dna, rna
    smiles: Optional[str] = None   # ligand
    ccd: Optional[str] = None      # ligand
    msa: Optional[str] = None      # protein
    modifications: Optional[List[Modification]] = None
    cyclic: Optional[bool] = False

class BondConstraint(BaseModel):
    atom1: List[Union[str, int]]  # [CHAIN_ID, RES_IDX, ATOM_NAME]
    atom2: List[Union[str, int]]  # [CHAIN_ID, RES_IDX, ATOM_NAME]

class PocketConstraint(BaseModel):
    binder: str
    contacts: List[List[Union[str, int]]]  # [[CHAIN_ID, RES_IDX/ATOM_NAME], ...]
    max_distance: Optional[float] = None

class ContactConstraint(BaseModel):
    token1: List[Union[str, int]]  # [CHAIN_ID, RES_IDX/ATOM_NAME]
    token2: List[Union[str, int]]  # [CHAIN_ID, RES_IDX/ATOM_NAME]
    max_distance: Optional[float] = None

class Constraint(BaseModel):
    bond: Optional[BondConstraint] = None
    pocket: Optional[PocketConstraint] = None
    contact: Optional[ContactConstraint] = None

class Template(BaseModel):
    cif: str
    chain_id: Optional[Union[str, List[str]]] = None
    template_id: Optional[List[str]] = None

class AffinityProperty(BaseModel):
    binder: str

class Property(BaseModel):
    affinity: Optional[AffinityProperty] = None

class BoltzRequest(BaseModel):
    sequences: List[SequenceEntity]
    constraints: Optional[List[Constraint]] = None
    templates: Optional[List[Template]] = None
    properties: Optional[List[Property]] = None
    job_name: Optional[str] = None
    version: int = 1

class PredictionResponse(BaseModel):
    success: bool
    message: str
    output: str = ""
    yaml_content: str = ""
    job_id: str = ""
    job_dir: str = ""
    timestamp: str = ""

class JobInfo(BaseModel):
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

# Função para geração de IDs únicos para cada trabalho
def generate_job_id() -> str:
    """Geração de um ID único para cada trabalho baseado no timestamp e um hash curto"""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Criação de um hash curto para garantir que seja único mesmo com múltiplos jobs no mesmo segundo
    hash_input = f"{timestamp}_{datetime.datetime.now().microsecond}" # Usando microsegundos
    short_hash = hashlib.md5(hash_input.encode()).hexdigest()[:8] # 8 caracteres para o hash MD5
    return f"job_{timestamp}_{short_hash}"

# Função que auxilia na criação do diretório do trabalho e retorna o caminho
def create_job_directory(job_id: str) -> Path:
    """Create a job directory and return its path"""
    job_path = jobs_dir / job_id # Pegamos o diretório base e adicionamos o ID do trabalho
    job_path.mkdir(exist_ok=True) # Verificamos se esse diretório já existe, se não existe, criamos
    return job_path

# Funções para salvar e carregar informações do trabalho em um arquivo JSON, passamos o diretório do trabalho e um dicionário com as informações
def save_job_info(job_dir: Path, job_info: dict):
    """Save job information to a JSON file"""
    info_file = job_dir / "job_info.json" # Pegamos a variavel do diretório e adicionamos o nomde do arquivo JSON
    with open(info_file, 'w') as f:
        json.dump(job_info, f, indent=2, default=str) # Salvamos o arquivo JSON com indentação para melhor leitura

# Função para carregar as informações do trabalho a partir do arquivo JSON, ele será um dicionario
def load_job_info(job_dir: Path) -> dict:
    """Load job information from JSON file"""
    info_file = job_dir / "job_info.json" # Pegamos o diretório do trabalho e adicionamos o nome do arquivo JSON
    
    # Verificamos se o arquivo existe, se existir, abrimos e carregamos o conteúdo JSON como um dicionário
    if info_file.exists():
        with open(info_file, 'r') as f:
            return json.load(f)
    return {}

#============== ENDPOINTS DA API ==============#


@app.get("/api/jobs")
async def list_jobs():
    """
    Endpoint para listar todos os trabalhos
    Criamos uma lista vazia para armazenar as informações dos trabalhos
    Iteramos sobre os diretórios dentro do diretório base de trabalhos
    Verificamos se o diretório começa com "job_" para garantir que é um trabalho
    Carregamos as informações do trabalho usando a função load_job_info
    Adicionamos as informações do trabalho à lista se forem carregadas com sucesso
    Retorna uma lista de trabalhos com suas informações básicas
    """
    jobs = []
    for job_dir in jobs_dir.iterdir():
        if job_dir.is_dir() and job_dir.name.startswith("job_"):
            try:
                job_info = load_job_info(job_dir)
                if job_info:
                    jobs.append(job_info)
            except Exception as e:
                logger.warning(f"Failed to load job info for {job_dir.name}: {e}")
    
    # Sort by timestamp (newest first)
    jobs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    return {"jobs": jobs}

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    """
    Endpoint para obter informações detalhadas de um trabalho especifico.
    Pegamos o diretório do trabalho com base no ID fornecido
    Passamos esse diretório para a função load_job_info para carregar as informações do trabalho
    """
    job_path = jobs_dir / job_id
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_info = load_job_info(job_path)
    if not job_info:
        raise HTTPException(status_code=404, detail="Job info not found")
    
    return job_info

@app.get("/api/jobs/{job_id}/file/{filename}")
async def get_job_file(job_id: str, filename: str):
    """
    Endpoint para obter arquivos específicos de resultados de um trabalho de predição.
    
    Por segurança, só permite acesso a arquivos específicos pré-definidos:
    - affinity_boltz_input.json: Resultados de afinidade proteína-ligante
    - confidence_boltz_input_model_0.json: Métricas de confiança da predição  
    - boltz_input.yaml: Arquivo de entrada usado na predição
    
    Busca o arquivo em múltiplas localizações possíveis pois o Boltz pode gerar
    arquivos em diferentes estruturas de diretórios.
    """
    job_path = jobs_dir / job_id
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    
    allowed_files = [
        "affinity_boltz_input.json", 
        "confidence_boltz_input_model_0.json",
        "boltz_input.yaml"
    ]
    if filename not in allowed_files:
        raise HTTPException(status_code=403, detail="File not allowed")
    
    # Possiveis localizações do arquivo
    possible_paths = [
        job_path / "boltz_output" / filename,
        job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / filename,
        job_path / filename
    ]

    # Passaremos por todas as possíveis localizações e verificamos se o arquivo existe
    file_path = None
    for path in possible_paths:
        if path.exists():
            file_path = path
            break
    
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

@app.post("/upload_msa")
async def upload_msa(file: UploadFile = File(...)):
    """
    Endpoint de envio de arquivos MSA (.a3m) e retorno do caminho do arquivo salvo.
    Criamos e verificamos se o diretório de uploads existe, se não existir, criamos.
    Geramos um nome de arquivo único baseado no timestamp junto ao filename original e juntamos ao diretório de uploads.
    Salvamos o arquivo enviado no caminho gerado.
    Retornamos o nome do arquivo único e o caminho completo onde o arquivo foi salvo.
    """
    if not file.filename.endswith('.a3m'):
        raise HTTPException(status_code=400, detail="Only .a3m files are allowed")
    
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    
    # Gerando um nome de arquivo único
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{timestamp}_{file.filename}"
    file_path = uploads_dir / unique_filename

    # Salvando o arquivo enviado
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return {"filename": unique_filename, "path": str(file_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

@app.post("/upload_template")
async def upload_template(file: UploadFile = File(...)):
    """
    Endpoint de envio de arquivos de template (.cif ou .pdb) e retorna o caminho do arquivo salvo.
    Criamos o diretório de uploads se ele não existir para armazenar os envios.
    Fazemos o processo de geração de um nome de arquivo único baseado no timestamp e no nome original do arquivo.
    Salvamos o arquivo enviado no caminho gerado.
    Retornamos o nome do arquivo único e o caminho completo onde o arquivo foi salvo.
    """
    if not (file.filename.endswith('.cif') or file.filename.endswith('.pdb')):
        raise HTTPException(status_code=400, detail="Only .cif and .pdb files are allowed")
    
    # Criando o diretório de uploads se não existir
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)

    # Gerando um nome de arquivo único
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{timestamp}_{file.filename}"
    file_path = uploads_dir / unique_filename

    # Salvando o arquivo enviado
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return {"filename": unique_filename, "path": str(file_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

@app.post("/predict", response_model=PredictionResponse)
async def predict_boltz(request: BoltzRequest):
    """
    Endpoint para iniciar a predição de afinidade usando o Boltz.
    Recebe uma requisição com a estrutura definida em BoltzRequest(classe criada na linha 91).
    Gera um ID único para o trabalho e cria um diretório para armazenar os arquivos do trabalho.
    Convertemos a sequencia de entrada em estrutura YAML esperado pelo Boltz.
    """
    # Gerando ID do trabalho e criando diretório
    job_id = generate_job_id()
    job_path = create_job_directory(job_id)
    timestamp = datetime.datetime.now().isoformat()
    
    try:
        # Vamos transformar a requisição em um dicionário no formato esperado pelo Boltz
        yaml_data = {
            "version": request.version, #P pegamos a versão da requisição
            "sequences": [] # Inicializamos a lista de sequências vazia
        }
        
        # Loop para adicionar cada entidade de sequência ao YAML
        for seq in request.sequences:
            # Dicionario base para a entidade
            seq_dict = {
                seq.entity_type: {
                    "id": seq.id
                }
            }
            
            # Adicionando ao seq_dict os campos opcionais se eles estiverem presentes
            if seq.sequence:
                seq_dict[seq.entity_type]["sequence"] = seq.sequence
            if seq.smiles:
                seq_dict[seq.entity_type]["smiles"] = seq.smiles
            if seq.ccd:
                seq_dict[seq.entity_type]["ccd"] = seq.ccd
            if seq.msa:
                seq_dict[seq.entity_type]["msa"] = seq.msa
            if seq.modifications:
                seq_dict[seq.entity_type]["modifications"] = [
                    {"position": mod.position, "ccd": mod.ccd} for mod in seq.modifications
                ]
            if seq.cyclic:
                seq_dict[seq.entity_type]["cyclic"] = seq.cyclic

            # Após montar o dicionário da sequência, adicionamos à lista de sequências no YAML
            yaml_data["sequences"].append(seq_dict)

        # Adicionando as restrições, se fornecidas
        if request.constraints:
            # Vamos criar no yaml_data o campo "constraints". De começo é uma lista vazia
            yaml_data["constraints"] = []

            # Loop para adicionar cada restrição ao YAML
            for constraint in request.constraints:
                # Dentro de cada restrição, verificamos qual tipo de restrição está presente e montamos o dicionário (constraint_dict) correspondente
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

        #============== PROCESSAMENTO DOS TEMPLATES (ESTRUTURAS DE REFERÊNCIA) ==============#
        """
        Os templates são arquivos de estruturas 3D já conhecidas (.cif ou .pdb) que servem como
        "moldes" ou "exemplos" para guiar o Boltz durante a predição.
        """
        if request.templates:
            yaml_data["templates"] = []  # Criamos uma lista vazia para guardar os templates
            
            # Vamos processar cada template enviado pelo usuário
            for template in request.templates:
                # Começamos com o arquivo da estrutura (obrigatório)
                template_dict = {"cif": template.cif}  # O arquivo da estrutura 3D
                
                # Adicionamos informações extras se o usuário forneceu:
                
                # chain_id: qual cadeia (parte) da proteína usar como referência
                # Ex: se uma proteína tem várias partes (A, B, C), usar apenas a parte A
                if template.chain_id:
                    template_dict["chain_id"] = template.chain_id
                
                # template_id: nome/código específico para identificar este template
                # Ex: "1ABC", "minha_estrutura_favorita"
                if template.template_id:
                    template_dict["template_id"] = template.template_id
                
                # Adicionamos este template à nossa lista
                yaml_data["templates"].append(template_dict)

        #============== PROCESSAMENTO DAS PROPRIEDADES (O QUE QUEREMOS CALCULAR) ==============#
        """
        As propriedades definem QUE TIPO DE CÁLCULO queremos que o Boltz faça.
        Por enquanto, só temos um tipo: calcular a afinidade (quão forte é a ligação
        entre uma proteína e um ligante).
        """
        if request.properties:
            yaml_data["properties"] = []  # Lista vazia para guardar as propriedades
            
            # Processamos cada propriedade solicitada
            for prop in request.properties:
                prop_dict = {}  # Dicionário vazio para esta propriedade específica
                
                # Se o usuário quer calcular afinidade (força da ligação)
                if prop.affinity:
                    # Especificamos qual molécula é o "ligante" (geralmente a menor molécula)
                    prop_dict["affinity"] = {"binder": prop.affinity.binder}
                
                # Só adicionamos à lista se realmente há algo para calcular
                if prop_dict:  # Se não está vazio
                    yaml_data["properties"].append(prop_dict)

        #============== SALVANDO O ARQUIVO DE CONFIGURAÇÃO ==============#
        """
        Agora vamos salvar todas essas informações em um arquivo YAML.
        O YAML é como uma "receita" que o Boltz vai ler para saber exatamente
        o que fazer com suas proteínas e ligantes.
        """
        yaml_file = job_path / "boltz_input.yaml"  # Nome do arquivo de configuração

        #============== FORMATAÇÃO PERSONALIZADA DO ARQUIVO ==============#
        """
        Criamos uma classe especial para deixar o arquivo YAML mais bonito e organizado.
        É como ter um formatador de texto que deixa o documento bem arrumado.
        """
        class CustomDumper(yaml.SafeDumper):
            """
            Esta é nossa classe personalizada para escrever o arquivo YAML.
            Ela herda todas as funcionalidades básicas do YAML, mas permite
            que façamos algumas personalizações na aparência final.
            """
            def write_line_break(self, data=None):
                """
                Controla como as quebras de linha são feitas no arquivo.
                Por enquanto, mantemos o comportamento padrão.
                """
                super().write_line_break(data)

        def represent_list(dumper, data):
            """
            Esta função decide como as listas devem aparecer no arquivo YAML.
            
            Algumas listas ficam melhor "espalhadas" (uma linha por item):
            - item1
            - item2
            - item3
            
            Outras ficam melhor "compactas" (tudo numa linha):
            [item1, item2, item3]
            
            A regra é simples:
            - Se é uma lista de coordenadas/contatos: formato compacto
            - Outras listas: formato espalhado (mais fácil de ler)
            """
            # Verificamos se é uma lista de listas com pelo menos 2 elementos
            # (isso geralmente indica coordenadas ou contatos)
            if (isinstance(data, list) and len(data) > 0 and 
                isinstance(data[0], list) and len(data[0]) >= 2):
                
                # Formato compacto: [[A, 10, CA], [B, 20, CB]]
                return dumper.represent_sequence('tag:yaml.org,2002:seq', data, flow_style=True)
            
            # Formato espalhado para outras listas:
            # - item1
            # - item2
            return dumper.represent_sequence('tag:yaml.org,2002:seq', data, flow_style=False)

        # Registramos nossa função personalizada para formatar listas
        CustomDumper.add_representer(list, represent_list)

        # Finalmente, salvamos o arquivo YAML com nossa formatação personalizada
        with open(yaml_file, 'w') as f:
            yaml.dump(yaml_data, f, Dumper=CustomDumper, default_flow_style=False)

        #============== CRIAÇÃO DO DIRETÓRIO DE RESULTADOS ==============#
        """
        Criamos uma pasta específica onde o Boltz vai salvar todos os resultados:
        - Estruturas 3D geradas
        - Valores de afinidade calculados
        - Relatórios de confiança
        - Logs de execução

        É como preparar uma gaveta vazia e bem organizada antes de começar um projeto.
        """
        # Create output directory for Boltz results
        output_dir = job_path / "boltz_output"
        output_dir.mkdir(exist_ok=True)
        
        # Extract summary info for job tracking
        entities_summary = []
        for seq in request.sequences:
            entity_info = {
                "type": seq.entity_type,
                "id": seq.id if isinstance(seq.id, str) else seq.id[0],
            }
            if seq.sequence:
                entity_info["sequence_length"] = len(seq.sequence)
            if seq.smiles:
                entity_info["smiles"] = seq.smiles
            if seq.ccd:
                entity_info["ccd"] = seq.ccd
            entities_summary.append(entity_info)
        
        # Save initial job info
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
        
        # Add job name if provided
        if request.job_name:
            job_info["job_name"] = request.job_name
        save_job_info(job_path, job_info)
        
        # Run the Boltz prediction command with output directory
        # Since we're running from the job directory, use relative paths
        cmd = ["boltz", "predict", "boltz_input.yaml", "--out_dir", "boltz_output"]
        
        # Check if any sequence has MSA files - if so, don't use MSA server
        has_msa_files = any(seq.msa and seq.msa.strip() and seq.msa != "empty" for seq in request.sequences)
        if not has_msa_files:
            cmd.append("--use_msa_server")
        
        cmd.extend(["--output_format", "pdb"])

        job_info["command"] = " ".join(cmd)
        logger.info(f"Running command for job {job_id}: {' '.join(cmd)}")
        
        # Update job info with command
        save_job_info(job_path, job_info)
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minutes timeout
            cwd=str(job_path)  # Run command from job directory
        )
        
        # Generate YAML content for display
        yaml_content = yaml.dump(yaml_data, default_flow_style=False)
        
        # Update job status based on result
        if result.returncode == 0:
            job_info["status"] = "completed"
            job_info["completion_time"] = datetime.datetime.now().isoformat()
            job_info["stdout"] = result.stdout
            job_info["stderr"] = result.stderr
            save_job_info(job_path, job_info)
            
            return PredictionResponse(
                success=True,
                message=f"Prediction completed successfully! Job ID: {job_id}",
                output=result.stdout,
                yaml_content=yaml_content,
                job_id=job_id,
                job_dir=str(job_path),
                timestamp=timestamp
            )
        else:
            job_info["status"] = "failed"
            job_info["completion_time"] = datetime.datetime.now().isoformat()
            job_info["stdout"] = result.stdout
            job_info["stderr"] = result.stderr
            job_info["return_code"] = result.returncode
            save_job_info(job_path, job_info)
            
            return PredictionResponse(
                success=False,
                message=f"Prediction failed with return code {result.returncode}. Job ID: {job_id}",
                output=f"STDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}",
                yaml_content=yaml_content,
                job_id=job_id,
                job_dir=str(job_path),
                timestamp=timestamp
            )
                
    except subprocess.TimeoutExpired:
        job_info["status"] = "timeout"
        job_info["completion_time"] = datetime.datetime.now().isoformat()
        job_info["error"] = "Prediction timed out after 10 minutes"
        save_job_info(job_path, job_info)
        
        return PredictionResponse(
            success=False,
            message=f"Prediction timed out after 10 minutes. Job ID: {job_id}",
            output="The prediction process took too long and was terminated.",
            job_id=job_id,
            job_dir=str(job_path),
            timestamp=timestamp
        )
    except Exception as e:
        logger.error(f"Error during prediction for job {job_id}: {str(e)}")
        
        job_info["status"] = "error"
        job_info["completion_time"] = datetime.datetime.now().isoformat()
        job_info["error"] = str(e)
        save_job_info(job_path, job_info)
        
        return PredictionResponse(
            success=False,
            message=f"An error occurred: {str(e)}. Job ID: {job_id}",
            output="",
            job_id=job_id,
            job_dir=str(job_path),
            timestamp=timestamp
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/api/jobs/{job_id}/results")
async def get_job_results(job_id: str):
    """Get formatted prediction results for a job"""
    job_path = jobs_dir / job_id
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Load job info first
    job_info = load_job_info(job_path)
    if not job_info:
        raise HTTPException(status_code=404, detail="Job info not found")
    
    results = {
        "job_info": job_info,
        "affinity_results": None,
        "confidence_results": None
    }
    
    # Look for affinity results
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
                logger.warning(f"Failed to load affinity results from {path}: {e}")
    
    # Look for confidence results
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
                logger.warning(f"Failed to load confidence results from {path}: {e}")
    
    return results

def format_affinity_results(data):
    """Format affinity results for display"""
    if not data or not isinstance(data, dict):
        return None
    
    formatted = {
        "summary": {},
        "detailed": data
    }
    
    # Extract key metrics if available
    if "affinity" in data:
        formatted["summary"]["binding_affinity"] = data["affinity"]
    
    if "affinity_confidence" in data:
        formatted["summary"]["confidence"] = data["affinity_confidence"]
        
    if "units" in data:
        formatted["summary"]["units"] = data["units"]
    
    return formatted

def format_confidence_results(data):
    """Format confidence results for display"""
    if not data or not isinstance(data, dict):
        return None
    
    formatted = {
        "summary": {},
        "detailed": data
    }
    
    # Extract key confidence metrics
    if "confidence" in data:
        conf_data = data["confidence"]
        if isinstance(conf_data, dict):
            # Get overall confidence if available
            if "overall" in conf_data:
                formatted["summary"]["overall_confidence"] = conf_data["overall"]
            
            # Get per-residue confidence statistics
            if "per_residue" in conf_data:
                per_res = conf_data["per_residue"]
                if isinstance(per_res, list) and per_res:
                    formatted["summary"]["mean_confidence"] = sum(per_res) / len(per_res)
                    formatted["summary"]["min_confidence"] = min(per_res)
                    formatted["summary"]["max_confidence"] = max(per_res)
        else:
            formatted["summary"]["confidence_score"] = conf_data
    
    return formatted

@app.get("/api/jobs/{job_id}/pdb")
async def get_job_pdb(job_id: str):
    """Get the PDB file for a specific job"""
    job_path = jobs_dir / job_id
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Look for PDB files in multiple possible locations
    possible_paths = [
        job_path / "boltz_output" / "boltz_input.pdb",
        job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / "boltz_input.pdb",
        job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / "boltz_input_model_0.pdb",
        job_path / "boltz_output" / "boltz_input_model_0.pdb"
    ]
    # Also check for any .pdb files in the output directory
    output_dir = job_path / "boltz_output"
    if output_dir.exists():
        for pdb_file in output_dir.rglob("*.pdb"):
            possible_paths.append(pdb_file)
    
    pdb_file_path = None
    for path in possible_paths:
        if path.exists():
            pdb_file_path = path
            break
    
    if not pdb_file_path:
        raise HTTPException(status_code=404, detail="PDB file not found")
    
    return FileResponse(
        pdb_file_path, 
        media_type="chemical/x-pdb",
        filename=f"{job_id}.pdb"
    )

@app.get("/api/jobs/{job_id}/download")
async def download_job_archive(job_id: str):
    """Download a ZIP archive containing all job files"""
    job_path = jobs_dir / job_id
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Load job info
    job_info = load_job_info(job_path)
    if not job_info:
        raise HTTPException(status_code=404, detail="Job info not found")
    
    # Create ZIP file in memory
    zip_buffer = io.BytesIO()
    
    try:
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add job info as JSON
            job_info_json = json.dumps(job_info, indent=2, default=str)
            zip_file.writestr(f"{job_id}_info.json", job_info_json)
            
            # Add YAML input file
            yaml_file = job_path / "boltz_input.yaml"
            if yaml_file.exists():
                zip_file.write(yaml_file, f"{job_id}_input.yaml")
            
            # Add PDB file if available
            pdb_paths = [
                job_path / "boltz_output" / "boltz_input.pdb",
                job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / "boltz_input.pdb",
                job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / "boltz_input_model_0.pdb",
                job_path / "boltz_output" / "boltz_input_model_0.pdb"
            ]
            
            # Also check for any .pdb files in the output directory
            output_dir = job_path / "boltz_output"
            if output_dir.exists():
                for pdb_file in output_dir.rglob("*.pdb"):
                    pdb_paths.append(pdb_file)
            
            pdb_added = False
            for pdb_path in pdb_paths:
                if pdb_path.exists() and not pdb_added:
                    zip_file.write(pdb_path, f"{job_id}_structure.pdb")
                    pdb_added = True
                    break
            
            # Add results files
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
            
            # Add formatted results
            try:
                response = await get_job_results(job_id)
                formatted_results = json.dumps(response, indent=2, default=str)
                zip_file.writestr(f"{job_id}_formatted_results.json", formatted_results)
            except:
                pass  # Skip if formatted results not available
            
            # Add any other important files from the output directory
            if output_dir.exists():
                for file_path in output_dir.rglob("*.log"):
                    if file_path.is_file():
                        relative_path = file_path.relative_to(job_path)
                        zip_file.write(file_path, f"{job_id}_{relative_path.name}")
        
        zip_buffer.seek(0)
        
        # Return the ZIP file
        job_name = job_info.get('job_name', job_id)
        filename = f"{job_name}_complete.zip" if job_info.get('job_name') else f"{job_id}_complete.zip"
        
        # Create a temporary file for the ZIP
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
        logger.error(f"Failed to create ZIP archive for job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create download archive: {str(e)}")
