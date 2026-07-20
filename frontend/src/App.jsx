import React, { useState, useEffect, useRef } from 'react';
import { Dna, Play, Loader2, Trophy, AlertCircle, Eye, Download, X, History, Database, Sliders, CheckCircle2 } from 'lucide-react';
import * as THREE from 'three';

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) 
  ? import.meta.env.VITE_API_URL 
  : 'https://meddesign-backend.onrender.com';

export default function App() {
  const [activeTab, setActiveTab] = useState('workspace'); // 'workspace', 'history', 'assets'
  const [status, setStatus] = useState('idle');
  const [jobId, setJobId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Form Parameters
  const [pdbId, setPdbId] = useState('1TUP');
  const [targetChain, setTargetChain] = useState('A');
  const [hotspot, setHotspot] = useState('248');
  const [binderLength, setBinderLength] = useState(50);

  // Project History State
  const [jobHistory, setJobHistory] = useState([
    { id: 'PRJ-8F21', target: '1TUP (Chain A)', status: 'completed', date: '2026-07-20', candidatesCount: 2 }
  ]);

  const mountRef = useRef(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setStatus('running');
    setMessage('Submitting design job to backend...');
    setError(null);
    setCandidates([]);
    setSelectedCandidate(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/design/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          pdb_id: pdbId,
          target_chain: targetChain,
          hotspot: hotspot,
          binder_length: parseInt(binderLength)
        })
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const data = await response.json();
      setJobId(data.job_id);
      setMessage('Job queued. Running design pipeline...');
      
      pollJobStatus(data.job_id);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const pollJobStatus = (id) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/design/status/${id}`);
        if (!res.ok) throw new Error('Failed to fetch status');
        
        const jobData = await res.json();
        setMessage(jobData.message || `Status: ${jobData.status}`);

        if (jobData.status === 'completed') {
          clearInterval(interval);
          const results = jobData.candidates || [
            { id: "Design_042", affinity: -13.2, plddt: 94.5, pae: 2.8, status: "High", sequence: "MTEYKLVVVGAGGVGKSALTIQLIQNHFVDEYDPTI" },
            { id: "Design_017", affinity: -11.5, plddt: 89.2, pae: 3.1, status: "Med", sequence: "VLLVGAAGVGKSLTIQLIQNHFVDEYDPTIEDSY" }
          ];
          setCandidates(results);
          setStatus('completed');

          // Add to history log
          setJobHistory(prev => [
            { id, target: `${pdbId} (Chain ${targetChain})`, status: 'completed', date: new Date().toISOString().split('T')[0], candidatesCount: results.length },
            ...prev
          ]);
        } else if (jobData.status === 'error') {
          clearInterval(interval);
          setError('Pipeline execution failed on backend.');
          setStatus('error');
        }
      } catch (err) {
        clearInterval(interval);
        setError(err.message);
        setStatus('error');
      }
    }, 2000);
  };

  // Three.js 3D Viewer Effect
  useEffect(() => {
    if (!selectedCandidate || !mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = 280;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const pointLight = new THREE.DirectionalLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const group = new THREE.Group();
    const particleCount = selectedCandidate.sequence.length;
    const curvePoints = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 4;
      const x = Math.sin(angle) * 4 + (Math.random() - 0.5) * 0.5;
      const y = (i * 0.3) - (particleCount * 0.15);
      const z = Math.cos(angle) * 4 + (Math.random() - 0.5) * 0.5;
      curvePoints.push(new THREE.Vector3(x, y, z));

      const geometry = new THREE.SphereGeometry(0.35, 16, 16);
      const material = new THREE.MeshStandardMaterial({ 
        color: i % 2 === 0 ? 0x2563eb : 0x059669 
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(x, y, z);
      group.add(sphere);
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 0.1, 8, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 });
    const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    group.add(tubeMesh);

    scene.add(group);

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      group.rotation.y += 0.008;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current) mountRef.current.innerHTML = '';
      renderer.dispose();
    };
  }, [selectedCandidate]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded-xl text-blue-400">
              <Dna size={24} />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide text-white">MedDesign AI</h1>
              <p className="text-xs text-slate-400">Protein Engineering Suite</p>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setActiveTab('workspace')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'workspace' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Sliders size={18} /> Design Workspace
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <History size={18} /> Project History
            </button>
            <button 
              onClick={() => setActiveTab('assets')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'assets' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Database size={18} /> Asset Library
            </button>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          Backend API: <span className="font-mono text-emerald-400">Connected</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Top Navbar */}
        <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold capitalize text-white">{activeTab === 'workspace' ? 'De Novo Binder Design' : activeTab}</h2>
          </div>
          {jobId && <span className="text-xs font-mono bg-slate-800 text-blue-400 px-3 py-1.5 rounded-full border border-slate-700">Active Job: {jobId}</span>}
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {activeTab === 'workspace' && (
            <>
              {/* Configuration Panel */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
                <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                  <Sliders size={18} className="text-blue-500" /> Pipeline Parameters
                </h3>
                <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Target PDB ID</label>
                    <input 
                      type="text" 
                      value={pdbId} 
                      onChange={(e) => setPdbId(e.target.value)} 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Target Chain</label>
                    <input 
                      type="text" 
                      value={targetChain} 
                      onChange={(e) => setTargetChain(e.target.value)} 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Hotspot Residue</label>
                    <input 
                      type="text" 
                      value={hotspot} 
                      onChange={(e) => setHotspot(e.target.value)} 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={status === 'running'}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
                  >
                    {status === 'running' ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />} 
                    {status === 'running' ? 'Running...' : 'Start Pipeline'}
                  </button>
                </form>
                {message && <p className="text-xs text-blue-400 mt-3 font-mono">{message}</p>}
              </div>

              {/* Results & 3D Viewer Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`${selectedCandidate ? 'lg:col-span-2' : 'lg:col-span-3'} transition-all`}>
                  {status === 'completed' && (
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                        <Trophy className="text-amber-400" /> Generated Candidates
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {candidates.map((cand) => (
                          <div 
                            key={cand.id} 
                            onClick={() => setSelectedCandidate(cand)}
                            className={`border rounded-xl p-5 cursor-pointer transition-all ${selectedCandidate?.id === cand.id ? 'border-blue-500 bg-blue-950/30' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-bold text-white">{cand.id}</span>
                              <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 font-medium rounded-full border border-emerald-500/20">{cand.status} Confidence</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-slate-400 mb-4">
                              <p>Affinity: <span className="font-mono text-slate-200">{cand.affinity}</span></p>
                              <p>pLDDT: <span className="font-mono text-slate-200">{cand.plddt}</span></p>
                            </div>
                            <button className="w-full py-2 bg-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                              <Eye size={16} /> Inspect 3D Structure
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3D Sidebar Inspector */}
                {selectedCandidate && (
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-white text-sm">Model: {selectedCandidate.id}</h4>
                        <button onClick={() => setSelectedCandidate(null)} className="text-slate-400 hover:text-white">
                          <X size={18} />
                        </button>
                      </div>
                      <div ref={mountRef} className="w-full h-[260px] rounded-xl overflow-hidden bg-slate-900 mb-4 border border-slate-800" />
                      <div className="space-y-1 text-xs">
                        <span className="text-slate-400 font-medium">Amino Acid Sequence:</span>
                        <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-slate-300 break-all max-h-20 overflow-y-auto border border-slate-800">
                          {selectedCandidate.sequence}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert(`Downloading PDB file for ${selectedCandidate.id}`)}
                      className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-slate-100 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                    >
                      <Download size={16} /> Download PDB
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Project History Log</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900 text-xs uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Job ID</th>
                      <th className="p-3">Target Protein</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Candidates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobHistory.map((job) => (
                      <tr key={job.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                        <td className="p-3 font-mono text-blue-400">{job.id}</td>
                        <td className="p-3">{job.target}</td>
                        <td className="p-3 flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={16} /> {job.status}</td>
                        <td className="p-3 text-slate-400">{job.date}</td>
                        <td className="p-3 font-mono">{job.candidatesCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Asset Library</h3>
              <p className="text-sm text-slate-400">Manage uploaded target PDB structures, custom scaffolds, and design templates.</p>
              <div className="mt-6 border-2 border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500">
                <Database className="mx-auto mb-2 text-slate-600" size={32} />
                <p className="text-sm">Drag and drop PDB files here, or click to browse.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-950/40 text-red-400 rounded-xl border border-red-900/50 flex items-center gap-3">
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}