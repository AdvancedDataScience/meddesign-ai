import React, { useState, useEffect, useRef } from 'react';
import { 
  Dna, 
  Settings, 
  Activity, 
  Play, 
  UploadCloud, 
  Box, 
  Layers, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Menu,
  Download,
  Trophy,
  Calendar,
  ArrowRight,
  XCircle,
  Search,
  MoreVertical,
  FileText,
  Puzzle,
  Plus
} from 'lucide-react';
import * as THREE from 'three';

// HARDCODED production backend URL to completely bypass local environment issues
const API_BASE_URL = 'https://meddesign-backend.onrender.com';

const MolecularViewer = ({ status, selectedCandidate }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 60;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    const generateProteinChain = (numResidues, startPos, color, atomRadius) => {
      const group = new THREE.Group();
      const material = new THREE.MeshPhongMaterial({ color: color, shininess: 100 });
      const geometry = new THREE.SphereGeometry(atomRadius, 16, 16);
      let currentPos = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
      
      for (let i = 0; i < numResidues; i++) {
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(currentPos);
        group.add(sphere);

        const step = new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3
        ).normalize().multiplyScalar(2.5);
        currentPos.add(step);
      }
      
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      group.position.sub(center);
      return group;
    };

    const targetProtein = generateProteinChain(120, {x:0, y:0, z:0}, '#94a3b8', 1.2);
    scene.add(targetProtein);

    let binderProtein = null;
    if (status === 'completed' && selectedCandidate) {
      const color = selectedCandidate.color || '#3b82f6';
      binderProtein = generateProteinChain(45, {x: 10, y: 5, z: 10}, color, 1.0);
      binderProtein.position.set(12, 5, 8);
      scene.add(binderProtein);
    }

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = () => { isDragging = true; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e) => {
      if (isDragging) {
        const deltaMove = {
          x: e.offsetX - previousMousePosition.x,
          y: e.offsetY - previousMousePosition.y
        };
        const rotationSpeed = 0.005;
        scene.rotation.y += deltaMove.x * rotationSpeed;
        scene.rotation.x += deltaMove.y * rotationSpeed;
      }
      previousMousePosition = { x: e.offsetX, y: e.offsetY };
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isDragging) {
        scene.rotation.y += 0.002;
        scene.rotation.x += 0.001;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, [status, selectedCandidate]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute bottom-4 left-4 flex gap-2">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-slate-600 border border-slate-200">
          <div className="w-3 h-3 rounded-full bg-slate-400"></div>
          Target (Tumor Marker)
        </div>
        {status === 'completed' && selectedCandidate && (
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-slate-600 border border-slate-200">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCandidate.color || '#3b82f6' }}></div>
            Candidate: {selectedCandidate.id}
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('new_design');
  const [pdbId, setPdbId] = useState('1TUP');
  const [targetChain, setTargetChain] = useState('A');
  const [hotspot, setHotspot] = useState('248, 273');
  const [binderLength, setBinderLength] = useState(50);
  
  const [jobStatus, setJobStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const handleGenerate = async () => {
    setJobStatus('provisioning');
    setProgress(5);
    setCandidates([]);
    setSelectedCandidate(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/design/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdb_id: pdbId,
          target_chain: targetChain,
          hotspot: hotspot,
          binder_length: parseInt(binderLength)
        })
      });

      if (!response.ok) throw new Error("Failed to submit job to backend");
      
      const data = await response.json();
      pollStatus(data.job_id);
      
    } catch (error) {
      console.error("API Error:", error);
      setJobStatus('error');
    }
  };

  const pollStatus = async (jobId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/design/status/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job status");
      const data = await res.json();

      setJobStatus(data.status); 
      setProgress(data.progress);

      if (data.status === 'completed') {
        setCandidates(data.candidates || []);
        if (data.candidates && data.candidates.length > 0) {
          setSelectedCandidate(data.candidates[0]);
        }
      } else if (data.status === 'error') {
        setJobStatus('error');
      } else {
        setTimeout(() => pollStatus(jobId), 1000);
      }
    } catch (error) {
      console.error("Polling Error:", error);
      setJobStatus('error');
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex shrink-0">
        <div className="p-6 flex items-center gap-3 text-white font-semibold text-lg border-b border-slate-800">
          <Dna className="text-blue-500" />
          MedDesign AI
        </div>
        <nav className="flex-1 py-6 space-y-1">
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('new_design'); }} className={`flex items-center gap-3 px-6 py-3 transition-colors ${activeTab === 'new_design' ? 'bg-blue-600/10 text-blue-400 border-r-2 border-blue-500' : 'hover:bg-slate-800 text-slate-300'}`}>
            <Activity size={20} /> New Design
          </a>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold text-slate-800">De Novo Binder Design</h1>
        </header>

        {activeTab === 'new_design' && (
          <div className="flex-1 p-8 flex flex-col lg:flex-row gap-8 overflow-y-auto">
            <div className="w-full lg:w-[400px] flex flex-col gap-6 shrink-0">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <UploadCloud size={20} className="text-blue-500"/> Target Specification
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target PDB ID</label>
                    <input type="text" value={pdbId} onChange={(e) => setPdbId(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg uppercase" />
                  </div>
                </div>
              </div>

              {jobStatus === 'error' ? (
                <div className="bg-red-50 p-5 rounded-2xl border border-red-200 text-red-700">
                  <h3 className="font-semibold flex items-center gap-2 mb-2"><XCircle size={18} /> Connection Failed</h3>
                  <p className="text-sm mb-4">Could not reach backend API.</p>
                  <button onClick={() => setJobStatus('idle')} className="w-full bg-white border py-2 rounded-xl">Reset Pipeline</button>
                </div>
              ) : jobStatus === 'idle' || jobStatus === 'completed' ? (
                <button onClick={handleGenerate} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                  <Play size={20} /> {jobStatus === 'completed' ? 'Design New Binder' : 'Start AI Design Pipeline'}
                </button>
              ) : (
                <div className="bg-slate-50 p-6 rounded-2xl border border-blue-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-blue-500"/> Pipeline Running...
                  </h3>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-6 min-h-0">
               <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 p-2 min-h-[300px]">
                 <div className="flex-1 relative">
                    <MolecularViewer status={jobStatus} selectedCandidate={selectedCandidate} />
                 </div>
               </div>

               {jobStatus === 'completed' && candidates.length > 0 && (
                  <div className="h-64 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 shrink-0 flex flex-col">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Trophy size={18} className="text-amber-500" /> Top Candidate Binders
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {candidates.map((cand) => (
                        <div key={cand.id} onClick={() => setSelectedCandidate(cand)} className={`min-w-[260px] p-4 rounded-xl border-2 cursor-pointer ${selectedCandidate?.id === cand.id ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200'}`}>
                          <div className="font-bold text-slate-700 mb-2">{cand.id}</div>
                          <div className="text-sm">Affinity: {cand.affinity} | pLDDT: {cand.plddt}</div>
                        </div>
                      ))}
                    </div>
                  </div>
               )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}