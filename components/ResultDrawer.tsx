import React, { useEffect, useState } from 'react';
import { X, Copy, ExternalLink, ShieldCheck, ShieldAlert, ShieldQuestion, Loader2, Sparkles, ShoppingBag, Barcode, Globe } from 'lucide-react';
import { ScanResult, AnalysisResult } from '../types';
import { analyzeQRContent } from '../services/geminiService';

interface ResultDrawerProps {
  result: ScanResult | null;
  onClose: () => void;
  onAnalysisComplete?: (timestamp: number, analysis: AnalysisResult) => void;
}

export const ResultDrawer: React.FC<ResultDrawerProps> = ({ result, onClose, onAnalysisComplete }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (result) {
      if (result.analysis) {
        // Use cached analysis if available
        setAnalysis(result.analysis);
        setLoading(false);
      } else {
        // Fetch new analysis
        setLoading(true);
        setAnalysis(null);
        analyzeQRContent(result.data, result.format).then((res) => {
          setAnalysis(res);
          setLoading(false);
          // Notify parent to cache this result
          if (onAnalysisComplete) {
            onAnalysisComplete(result.timestamp, res);
          }
        });
      }
    }
  }, [result, onAnalysisComplete]);

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenLink = () => {
    if (result?.data) {
      window.open(result.data, '_blank');
    }
  };

  const handleSearchProduct = () => {
    if (result?.data) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(result.data)}`, '_blank');
    }
  };

  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer Content */}
      <div className="bg-gray-900 w-full max-w-md rounded-t-3xl border-t border-gray-700 shadow-2xl p-6 pointer-events-auto transform transition-transform duration-300 ease-out max-h-[85vh] overflow-y-auto animate-slide-up">
        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6" />

        <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
                 <div className={`p-3 rounded-xl ${result.format.includes('QR') || result.format.includes('DATA') ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                    <Barcode className={`w-6 h-6 ${result.format.includes('QR') || result.format.includes('DATA') ? 'text-emerald-400' : 'text-blue-400'}`} />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-white">Scanned {result.format.replace(/_/g, ' ')}</h2>
                    <p className="text-gray-400 text-sm">{new Date(result.timestamp).toLocaleTimeString()}</p>
                 </div>
            </div>
            <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-full text-gray-400 transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Raw Data Area */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700 break-all">
            <p className="text-gray-200 font-mono text-sm leading-relaxed">
                {result.data}
            </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-8">
            {result.type === 'url' && (
                <button 
                    onClick={handleOpenLink}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <ExternalLink className="w-5 h-5" />
                    Open Link
                </button>
            )}
            {result.type === 'product' && (
                <button 
                    onClick={handleSearchProduct}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <ShoppingBag className="w-5 h-5" />
                    Google It
                </button>
            )}
            <button 
                onClick={handleCopy}
                className={`flex-1 ${result.type === 'url' || result.type === 'product' ? 'bg-gray-800' : 'bg-emerald-600'} hover:opacity-90 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95`}
            >
                {copied ? <span className="text-emerald-400">Copied!</span> : (
                    <>
                        <Copy className="w-5 h-5" />
                        Copy
                    </>
                )}
            </button>
        </div>

        {/* Gemini Analysis Section */}
        <div className="border-t border-gray-800 pt-6">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">Gemini Live Search</span>
            </div>

            {loading ? (
                <div className="flex items-center gap-3 text-gray-400 animate-pulse py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Searching internet for details...</span>
                </div>
            ) : analysis ? (
                <div className="space-y-4 animate-fade-in">
                    
                    {/* Product specific Highlight */}
                    {analysis.productName && (
                        <div className="bg-blue-900/20 border border-blue-900/50 p-4 rounded-xl">
                            <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1 block">Identified Product</span>
                            <h3 className="text-lg font-bold text-white mb-2">{analysis.productName}</h3>
                            {analysis.productDetails && (
                                <p className="text-sm text-blue-200/80">{analysis.productDetails}</p>
                            )}
                        </div>
                    )}

                    {/* Safety Badge */}
                    <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                        analysis.safety === 'safe' ? 'bg-emerald-900/20 border-emerald-900/50' : 
                        analysis.safety === 'danger' ? 'bg-red-900/20 border-red-900/50' :
                        'bg-amber-900/20 border-amber-900/50'
                    }`}>
                        {analysis.safety === 'safe' && <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />}
                        {analysis.safety === 'danger' && <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />}
                        {(analysis.safety === 'caution' || analysis.safety === 'unknown') && <ShieldQuestion className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />}
                        
                        <div>
                            <h4 className={`font-bold mb-1 ${
                                analysis.safety === 'safe' ? 'text-emerald-400' :
                                analysis.safety === 'danger' ? 'text-red-400' :
                                'text-amber-400'
                            }`}>
                                {analysis.safety.toUpperCase()}
                            </h4>
                            <p className="text-sm text-gray-300 leading-snug">
                                {analysis.summary}
                            </p>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                            <span className="text-xs text-gray-500 block mb-1">Category</span>
                            <span className="text-sm font-medium text-gray-200">{analysis.category}</span>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                             <span className="text-xs text-gray-500 block mb-1">Format</span>
                             <span className="text-sm font-medium text-gray-200">{result.format.replace(/_/g, ' ')}</span>
                        </div>
                    </div>

                    {/* Search Sources */}
                    {analysis.sources && analysis.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-800">
                             <div className="flex items-center gap-2 mb-3">
                                <Globe className="w-3 h-3 text-gray-500" />
                                <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">Found on</span>
                             </div>
                             <div className="space-y-2">
                                {analysis.sources.slice(0, 3).map((source, idx) => (
                                    <a 
                                        key={idx} 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group"
                                    >
                                        <span className="text-xs text-blue-400 truncate pr-2 max-w-[250px]">{source.title}</span>
                                        <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-white" />
                                    </a>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-gray-500 text-sm">Unable to analyze content.</div>
            )}
        </div>
      </div>
    </div>
  );
};