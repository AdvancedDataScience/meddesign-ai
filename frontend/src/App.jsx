import React, { useState } from 'react';
import { Dna, Play, Activity } from 'lucide-react';
//
// This reads the variable we set in the Render Dashboard
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Change this line:

export default function App() {
  const [status, setStatus] = useState('idle');

  const handleGenerate = async () => {
    setStatus('running');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/design/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdb_id: '1TUP',
          target_chain: 'A',
          hotspot: '248',
          binder_length: 50
        })
      });
      const data = await response.json();
      console.log("Job submitted:", data);
      setStatus('completed');
    } catch (err) {
      console.error("API error:", err);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <header className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Dna className="text-blue-600" /> MedDesign AI
        </h1>
      </header>

      <main className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Design Pipeline</h2>
          <p className="text-slate-600">Current API URL: {API_BASE_URL}</p>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={status === 'running'}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
        >
          <Play size={20} /> {status === 'running' ? 'Running...' : 'Start Pipeline'}
        </button>

        <div className="mt-6 p-4 bg-slate-100 rounded-lg">
          <p>Status: <span className="font-mono font-bold">{status}</span></p>
        </div>
      </main>
    </div>
  );
}