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
from typing import List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Boltz Affinity Prediction", description="Web interface for Boltz protein-ligand affinity prediction")

# Add CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:6868"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories if they don't exist
jobs_dir = Path("jobs")
jobs_dir.mkdir(exist_ok=True)

from typing import List, Optional, Union, Dict, Any

class Modification(BaseModel):
    position: int
    ccd: str

class SequenceEntity(BaseModel):
    entity_type: str  # protein, dna, rna, ligand
    id: Union[str, List[str]]
    sequence: Optional[str] = None  # for protein, dna, rna
    smiles: Optional[str] = None   # for ligand
    ccd: Optional[str] = None      # for ligand
    msa: Optional[str] = None      # for protein
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

def generate_job_id() -> str:
    """Generate a unique job ID based on timestamp and hash"""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    # Create a short hash for uniqueness
    hash_input = f"{timestamp}_{datetime.datetime.now().microsecond}"
    short_hash = hashlib.md5(hash_input.encode()).hexdigest()[:8]
    return f"job_{timestamp}_{short_hash}"

def create_job_directory(job_id: str) -> Path:
    """Create a job directory and return its path"""
    job_path = jobs_dir / job_id
    job_path.mkdir(exist_ok=True)
    return job_path

def save_job_info(job_dir: Path, job_info: dict):
    """Save job information to a JSON file"""
    info_file = job_dir / "job_info.json"
    with open(info_file, 'w') as f:
        json.dump(job_info, f, indent=2, default=str)

def load_job_info(job_dir: Path) -> dict:
    """Load job information from JSON file"""
    info_file = job_dir / "job_info.json"
    if info_file.exists():
        with open(info_file, 'r') as f:
            return json.load(f)
    return {}

# React frontend serves the main page

@app.get("/api/jobs")
async def list_jobs():
    """List all prediction jobs"""
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
    """Get details of a specific job"""
    job_path = jobs_dir / job_id
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_info = load_job_info(job_path)
    if not job_info:
        raise HTTPException(status_code=404, detail="Job info not found")
    
    return job_info

@app.get("/api/jobs/{job_id}/file/{filename}")
async def get_job_file(job_id: str, filename: str):
    """Get a specific file from a job directory"""
    job_path = jobs_dir / job_id
    if not job_path.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Allow specific result files for security
    allowed_files = [
        "affinity_boltz_input.json", 
        "confidence_boltz_input_model_0.json",
        "boltz_input.yaml"
    ]
    if filename not in allowed_files:
        raise HTTPException(status_code=403, detail="File not allowed")
    
    # Look for the file in multiple possible locations
    possible_paths = [
        job_path / "boltz_output" / filename,
        job_path / "boltz_output" / "boltz_results_boltz_input" / "predictions" / "boltz_input" / filename,
        job_path / filename
    ]
    
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
    """Upload an MSA file and return the path"""
    if not file.filename.endswith('.a3m'):
        raise HTTPException(status_code=400, detail="Only .a3m files are allowed")
    
    # Create a temporary uploads directory if it doesn't exist
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    
    # Generate a unique filename
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{timestamp}_{file.filename}"
    file_path = uploads_dir / unique_filename
    
    # Save the uploaded file
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return {"filename": unique_filename, "path": str(file_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

@app.post("/upload_template")
async def upload_template(file: UploadFile = File(...)):
    """Upload a template CIF file and return the path"""
    if not (file.filename.endswith('.cif') or file.filename.endswith('.pdb')):
        raise HTTPException(status_code=400, detail="Only .cif and .pdb files are allowed")
    
    # Create a temporary uploads directory if it doesn't exist
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    
    # Generate a unique filename
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{timestamp}_{file.filename}"
    file_path = uploads_dir / unique_filename
    
    # Save the uploaded file
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return {"filename": unique_filename, "path": str(file_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

@app.post("/predict", response_model=PredictionResponse)
async def predict_boltz(request: BoltzRequest):
    """Generate Boltz YAML and run prediction with proper job management"""
    # Generate job ID and create directory
    job_id = generate_job_id()
    job_path = create_job_directory(job_id)
    timestamp = datetime.datetime.now().isoformat()
    
    try:
        # Convert request to YAML structure
        yaml_data = {
            "version": request.version,
            "sequences": []
        }
        
        # Process sequences
        for seq in request.sequences:
            seq_dict = {
                seq.entity_type: {
                    "id": seq.id
                }
            }
            
            # Add sequence-specific fields
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
                
            yaml_data["sequences"].append(seq_dict)
        
        # Add constraints if provided
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
        
        # Add templates if provided
        if request.templates:
            yaml_data["templates"] = []
            for template in request.templates:
                template_dict = {"cif": template.cif}
                if template.chain_id:
                    template_dict["chain_id"] = template.chain_id
                if template.template_id:
                    template_dict["template_id"] = template.template_id
                yaml_data["templates"].append(template_dict)
        
        # Add properties if provided
        if request.properties:
            yaml_data["properties"] = []
            for prop in request.properties:
                prop_dict = {}
                if prop.affinity:
                    prop_dict["affinity"] = {"binder": prop.affinity.binder}
                if prop_dict:
                    yaml_data["properties"].append(prop_dict)
        
        # Save YAML file in job directory
        yaml_file = job_path / "boltz_input.yaml"
        with open(yaml_file, 'w') as f:
            yaml.dump(yaml_data, f, default_flow_style=False)
        
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
