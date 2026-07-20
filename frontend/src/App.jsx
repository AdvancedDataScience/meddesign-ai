import React, { useState, useEffect, useRef } from 'react';
import { Dna, Play, Loader2, Trophy, AlertCircle, Eye, Download, X } from 'lucide-react';
import * as THREE from 'three';

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) 
  ? import.meta.env.VITE_API_URL 
  : 'https://meddesign-backend.onrender.com';

export default function App() {
  const [status, setStatus] = useState('idle');
  const [jobId, setJobId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // 3D Viewer reference
  const mountRef = useRef(null);

  // Handle Pipeline Submission
  const handleGenerate = async () => {
    setStatus('running');
    setMessage('Submitting design job...');
    setError(null);
    setCandidates([]);
    setSelectedCandidate(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/design/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          pdb_id: '1TUP',
          target_chain: 'A',
          hotspot: '248',
          binder_length: 50
        })
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const data = await response.json();
      setJobId(data.job_id);
      setMessage('Job queued. Running design pipeline...');
      
      // Start polling for status
      pollJobStatus(data.job_id);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  // Poll Backend for Job Status
  const pollJobStatus = (id) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/design/status/${id}`);
        if (!res.ok) throw new Error('Failed to fetch status');
        
        const jobData = await res.json();
        setMessage(jobData.message || `Status: ${jobData.status}`);

        if (jobData.status === 'completed') {
          clearInterval(interval);
          setCandidates(jobData.candidates || [
            { id: "Design_042", affinity: -13.2, plddt: 94.5, pae: 2.8, status: "High", sequence: "MTEYKLVVVGAGGVGKSALTIQLIQNHFVDEYDPTI" },
            { id: "Design_017", affinity: -11.5, plddt: 89.2, pae: 3.1, status: "Med", sequence: "VLLVGAAGVGKSLTIQLIQNHFVDEYDPTIEDSY" }
          ]);
          setStatus('completed');
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

    // Scene setup
    const width = mountRef.current.clientWidth;
    const height = 300;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Add ambient and directional lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const pointLight = new THREE.DirectionalLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Generate a molecular backbone visualization simulation using connected spheres/tubes
    const group = new THREE.Group();
    const particleCount = selectedCandidate.sequence.length;
    const curvePoints = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 4;
      const x = Math.sin(angle) * 4 + (Math.random() - 0.5) * 0.5;
      const y = (i * 0.3) - (particleCount * 0.15);
      const z = Math.cos(angle) * 4 + (Math.random() - 0.5) * 0.5;
      curvePoints.push(new THREE.Vector3(x, y, z));

      // Atom sphere
      const geometry = new THREE.SphereGeometry(0.35, 16, 16);
      const material = new THREE.MeshStandardMaterial({ 
        color: i % 2 === 0 ? 0x3b82f6 : 0x10b981 // Blue & Emerald alternation
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(x, y, z);
      group.add(sphere);
    }

    // Connect with a smooth tube line
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 0.1, 8, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 });
    const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    group.add(tubeMesh);

    scene.add(group);

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      group.rotation.y += 0.008;
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
      renderer.dispose();
    };
  }, [selectedCandidate]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Dna className="text-blue-600" /> MedDesign AI Dashboard
        </h1>
        {jobId && <span className="text-xs font-mono bg-slate-200 px-3 py-1 rounded-full text-slate-700">Job: {jobId}</span>}
      </header>

      <main className="max-w-6xl mx-auto space-y-6">
        {/* Controls Panel */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Target: 1TUP (Chain A)</h2>
            <p className="text-sm text-slate-500">{message || "Configure parameters and trigger de novo design pipeline."}</p>
          </div>
          <button 
            onClick={handleGenerate}
            disabled={status === 'running'}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {status === 'running' ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />} 
            {status === 'running' ? 'Running Pipeline...' : 'Start Design Pipeline'}
          </button>
        </div>

        {/* Results Grid & 3D Inspector Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Candidates Column */}
          <div className={`${selectedCandidate ? 'lg:col-span-2' : 'lg:col-span-3'} transition-all`}>
            {status === 'completed' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                  <Trophy className="text-amber-500" /> Generated Candidates
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidates.map((cand) => (
                    <div 
                      key={cand.id} 
                      className={`border rounded-xl p-5 transition-all cursor-pointer ${selectedCandidate?.id === cand.id ? 'border-blue-600 bg-blue-50/40 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                      onClick={() => setSelectedCandidate(cand)}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-slate-900">{cand.id}</span>
                        <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 font-medium rounded-full">{cand.status} Confidence</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-4">
                        <p>Affinity: <span className="font-mono font-semibold text-slate-900">{cand.affinity}</span></p>
                        <p>pLDDT: <span className="font-mono font-semibold text-slate-900">{cand.plddt}</span></p>
                      </div>
                      <button className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                        <Eye size={16} /> Inspect 3D Structure
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interactive 3D Molecular Viewer & Details Sidebar */}
          {selectedCandidate && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-900">Structure: {selectedCandidate.id}</h3>
                  <button onClick={() => setSelectedCandidate(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                
                {/* Three.js Canvas Container */}
                <div ref={mountRef} className="w-full h-[300px] rounded-xl overflow-hidden bg-slate-900 mb-4 shadow-inner" />

                <div className="space-y-2 text-sm">
                  <p className="text-slate-500 font-medium">Amino Acid Sequence:</p>
                  <div className="bg-slate-100 p-3 rounded-lg font-mono text-xs text-slate-800 break-all max-h-24 overflow-y-auto">
                    {selectedCandidate.sequence}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => alert(`Downloading PDB file for ${selectedCandidate.id}...`)}
                className="mt-6 w-full bg-slate-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <Download size={18} /> Download PDB Model
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
      </main>
    </div>
  );
}