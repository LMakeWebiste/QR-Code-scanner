import React, { useRef, useEffect, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Camera, CameraOff, AlertCircle, ScanLine, QrCode, StretchHorizontal, Zap, ZapOff } from 'lucide-react';
import { ScanResult } from '../types';

interface ScannerProps {
  onScan: (result: ScanResult) => void;
  isScanning: boolean;
}

type ScanMode = 'auto' | 'qr' | 'barcode';

export const Scanner: React.FC<ScannerProps> = ({ onScan, isScanning }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('auto');
  
  // Torch State
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  
  // Refs for callbacks to avoid re-init
  const isScanningRef = useRef(isScanning);
  const onScanRef = useRef(onScan);
  
  useEffect(() => {
    isScanningRef.current = isScanning;
    // Clear canvas when not scanning
    if (!isScanning && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [isScanning]);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const getFormatName = (format: number): string => {
    const formatMap: Record<number, string> = {
      [BarcodeFormat.AZTEC]: 'AZTEC',
      [BarcodeFormat.CODABAR]: 'CODABAR',
      [BarcodeFormat.CODE_39]: 'CODE_39',
      [BarcodeFormat.CODE_93]: 'CODE_93',
      [BarcodeFormat.CODE_128]: 'CODE_128',
      [BarcodeFormat.DATA_MATRIX]: 'DATA_MATRIX',
      [BarcodeFormat.EAN_8]: 'EAN_8',
      [BarcodeFormat.EAN_13]: 'EAN_13',
      [BarcodeFormat.ITF]: 'ITF',
      [BarcodeFormat.MAXICODE]: 'MAXICODE',
      [BarcodeFormat.PDF_417]: 'PDF_417',
      [BarcodeFormat.QR_CODE]: 'QR_CODE',
      [BarcodeFormat.RSS_14]: 'RSS_14',
      [BarcodeFormat.RSS_EXPANDED]: 'RSS_EXPANDED',
      [BarcodeFormat.UPC_A]: 'UPC_A',
      [BarcodeFormat.UPC_E]: 'UPC_E',
      [BarcodeFormat.UPC_EAN_EXTENSION]: 'UPC_EAN_EXTENSION',
    };
    return formatMap[format] || 'UNKNOWN';
  };

  const is2DFormat = (format: number): boolean => {
      return [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.AZTEC,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.MAXICODE,
          BarcodeFormat.PDF_417
      ].includes(format);
  };

  const determineType = (data: string, format: string): ScanResult['type'] => {
    if (data.startsWith('http')) return 'url';
    if (data.startsWith('WIFI:')) return 'wifi';
    if (['EAN_8', 'EAN_13', 'UPC_A', 'UPC_E', 'CODE_39', 'CODE_128'].includes(format)) return 'product';
    return 'text';
  };

  const drawResultOverlay = (resultPoints: any[], format: number) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Match canvas size to video size
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const is2D = is2DFormat(format);
      
      ctx.beginPath();
      ctx.lineWidth = 4;
      
      if (is2D) {
          // Draw Polygon for 2D codes (Green)
          ctx.strokeStyle = '#10b981'; // Emerald 500
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
          
          if (resultPoints.length > 0) {
              ctx.moveTo(resultPoints[0].x, resultPoints[0].y);
              for (let i = 1; i < resultPoints.length; i++) {
                  ctx.lineTo(resultPoints[i].x, resultPoints[i].y);
              }
              ctx.closePath();
          }
      } else {
          // Draw Line/Rect for 1D barcodes (Blue)
          ctx.strokeStyle = '#3b82f6'; // Blue 500
          ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';

          // 1D barcodes often give 2 points (start/end line)
          if (resultPoints.length >= 2) {
             const x1 = resultPoints[0].x;
             const y1 = resultPoints[0].y;
             const x2 = resultPoints[resultPoints.length - 1].x;
             const y2 = resultPoints[resultPoints.length - 1].y;
             
             // Draw a thick line or a rect simulating the barcode height
             // Since we only get points, we simulate a "frame"
             ctx.moveTo(x1, y1);
             ctx.lineTo(x2, y2);
             
             // Add a "glow" effect for 1D
             ctx.shadowColor = '#3b82f6';
             ctx.shadowBlur = 10;
          }
      }
      
      ctx.stroke();
      if (is2D) ctx.fill();
      
      // Clear shadow
      ctx.shadowBlur = 0;
  };

  const toggleTorch = async () => {
      const video = videoRef.current;
      if (!video || !video.srcObject) return;

      const stream = video.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];

      if (!track) return;

      try {
          const newStatus = !torchOn;
          await track.applyConstraints({
              advanced: [{ torch: newStatus } as any]
          });
          setTorchOn(newStatus);
      } catch (err) {
          console.error("Failed to toggle torch", err);
      }
  };

  useEffect(() => {
    // Configure formats based on active Scan Mode
    const hints = new Map<DecodeHintType, any>();
    const formats: BarcodeFormat[] = [];

    // QR Mode: Focus on 2D Matrix codes
    if (scanMode === 'qr') {
        formats.push(
            BarcodeFormat.QR_CODE,
            BarcodeFormat.AZTEC,
            BarcodeFormat.DATA_MATRIX,
            BarcodeFormat.PDF_417
        );
    }
    // Barcode Mode: Focus on 1D Linear codes
    else if (scanMode === 'barcode') {
        formats.push(
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.CODE_93,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.ITF,
            BarcodeFormat.CODABAR,
            BarcodeFormat.RSS_14
        );
    }
    // Auto Mode: Common mix, excluding obscure ones for performance
    else {
        formats.push(
            BarcodeFormat.QR_CODE,
            BarcodeFormat.AZTEC,
            BarcodeFormat.DATA_MATRIX,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.PDF_417
        );
    }

    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    
    // Create Reader with refined hints
    const codeReader = new BrowserMultiFormatReader(hints);
    let controls: any = null;

    const startScanning = async () => {
      if (!videoRef.current) return;

      // Check if browser supports media devices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasPermission(false);
        setError("Camera API not supported in this browser or context (HTTPS required).");
        return;
      }

      const handleDecode = (result: any, err: any) => {
        if (result && isScanningRef.current) {
            const formatVal = result.getBarcodeFormat();
            const formatStr = getFormatName(formatVal);
            
            // 1. Draw visual feedback immediately
            drawResultOverlay(result.getResultPoints(), formatVal);

            // 2. Small delay to let user see the frame before triggering UI
            setTimeout(() => {
                 onScanRef.current({
                    data: result.getText(),
                    format: formatStr,
                    timestamp: Date.now(),
                    type: determineType(result.getText(), formatStr),
                  });
            }, 150);
        }
      };

      try {
        setError(null);
        
        // Attempt 1: Try initializing the ideal environment (back) camera
        try {
            controls = await codeReader.decodeFromConstraints(
              { 
                video: { 
                    facingMode: { ideal: "environment" } 
                } 
              },
              videoRef.current,
              handleDecode
            );
        } catch (envError) {
            console.warn("Could not find 'environment' camera, falling back to default video device.", envError);
            
            // Attempt 2: Fallback to any available video device
            controls = await codeReader.decodeFromConstraints(
                { video: true },
                videoRef.current,
                handleDecode
            );
        }
        
        // Check for Torch Capability on the active track
        const video = videoRef.current;
        if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            const capabilities = (track.getCapabilities && track.getCapabilities()) || {};
            if ('torch' in capabilities) {
                setHasTorch(true);
            }
        }

        setHasPermission(true);
      } catch (err: any) {
        console.error("Scanner init error:", err);
        setHasPermission(false);
        
        // Detailed error messages
        if (err.name === 'NotAllowedError') {
            setError("Camera permission denied. Please check your browser settings.");
        } else if (err.name === 'NotFoundError') {
            setError("No camera device found on this device.");
        } else {
            setError("Unable to access camera: " + (err.message || "Unknown error"));
        }
      }
    };

    // Reset torch UI state when mode changes (camera re-inits)
    setTorchOn(false);
    startScanning();

    return () => {
      if (controls) {
        controls.stop();
      }
      codeReader.reset();
    };
  }, [scanMode]); // Re-run when scanMode changes

  // Frame Dimensions based on mode
  const getFrameDimensions = () => {
      switch (scanMode) {
          case 'qr': return 'w-64 h-64'; // Square
          case 'barcode': return 'w-80 h-24'; // Wide strip
          default: return 'w-72 h-48'; // Auto/Generic
      }
  };

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-6 text-center">
        <CameraOff className="w-16 h-16 text-gray-500 mb-4" />
        <h3 className="text-xl font-bold mb-2">Camera Access Issue</h3>
        <p className="text-gray-400">{error || "Please allow camera access to scan codes."}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
        {hasPermission === null && (
            <div className="absolute z-10 text-white animate-pulse flex flex-col items-center">
                <Camera className="w-8 h-8 mb-2" />
                <p>Starting Camera...</p>
            </div>
        )}

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
      />
      
      {/* Dynamic Overlay Canvas */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* Static UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
        
        <div className="absolute inset-0 bg-black/30"></div>

        {/* The Active Scanning Frame */}
        <div className={`relative ${getFrameDimensions()} transition-all duration-300 ease-in-out`}>
             {/* Corners */}
             <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 -mt-1 -ml-1 rounded-tl-lg transition-colors duration-300 ${scanMode === 'qr' ? 'border-emerald-500' : scanMode === 'barcode' ? 'border-blue-500' : 'border-white/70'}`}></div>
             <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 -mt-1 -mr-1 rounded-tr-lg transition-colors duration-300 ${scanMode === 'qr' ? 'border-emerald-500' : scanMode === 'barcode' ? 'border-blue-500' : 'border-white/70'}`}></div>
             <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 -mb-1 -ml-1 rounded-bl-lg transition-colors duration-300 ${scanMode === 'qr' ? 'border-emerald-500' : scanMode === 'barcode' ? 'border-blue-500' : 'border-white/70'}`}></div>
             <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 -mb-1 -mr-1 rounded-br-lg transition-colors duration-300 ${scanMode === 'qr' ? 'border-emerald-500' : scanMode === 'barcode' ? 'border-blue-500' : 'border-white/70'}`}></div>
             
             {/* Scan Animation */}
             {isScanning && (
                 <div className={`scan-line ${scanMode === 'barcode' ? 'opacity-80' : 'opacity-100'}`}></div>
             )}
             
             {/* Red guide line only for Barcode/Auto mode */}
             {scanMode !== 'qr' && (
                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <div className="w-11/12 h-px bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]"></div>
                </div>
             )}
        </div>

        {/* Helper Text */}
        {isScanning && (
            <div className="absolute bottom-32 left-0 right-0 text-center pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full inline-flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium">
                    {scanMode === 'qr' ? 'Align QR code in square' : 
                     scanMode === 'barcode' ? 'Align barcode with line' : 
                     'Align code within frame'}
                </span>
                </div>
            </div>
        )}
      </div>

      {/* Flash Toggle Button */}
      {hasTorch && (
        <button
          onClick={toggleTorch}
          className={`absolute top-24 right-4 z-40 p-3 rounded-full shadow-lg backdrop-blur-md border transition-all pointer-events-auto ${
            torchOn 
              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30' 
              : 'bg-black/40 text-gray-300 border-white/10 hover:bg-black/60 hover:text-white'
          }`}
          aria-label="Toggle Flashlight"
        >
          {torchOn ? <Zap className="w-6 h-6 fill-current" /> : <ZapOff className="w-6 h-6" />}
        </button>
      )}

      {/* Mode Selector */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center z-30 pointer-events-auto">
          <div className="bg-gray-900/80 backdrop-blur-lg rounded-full p-1.5 flex gap-1 border border-white/10 shadow-lg">
              <button 
                onClick={() => setScanMode('auto')}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${scanMode === 'auto' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                  <ScanLine className="w-4 h-4" />
                  Auto
              </button>
              <button 
                onClick={() => setScanMode('qr')}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${scanMode === 'qr' ? 'bg-emerald-600/90 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                  <QrCode className="w-4 h-4" />
                  QR
              </button>
              <button 
                onClick={() => setScanMode('barcode')}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${scanMode === 'barcode' ? 'bg-blue-600/90 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                  <StretchHorizontal className="w-4 h-4" />
                  Barcode
              </button>
          </div>
      </div>
    </div>
  );
};