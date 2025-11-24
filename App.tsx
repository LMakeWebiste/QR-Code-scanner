import React, { useState, useCallback } from 'react';
import { Scanner } from './components/Scanner';
import { ResultDrawer } from './components/ResultDrawer';
import { ScanResult, AnalysisResult } from './types';
import { Scan, History, Settings, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

const App: React.FC = () => {
  const [scannedResult, setScannedResult] = useState<ScanResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [view, setView] = useState<'scan' | 'history'>('scan');

  // When a scan is detected
  const handleScan = useCallback((result: ScanResult) => {
    // Prevent scanning while drawer is open
    if (isDrawerOpen) return;

    // Optional: play a beep sound here
    
    setScannedResult(result);
    setIsDrawerOpen(true);
    setHistory(prev => [result, ...prev].slice(0, 50)); // Keep last 50
  }, [isDrawerOpen]);

  const closeDrawer = () => {
    // Close immediately to allow re-scanning without race conditions
    setIsDrawerOpen(false);
    setScannedResult(null);
  };

  const handleAnalysisComplete = useCallback((timestamp: number, analysis: AnalysisResult) => {
    setHistory(prev => prev.map(item => {
        if (item.timestamp === timestamp) {
            return { ...item, analysis };
        }
        return item;
    }));
  }, []);

  return (
    <div className="h-screen w-full bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex justify-between items-center pointer-events-auto">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Scan className="text-emerald-500" />
                Gemini Lens
            </h1>
            <button 
                className={`p-2 rounded-full transition-colors ${view === 'history' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:bg-white/10'}`}
                onClick={() => setView(view === 'scan' ? 'history' : 'scan')}
            >
                <History className="w-6 h-6" />
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative">
        {view === 'scan' ? (
             <Scanner 
                onScan={handleScan} 
                isScanning={!isDrawerOpen && view === 'scan'} 
             />
        ) : (
            <div className="h-full bg-gray-900 overflow-y-auto pt-20 px-4 pb-4">
                <h2 className="text-white text-lg font-semibold mb-4">Scan History</h2>
                {history.length === 0 ? (
                    <div className="text-gray-500 text-center mt-20">
                        <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No scans yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((item, idx) => (
                            <div 
                                key={`${item.timestamp}-${idx}`} 
                                className="bg-gray-800 p-4 rounded-xl border border-gray-700 active:bg-gray-700 transition-colors cursor-pointer"
                                onClick={() => {
                                    setScannedResult(item);
                                    setIsDrawerOpen(true);
                                }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium uppercase ${
                                            item.type === 'url' ? 'bg-blue-900/30 text-blue-400' :
                                            item.type === 'wifi' ? 'bg-purple-900/30 text-purple-400' :
                                            'bg-gray-700 text-gray-300'
                                        }`}>
                                            {item.type}
                                        </span>
                                        {item.analysis && (
                                            <div className={`flex items-center gap-1 text-xs font-medium ${
                                                item.analysis.safety === 'safe' ? 'text-emerald-400' :
                                                item.analysis.safety === 'danger' ? 'text-red-400' :
                                                'text-amber-400'
                                            }`}>
                                                {item.analysis.safety === 'safe' && <ShieldCheck className="w-3 h-3" />}
                                                {item.analysis.safety === 'danger' && <ShieldAlert className="w-3 h-3" />}
                                                {(item.analysis.safety === 'caution' || item.analysis.safety === 'unknown') && <ShieldQuestion className="w-3 h-3" />}
                                                <span className="capitalize">{item.analysis.safety}</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-gray-200 font-mono text-sm truncate">
                                    {item.data}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </main>

      {/* Result Drawer */}
      <ResultDrawer 
        result={scannedResult} 
        onClose={closeDrawer}
        onAnalysisComplete={handleAnalysisComplete}
      />
    </div>
  );
};

export default App;