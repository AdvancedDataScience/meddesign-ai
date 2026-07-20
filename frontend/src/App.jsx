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

// This component simulates a 3D protein viewer using Three.js
const MolecularViewer = ({ status, selectedCandidate }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Setup Scene, Camera, and Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc'); // Slate-50 background

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 60;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    // Clear previous canvas if re-rendered
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // 3. Helpers to generate simulated protein structures (Random Walk)
    const generateProteinChain = (numResidues, startPos, color, atomRadius) => {
      const group = new THREE.Group();
      const material = new THREE.MeshPhongMaterial({ 
        color: color,
        shininess: 100,
      });
      const geometry = new THREE.SphereGeometry(atomRadius, 16, 16);

      let currentPos = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
      
      for (let i = 0; i < numResidues; i++) {
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(currentPos);
        group.add(sphere);

        // Random walk for next amino acid
        const step = new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3
        ).normalize().multiplyScalar(2.5);
        currentPos.add(step);
      }
      
      // Center the group
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      group.position.sub(center);
      
      return group;
    };

    // 4. Create the Target Protein (Tumor Marker)
    const targetProtein = generateProteinChain(120, {x:0, y:0, z:0}, '#94a3b8', 1.2); // Slate-400
    scene.add(targetProtein);

    // 5. Create the Designed Binder (only show if completed)
    let binderProtein = null;
    if (status === 'completed' && selectedCandidate) {
      // Position it to look like it's binding to the target
      const color = selectedCandidate.color || '#3b82f6';
      binderProtein = generateProteinChain(45, {x: 10, y: 5, z: 10}, color, 1.0);
      binderProtein.position.set(12, 5, 8); // Offset to interact
      scene.add(binderProtein);
    }

    // 6. Interaction (Simple Mouse Rotation)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e) => { isDragging = true; };
    const onMouseUp = (e) => { isDragging = false; };
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

    // 7. Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Gentle auto-rotation if not dragging
      if (!isDragging) {
        scene.rotation.y += 0.002;
        scene.rotation.x += 0.001;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // 8. Handle Resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, [status, selectedCandidate]); // Re-run effect when status changes to show binder

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      
      {/* Overlay UI for Viewer */}
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
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm text-xs text-slate-500 border border-slate-200">
        Click and drag to rotate
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
  
  // Pipeline state: 'idle' | 'provisioning' | 'rfdiffusion' | 'mpnn' | 'alphafold' | 'completed' | 'error'
  const [jobStatus, setJobStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [currentJobId, setCurrentJobId] = useState(null);
  
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const mockHistory = [
    { id: 'PRJ-1042', target: '1TUP (Chain A)', date: '2026-07-18', status: 'Completed', candidates: 124, bestAffinity: -13.2 },
    { id: 'PRJ-1041', target: '6VXX (Chain B)', date: '2026-07-15', status: 'Completed', candidates: 89, bestAffinity: -11.8 },
    { id: 'PRJ-1040', target: '3CLO (Chain A)', date: '2026-07-10', status: 'Failed', candidates: 0, bestAffinity: null },
    { id: 'PRJ-1039', target: '7BYR (Chain C)', date: '2026-07-02', status: 'Completed', candidates: 450, bestAffinity: -14.5 },
    { id: 'PRJ-1038', target: '1BRS (Chain D)', date: '2026-06-28', status: 'Completed', candidates: 32, bestAffinity: -9.4 },
  ];

  const mockAssets = [
    { id: 'AST-001', name: '1TUP_cleaned.pdb', type: 'Target', size: '2.4 MB', date: '2026-07-19', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100' },
    { id: 'AST-002', name: 'Helical_Scaffold_v3', type: 'Scaffold', size: '156 KB', date: '2026-07-10', icon: Layers, color: 'text-purple-500', bg: 'bg-purple-100' },
    { id: 'AST-003', name: 'Binder_Design_042', type: 'Generated Binder', size: '42 KB', date: '2026-07-18', icon: Box, color: 'text-emerald-500', bg: 'bg-emerald-100' },
    { id: 'AST-004', name: '7BYR_ChainC_prep', type: 'Target', size: '3.1 MB', date: '2026-07-02', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100' },
    { id: 'AST-005', name: 'BetaSheet_Motif_A', type: 'Motif', size: '89 KB', date: '2026-06-15', icon: Puzzle, color: 'text-amber-500', bg: 'bg-amber-100' },
    { id: 'AST-006', name: 'Binder_Design_017', type: 'Generated Binder', size: '45 KB', date: '2026-07-18', icon: Box, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  ];

  // Real API Execution replacing the simulation
  const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) 
  ? import.meta.env.VITE_API_URL 
  : 'https://meddesign-backend.onrender.com';
  const handleGenerate = async () => {
    setJobStatus('provisioning');
    setProgress(5);
    setCandidates([]);
    setSelectedCandidate(null);

    try {
      const response = await fetch('http://localhost:8000/api/v1/design/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdb_id: pdbId,
          target_chain: targetChain,
          hotspot: hotspot,
          binder_length: parseInt(binderLength)
        })
      });

      if (!response.ok) throw new Error("Failed to submit job");
      
      const data = await response.json();
      setCurrentJobId(data.job_id);
      
      // Begin polling the status endpoint
      pollStatus(data.job_id);
      
    } catch (error) {
      console.error("API Error (Is the backend running?):", error);
      setJobStatus('error');
    }
  };

  // Recursive polling function
  const pollStatus = async (jobId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/design/status/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();

      setJobStatus(data.status); 
      setProgress(data.progress);

      if (data.status === 'completed') {
        setCandidates(data.candidates || []);
        if (data.candidates && data.candidates.length > 0) {
          setSelectedCandidate(data.candidates[0]);
        }
        setCurrentJobId(null); // Stop polling
      } else if (data.status === 'error') {
        setCurrentJobId(null); // Stop polling
      } else {
        // Wait 1 second and check again
        setTimeout(() => pollStatus(jobId), 1000);
      }
    } catch (error) {
      console.error("Polling Error:", error);
      setJobStatus('error');
      setCurrentJobId(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex shrink-0">
        <div className="p-6 flex items-center gap-3 text-white font-semibold text-lg border-b border-slate-800">
          <Dna className="text-blue-500" />
          MedDesign AI
        </div>
        
        <nav className="flex-1 py-6 space-y-1">
          {}
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setActiveTab('new_design'); }}
            className={`flex items-center gap-3 px-6 py-3 transition-colors ${activeTab === 'new_design' ? 'bg-blue-600/10 text-blue-400 border-r-2 border-blue-500' : 'hover:bg-slate-800 hover:text-white text-slate-300'}`}
          >
            <Activity size={20} />
            New Design
          </a>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setActiveTab('history'); }}
            className={`flex items-center gap-3 px-6 py-3 transition-colors ${activeTab === 'history' ? 'bg-blue-600/10 text-blue-400 border-r-2 border-blue-500' : 'hover:bg-slate-800 hover:text-white text-slate-300'}`}
          >
            <Layers size={20} />
            Project History
          </a>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setActiveTab('asset_library'); }}
            className={`flex items-center gap-3 px-6 py-3 transition-colors ${activeTab === 'asset_library' ? 'bg-blue-600/10 text-blue-400 border-r-2 border-blue-500' : 'hover:bg-slate-800 hover:text-white text-slate-300'}`}
          >
            <Box size={20} />
            Asset Library
          </a>
        </nav>

        <div className="p-6 border-t border-slate-800">
          <a href="#" className="flex items-center gap-3 text-sm hover:text-white transition-colors">
            <Settings size={18} />
            Settings
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
          {}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {activeTab === 'new_design' ? 'De Novo Binder Design' : 
               activeTab === 'history' ? 'Project History' : 
               'Asset Library'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === 'new_design' 
                ? 'Design novel proteins to target specific tumor markers.' 
                : activeTab === 'history'
                ? 'Review and manage your past AI protein design generation runs.'
                : 'Manage your uploaded targets, structural scaffolds, and generated binders.'}
            </p>
          </div>
          <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md">
            <Menu />
          </button>
        </header>

        {/* Workspace: Split Panel */}
        {}
        {activeTab === 'new_design' && (
        <div className="flex-1 p-8 flex flex-col lg:flex-row gap-8 overflow-y-auto">
          
          <div className="w-full lg:w-[400px] flex flex-col gap-6 shrink-0">
            
            {/* Target Input Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UploadCloud size={20} className="text-blue-500"/>
                Target Specification
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target PDB ID</label>
                  <input 
                    type="text" 
                    value={pdbId}
                    onChange={(e) => setPdbId(e.target.value)}
                    disabled={jobStatus !== 'idle' && jobStatus !== 'completed'}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 uppercase"
                    placeholder="e.g., 1TUP"
                  />
                  <p className="text-xs text-slate-500 mt-1">Four-character identifier for the tumor marker.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Chain</label>
                    <input 
                      type="text" 
                      value={targetChain}
                      onChange={(e) => setTargetChain(e.target.value)}
                      disabled={jobStatus !== 'idle' && jobStatus !== 'completed'}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hotspot Residues</label>
                    <input 
                      type="text" 
                      value={hotspot}
                      onChange={(e) => setHotspot(e.target.value)}
                      disabled={jobStatus !== 'idle' && jobStatus !== 'completed'}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 248"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Design Parameters Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4">Binder Parameters</h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">Binder Length (Amino Acids)</label>
                    <span className="text-sm text-blue-600 font-medium">{binderLength}</span>
                  </div>
                  <input 
                    type="range" 
                    min="30" max="150" 
                    value={binderLength}
                    onChange={(e) => setBinderLength(e.target.value)}
                    disabled={jobStatus !== 'idle' && jobStatus !== 'completed' && jobStatus !== 'error'}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Action Button */}
            {jobStatus === 'error' ? (
              <div className="bg-red-50 p-5 rounded-2xl border border-red-200 shadow-sm text-red-700 animate-in fade-in">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <XCircle size={18} /> Connection Failed
                </h3>
                <p className="text-sm mb-4">Could not reach backend API. Ensure FastAPI is running locally on port 8000.</p>
                <button 
                  onClick={() => setJobStatus('idle')}
                  className="w-full bg-white border border-red-200 hover:bg-red-100 font-semibold py-2 rounded-xl transition-all text-red-700"
                >
                  Reset Pipeline
                </button>
              </div>
            ) : (jobStatus === 'idle' || jobStatus === 'completed') ? (
              <button 
                onClick={handleGenerate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
              >
                <Play size={20} />
                {jobStatus === 'completed' ? 'Design New Binder' : 'Start AI Design Pipeline'}
              </button>
            ) : (
              <div className="bg-slate-50 p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                {/* Progress Bar Background */}
                <div 
                  className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-500 ease-in-out" 
                  style={{ width: `${progress}%` }}
                />
                
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin text-blue-500"/>
                  Pipeline Running...
                </h3>
                
                <ul className="space-y-3 text-sm">
                  <li className={`flex items-center gap-2 ${progress >= 5 ? 'text-blue-700 font-medium' : 'text-slate-400'}`}>
                    {progress > 5 ? <CheckCircle2 size={16} className="text-green-500"/> : <div className="w-4 h-4 rounded-full border-2 border-current"/>}
                    Provisioning GPU Compute
                  </li>
                  <li className={`flex items-center gap-2 ${progress >= 25 ? 'text-blue-700 font-medium' : 'text-slate-400'}`}>
                    {progress > 25 ? <CheckCircle2 size={16} className="text-green-500"/> : <div className="w-4 h-4 rounded-full border-2 border-current"/>}
                    RFdiffusion (Generating Backbone)
                  </li>
                  <li className={`flex items-center gap-2 ${progress >= 60 ? 'text-blue-700 font-medium' : 'text-slate-400'}`}>
                    {progress > 60 ? <CheckCircle2 size={16} className="text-green-500"/> : <div className="w-4 h-4 rounded-full border-2 border-current"/>}
                    ProteinMPNN (Designing Sequence)
                  </li>
                  <li className={`flex items-center gap-2 ${progress >= 85 ? 'text-blue-700 font-medium' : 'text-slate-400'}`}>
                    {progress >= 100 ? <CheckCircle2 size={16} className="text-green-500"/> : <div className="w-4 h-4 rounded-full border-2 border-current"/>}
                    AlphaFold 3 (Validation)
                  </li>
                </ul>
              </div>
            )}
            
            {/* Download Results (Only if completed) */}
            {jobStatus === 'completed' && (
              <button className="w-full bg-white border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-700 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                <Download size={18} />
                Download PDB Files
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-6 min-h-0">
             
             {/* 3D Structure Viewer */}
             <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 p-2 min-h-[300px]">
               <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 mb-2 shrink-0">
                 <h3 className="font-semibold text-slate-700">3D Structure Viewer</h3>
                 <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">WebGL</span>
               </div>
               
               <div className="flex-1 relative">
                  <MolecularViewer status={jobStatus} selectedCandidate={selectedCandidate} />
                  
                  {jobStatus === 'idle' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm pointer-events-none">
                       <div className="bg-white px-6 py-4 rounded-xl shadow-lg border border-slate-200 text-center">
                         <AlertCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                         <p className="text-slate-800 font-medium">Ready to design</p>
                         <p className="text-sm text-slate-500 mt-1">Configure target on the left and start pipeline.</p>
                       </div>
                    </div>
                  )}
               </div>
             </div>

             {/* Sequence Viewer (Only if candidate selected) */}
             {jobStatus === 'completed' && selectedCandidate && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                    <h3 className="font-semibold text-slate-800 text-sm">Amino Acid Sequence</h3>
                    <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-slate-200 border border-slate-300"></div> Hydrophobic</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-green-100 border border-green-300"></div> Polar</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-red-100 border border-red-300"></div> Acidic</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-blue-100 border border-blue-300"></div> Basic</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 font-mono text-xs">
                    {selectedCandidate.sequence.split('').map((aa, idx) => {
                       // Basic grouping of amino acids by chemical properties
                       const type = ['A','I','L','M','F','W','V','P','G'].includes(aa) ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                    ['S','T','N','Q','Y','C'].includes(aa) ? 'bg-green-50 text-green-800 border-green-200' :
                                    ['D','E'].includes(aa) ? 'bg-red-50 text-red-800 border-red-200' :
                                    ['R','K','H'].includes(aa) ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-100';
                       
                       return (
                         <div 
                           key={`${selectedCandidate.id}-${idx}`} 
                           className={`w-6 h-6 flex items-center justify-center rounded border cursor-pointer hover:-translate-y-0.5 hover:shadow-sm transition-all ${type}`} 
                           title={`Position ${idx+1}: ${aa}`}
                         >
                           {aa}
                         </div>
                       );
                    })}
                  </div>
                </div>
             )}

             {/* Results Table (Only if completed) */}
             {jobStatus === 'completed' && (
                <div className="h-72 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 shrink-0 flex flex-col">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 shrink-0">
                    <Trophy size={18} className="text-amber-500" />
                    Top Candidate Binders
                  </h3>
                  
                  <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
                    <div className="flex gap-4 h-full">
                      {candidates.map((cand) => (
                        <div 
                          key={cand.id}
                          onClick={() => setSelectedCandidate(cand)}
                          className={`min-w-[260px] h-full flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedCandidate?.id === cand.id 
                              ? 'border-blue-500 bg-blue-50/40 shadow-md ring-4 ring-blue-500/10' 
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-bold text-slate-700 flex items-center gap-2 text-base">
                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cand.color }}></div>
                                {cand.id}
                              </span>
                              <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold ${
                                cand.status === 'High' ? 'bg-green-100 text-green-700' :
                                cand.status === 'Med' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {cand.status} Conf
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">Optimized via ProteinMPNN for maximum binding affinity.</p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-sm text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-semibold text-slate-400">Affinity</span>
                              <span className="font-bold text-slate-800">{cand.affinity}</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 pl-2">
                              <span className="text-[10px] uppercase font-semibold text-slate-400">pAE</span>
                              <span className="font-bold text-slate-800">{cand.pae}</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 pl-2">
                              <span className="text-[10px] uppercase font-semibold text-slate-400">pLDDT</span>
                              <span className="font-bold text-slate-800">{cand.plddt}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
             )}
          </div>

        </div>
        )}

        {}
        {activeTab === 'history' && (
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50 w-full">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-6 gap-4 p-4 border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-1 pl-2">Project ID</div>
                  <div className="col-span-1">Date</div>
                  <div className="col-span-1">Target</div>
                  <div className="col-span-1 text-center">Candidates</div>
                  <div className="col-span-1 text-center">Top Affinity</div>
                  <div className="col-span-1 text-right pr-2">Status</div>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {mockHistory.map((project) => (
                    <div key={project.id} className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-slate-50 transition-colors group cursor-pointer">
                      <div className="col-span-1 font-semibold text-slate-800 pl-2 flex items-center gap-2">
                        {project.id}
                      </div>
                      <div className="col-span-1 text-slate-500 text-sm flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400"/>
                        {project.date}
                      </div>
                      <div className="col-span-1 text-slate-700 font-medium text-sm">
                        {project.target}
                      </div>
                      <div className="col-span-1 text-center text-slate-600 text-sm">
                        {project.candidates > 0 ? project.candidates : '-'}
                      </div>
                      <div className="col-span-1 text-center font-mono text-sm font-medium text-blue-600">
                        {project.bestAffinity || '-'}
                      </div>
                      <div className="col-span-1 flex items-center justify-end gap-3 pr-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                          project.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {project.status === 'Completed' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                          {project.status}
                        </span>
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workspace: Asset Library */}
        {activeTab === 'asset_library' && (
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50 w-full">
            <div className="max-w-6xl mx-auto flex flex-col gap-6">
              
              {/* Asset Library Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-full sm:w-auto">
                  <div className="flex px-3 py-2 text-slate-400">
                    <Search size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search assets..." 
                    className="bg-transparent border-none outline-none text-sm w-full sm:w-64 placeholder-slate-400 text-slate-700"
                  />
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex bg-white rounded-lg border border-slate-200 shadow-sm p-1 overflow-x-auto hide-scrollbar">
                    {['All', 'Targets', 'Binders', 'Scaffolds'].map((filter, i) => (
                      <button 
                        key={filter} 
                        className={`px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${i === 0 ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-sm transition-colors flex shrink-0 items-center justify-center">
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* Asset Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {mockAssets.map((asset) => {
                  const Icon = asset.icon;
                  return (
                    <div key={asset.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                      <div className="p-5 flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${asset.bg} ${asset.color}`}>
                            <Icon size={24} strokeWidth={1.5} />
                          </div>
                          <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                            <MoreVertical size={18} />
                          </button>
                        </div>
                        <h3 className="font-semibold text-slate-800 text-lg mb-1 truncate" title={asset.name}>
                          {asset.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${asset.color} border-current/20 bg-current/10`}>
                            {asset.type}
                          </span>
                        </div>
                      </div>
                      
                      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1.5"><Calendar size={14}/> {asset.date}</span>
                        <span className="font-medium text-slate-600">{asset.size}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}