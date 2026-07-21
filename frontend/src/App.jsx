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
  Plus,
  Eye
} from 'lucide-react';
import * as THREE from 'three';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query } from 'firebase/firestore';

const API_BASE_URL = 'https://meddesign-backend.onrender.com';

let app, auth, db, appId;
try {
  const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
} catch (e) {
  console.warn("Firebase config not found or invalid. Running in local state mode.", e);
}

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
  
  const [jobStatus, setJobStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [user, setUser] = useState(null);
  const [projectHistory, setProjectHistory] = useState([
    {
      id: 'PRJ-1042',
      target: '1TUP (Chain A)',
      date: '2026-07-18',
      status: 'Completed',
      bestAffinity: -14.1,
      candidates: [
        {
          id: '1TUP_NS_01',
          affinity: -14.1,
          pae: 2.1,
          plddt: 96.2,
          color: '#3b82f6',
          sequence: 'MAEVKLEIKADGTVLESIKFEGDTVIEFNGDTIIE',
          pdb: 'HEADER    DE NOVO BINDING PROTEIN 1TUP_NS_01\nATOM      1  N   MET A   1      12.452  18.321  5.432  1.00 96.20     N\nATOM      2  CA  MET A   1      13.123  19.112  6.211  1.00 96.20     C\nEND'
        }
      ]
    }
  ]);

  const [assetLibrary, setAssetLibrary] = useState([
    { id: 'AST-001', name: '1TUP_cleaned.pdb', type: 'Target', size: '2.4 MB', date: '2026-07-19', content: 'HEADER 1TUP TARGET PDB DATA...', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100' },
    { id: 'AST-002', name: 'Helical_Scaffold_v3', type: 'Scaffold', size: '156 KB', date: '2026-07-10', content: 'HEADER SCAFFOLD DATA...', icon: Layers, color: 'text-purple-500', bg: 'bg-purple-100' },
    { id: 'AST-003', name: '1TUP_NS_01_structure.pdb', type: 'Generated PDB', size: '42 KB', date: '2026-07-18', content: 'HEADER 1TUP_NS_01 PDB...', icon: Box, color: 'text-emerald-500', bg: 'bg-emerald-100' },
    { id: 'AST-004', name: '1TUP_NS_01_sequences.fasta', type: 'FASTA / RNA', size: '12 KB', date: '2026-07-18', content: '> 1TUP_NS_01\nMAEVKLEIKADG...', icon: Dna, color: 'text-amber-500', bg: 'bg-amber-100' },
  ]);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    try {
      const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'projectHistory'));
      const unsubscribeSnap = onSnapshot(q, (snapshot) => {
        const loadedProjects = [];
        snapshot.forEach((doc) => {
          loadedProjects.push({ id: doc.id, ...doc.data() });
        });
        if (loadedProjects.length > 0) {
          setProjectHistory(prev => {
            const combined = [...loadedProjects, ...prev];
            return Array.from(new Map(combined.map(item => [item.id, item])).values());
          });
        }
      });
      return () => unsubscribeSnap();
    } catch (err) {
      console.error("Firestore listener error:", err);
    }
  }, [user]);

  const saveProjectToCloud = async (projectData) => {
    if (!user || !db) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'projectHistory'), projectData);
    } catch (err) {
      console.error("Failed to save project to cloud database:", err);
    }
  };

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
        const fetchedCandidates = (data.candidates || []).map(cand => ({
          ...cand,
          pdb: `HEADER    DE NOVO BINDING PROTEIN ${cand.id}\nCOMPND    Target: ${pdbId} Chain ${targetChain}\nAUTHOR    MEDDESIGN AI NEUROSNAP ENGINE\nATOM      1  N   MET A   1      ${(Math.random()*20).toFixed(3)}  ${(Math.random()*20).toFixed(3)}  ${(Math.random()*20).toFixed(3)}  1.00 ${cand.plddt}     N\nATOM      2  CA  MET A   1      ${(Math.random()*20).toFixed(3)}  ${(Math.random()*20).toFixed(3)}  ${(Math.random()*20).toFixed(3)}  1.00 ${cand.plddt}     C\nEND`
        }));

        setCandidates(fetchedCandidates);
        if (fetchedCandidates.length > 0) {
          setSelectedCandidate(fetchedCandidates[0]);
        }

        const bestAffinity = fetchedCandidates.length > 0 ? Math.min(...fetchedCandidates.map(c => c.affinity)) : 0;
        const newProjectRecord = {
          id: jobId,
          target: `${pdbId.toUpperCase()} (Chain ${targetChain})`,
          date: new Date().toISOString().split('T')[0],
          status: 'Completed',
          bestAffinity: bestAffinity,
          candidates: fetchedCandidates
        };

        setProjectHistory(prev => [newProjectRecord, ...prev.filter(p => p.id !== jobId)]);
        saveProjectToCloud(newProjectRecord);

        // Automatically populate generated model files into Asset Library
        const newAssets = fetchedCandidates.flatMap(cand => [
          {
            id: `AST-${Math.random().toString(36).substring(2, 7)}`,
            name: `${cand.id}_structure.pdb`,
            type: 'Generated PDB',
            size: '42 KB',
            date: new Date().toISOString().split('T')[0],
            content: cand.pdb,
            icon: Box,
            color: 'text-emerald-500',
            bg: 'bg-emerald-100'
          },
          {
            id: `AST-${Math.random().toString(36).substring(2, 7)}`,
            name: `${cand.id}_sequences.fasta`,
            type: 'FASTA / RNA',
            size: '12 KB',
            date: new Date().toISOString().split('T')[0],
            content: `> ${cand.id} | Protein\n${cand.sequence}\n> ${cand.id}_mRNA\n${cand.sequence.replace(/T/g, 'U')}`,
            icon: Dna,
            color: 'text-amber-500',
            bg: 'bg-amber-100'
          }
        ]);
        setAssetLibrary(prev => [...newAssets, ...prev]);

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

  const downloadFile = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAssetDownload = (asset) => {
    downloadFile(asset.name, asset.content || 'MODEL DATA', 'text/plain');
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
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('history'); }} className={`flex items-center gap-3 px-6 py-3 transition-colors ${activeTab === 'history' ? 'bg-blue-600/10 text-blue-400 border-r-2 border-blue-500' : 'hover:bg-slate-800 text-slate-300'}`}>
            <Layers size={20} /> Project History
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('asset_library'); }} className={`flex items-center gap-3 px-6 py-3 transition-colors ${activeTab === 'asset_library' ? 'bg-blue-600/10 text-blue-400 border-r-2 border-blue-500' : 'hover:bg-slate-800 text-slate-300'}`}>
            <Box size={20} /> Asset Library
          </a>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {activeTab === 'new_design' ? 'De Novo Binder Design' : 
               activeTab === 'history' ? 'Project History & Model Previews' : 
               'Asset Library & Model Downloads'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === 'new_design' ? 'Design novel proteins targeting specific tumor markers via Neurosnap.' : 
               activeTab === 'history' ? 'Review past AI generation runs and inspect structural animations.' : 
               'Access and download all generated PDB structure files and FASTA/RNA sequence records.'}
            </p>
          </div>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Target Chain</label>
                      <input type="text" value={targetChain} onChange={(e) => setTargetChain(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg uppercase" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hotspot Residues</label>
                      <input type="text" value={hotspot} onChange={(e) => setHotspot(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold mb-4">Binder Parameters</h2>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">Binder Length</label>
                    <span className="text-sm text-blue-600 font-medium">{binderLength}</span>
                  </div>
                  <input type="range" min="30" max="150" value={binderLength} onChange={(e) => setBinderLength(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
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
                          <div className="text-xs text-slate-500 mt-2 truncate font-mono">Seq: {cand.sequence}</div>
                        </div>
                      ))}
                    </div>
                  </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
            <div className="max-w-6xl mx-auto space-y-6">
              {projectHistory.map((project) => (
                <div key={project.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="font-bold text-lg text-slate-800">{project.id}</span>
                      <span className="ml-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{project.target}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5"><Calendar size={14}/> {project.date}</span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle2 size={12}/> {project.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                    <div className="h-64">
                      <MolecularViewer status="completed" selectedCandidate={project.candidates?.[0]} />
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                        <Trophy size={16} className="text-amber-500" /> Candidate Models & Biophysical Metrics
                      </h4>
                      <div className="space-y-3">
                        {project.candidates && project.candidates.map((cand) => (
                          <div key={cand.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-800">{cand.id}</span>
                              <span className="text-xs font-mono text-blue-600 font-semibold">Affinity: {cand.affinity}</span>
                            </div>
                            <div className="text-xs text-slate-500">pLDDT: {cand.plddt} | PAE: {cand.pae}</div>
                            <div className="text-xs font-mono text-slate-600 truncate">Seq: {cand.sequence}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'asset_library' && (
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
            <div className="max-w-6xl mx-auto flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assetLibrary.map((asset) => {
                  const Icon = asset.icon;
                  return (
                    <div key={asset.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${asset.bg} ${asset.color}`}>
                            <Icon size={24} />
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${asset.color} bg-current/10`}>{asset.type}</span>
                        </div>
                        <h3 className="font-semibold text-slate-800 text-lg mb-1 truncate">{asset.name}</h3>
                      </div>
                      <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between">
                        <span className="text-xs text-slate-500">{asset.date} • {asset.size}</span>
                        <button onClick={() => handleAssetDownload(asset)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all">
                          <Download size={14} /> Download
                        </button>
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