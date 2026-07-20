from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid
import asyncio
from datetime import datetime

# Initialize the FastAPI application
app = FastAPI(
    title="MedDesign AI API",
    description="Backend service for orchestrating de novo protein design workflows.",
    version="1.0.0"
)

# Configure CORS for your specific frontend URL
# NOTE: Ensure this matches your live frontend URL exactly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://frontend-slr4.onrender.com"],
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
        JOBS_DB[job_id]["candidates"] = [
            {"id": "Design_042", "affinity": -13.2, "pae": 2.8, "plddt": 94.5, "status": "High", "color": "#3b82f6", "sequence": "MTEYKLVVVGAGGVGKSALTIQLIQNHFVDEYDPTI"}
        ]
    except Exception as e:
        JOBS_DB[job_id]["status"] = "error"

@app.post("/api/v1/design/submit")
async def submit_design_job(request: DesignRequest, background_tasks: BackgroundTasks):
    print(f"DEBUG: Received request: {request}")
    job_id = f"PRJ-{uuid.uuid4().hex[:6].upper()}"
    JOBS_DB[job_id] = {
        "job_id": job_id, "status": "idle", "progress": 0, "message": "Queued"
    }
    background_tasks.add_task(execute_protein_design_pipeline, job_id, request)
    return JOBS_DB[job_id]

@app.get("/api/v1/design/status/{job_id}")
async def get_job_status(job_id: str):
    if job_id not in JOBS_DB:
        raise HTTPException(status_code=404, detail="Job not found")
    return JOBS_DB[job_id]

@app.get("/")
async def root():
    return {"message": "MedDesign AI API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
