from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid
import asyncio
from datetime import datetime

app = FastAPI(
    title="MedDesign AI API",
    description="Backend service for orchestrating de novo protein design workflows.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DesignRequest(BaseModel):
    pdb_id: str
    target_chain: str
    hotspot: str
    binder_length: int

class Candidate(BaseModel):
    id: str
    affinity: float
    pae: float
    plddt: float
    status: str
    color: str
    sequence: str

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    message: str
    candidates: Optional[List[Candidate]] = None

JOBS_DB = {}

async def execute_protein_design_pipeline(job_id: str, request: DesignRequest):
    try:
        JOBS_DB[job_id]["status"] = "provisioning"
        JOBS_DB[job_id]["progress"] = 5
        await asyncio.sleep(2)
        
        JOBS_DB[job_id]["status"] = "rfdiffusion"
        JOBS_DB[job_id]["progress"] = 25
        await asyncio.sleep(3)
        
        JOBS_DB[job_id]["status"] = "mpnn"
        JOBS_DB[job_id]["progress"] = 60
        await asyncio.sleep(3)
        
        JOBS_DB[job_id]["status"] = "alphafold"
        JOBS_DB[job_id]["progress"] = 85
        await asyncio.sleep(3)
        
        JOBS_DB[job_id]["status"] = "completed"
        JOBS_DB[job_id]["progress"] = 100
        JOBS_DB[job_id]["candidates"] = [
            {"id": "Design_042", "affinity": -13.2, "pae": 2.8, "plddt": 94.5, "status": "High", "color": "#3b82f6", "sequence": "MTEYKLVVVGAGGVGKSALTIQLIQNHFVDEYDPTI"},
            {"id": "Design_017", "affinity": -11.5, "pae": 3.5, "plddt": 89.2, "status": "Med", "color": "#10b981", "sequence": "MKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSR"}
        ]
    except Exception as e:
        JOBS_DB[job_id]["status"] = "error"

@app.post("/api/v1/design/submit", response_model=JobStatusResponse)
async def submit_design_job(request: DesignRequest, background_tasks: BackgroundTasks):
    job_id = f"PRJ-{uuid.uuid4().hex[:6].upper()}"
    JOBS_DB[job_id] = {
        "job_id": job_id, "status": "idle", "progress": 0, "message": "Queued"
    }
    background_tasks.add_task(execute_protein_design_pipeline, job_id, request)
    return JOBS_DB[job_id]

@app.get("/api/v1/design/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    if job_id not in JOBS_DB:
        raise HTTPException(status_code=404, detail="Job not found")
    return JOBS_DB[job_id]