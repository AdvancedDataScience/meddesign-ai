import React, { useState } from 'react';
import { Dna, Play, Activity, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setStatus('running');
    setError(null);
    
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
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("Job submitted successfully:", data);
      setStatus('completed');
    } catch (err) {
      console.error("API error:", err);
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Dna className="text-blue-600" /> MedDesign AI
        </h1>
      </header>

      <main className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Design Pipeline</h2>
          <p className="text-sm text-slate-500 bg-slate-100 p-2 rounded truncate">
            Backend URL: {API_BASE_URL}
          </p>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={status === 'running'}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all"
        >
          {status === 'running' ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Play size={20} />
          )} 
          {status === 'running' ? 'Processing...' : 'Start Pipeline'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="mt-6 p-4 bg-slate-100 rounded-lg border border-slate-200">
          <p className="text-slate-600 text-sm">Status: <span className="font-mono font-bold text-slate-900">{status}</span></p>
        </div>
      </main>
    </div>
  );
}