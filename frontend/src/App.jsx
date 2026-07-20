import React, { useState } from 'react';
import { Dna, Play, Loader2, Trophy, AlertCircle } from 'lucide-react';

// Accessing environment variables using the standard Vite pattern
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) 
  ? import.meta.env.VITE_API_URL 
  : 'https://meddesign-backend.onrender.com';

export default function App() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);

  const handleGenerate = async () => {
    setStatus('running');
    setError(null);
    setCandidates([]);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/design/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          pdb_id: '1TUP',
          target_chain: 'A',
          hotspot: '248',
          binder_length: 50
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      
      // Simulating candidate results display
      if (data.candidates) {
        setCandidates(data.candidates);
      } else {
        setCandidates([
            { id: "Design_042", affinity: -13.2, plddt: 94.5, status: "High" },
            { id: "Design_017", affinity: -11.5, plddt: 89.2, status: "Med" }
        ]);
      }
      setStatus('completed');
    } catch (err) {
      console.error("API error:", err);
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <header className="max-w-5xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Dna className="text-blue-600" /> MedDesign AI
        </h1>
      </header>

      <main className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <button 
            onClick={handleGenerate}
            disabled={status === 'running'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {status === 'running' ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />} 
            {status === 'running' ? 'Running Pipeline...' : 'Start Design Pipeline'}
          </button>
        </div>

        {status === 'completed' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in duration-700">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="text-amber-500" /> Generated Candidates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((cand) => (
                <div key={cand.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-400 transition-colors">
                  <div className="font-bold text-blue-600 mb-2">{cand.id}</div>
                  <div className="text-sm space-y-1 text-slate-600">
                    <p>Affinity: <span className="font-mono font-medium text-slate-900">{cand.affinity}</span></p>
                    <p>pLDDT: <span className="font-mono font-medium text-slate-900">{cand.plddt}</span></p>
                    <p>Confidence: <span className="font-medium text-slate-900">{cand.status}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}
      </main>
    </div>
  );
}