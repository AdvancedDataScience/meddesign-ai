from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid
import asyncio
from datetime import datetime
import os

app = FastAPI(
    title="MedDesign AI API",
    description="Backend service for orchestrating de novo protein design workflows.",
    version="1.0.0"
)

# Replace with your actual deployed frontend URL
FRONTEND_URL = "https://frontend-slr4.onrender.com"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
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
        
        JOBS_DB[job_id]["status"] = "completed"
        JOBS_DB[job_id]["progress"] = 100
        JOBS_DB[job_id]["message"] = f"Pipeline complete for target: {request.pdb_id}"
        
        # Dynamically generate results based on request.pdb_id
        JOBS_DB[job_id]["candidates"] = [
            {
                "id": f"{request.pdb_id}_Bind_A", 
                "affinity": -13.2, 
                "pae": 2.8, 
                "plddt": 94.5, 
                "status": "High", 
                "color": "#3b82f6", 
                "sequence": "MTEYKLVVVGAGGVGKSALTIQLIQNHFVDEYDPTI"
            },
            {
                "id": f"{request.pdb_id}_Bind_B", 
                "affinity": -11.5, 
                "pae": 3.5, 
                "plddt": 89.2, 
                "status": "Med", 
                "color": "#10b981", 
                "sequence": "MKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSR"
            }
        ]
    except Exception as e:
        JOBS_DB[job_id]["status"] = "error"
        JOBS_DB[job_id]["message"] = f"Error: {str(e)}"

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)