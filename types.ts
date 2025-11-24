export interface AnalysisResult {
  safety: 'safe' | 'caution' | 'unknown' | 'danger';
  summary: string;
  category: string;
  productName?: string;
  productDetails?: string;
  sources?: { title: string; uri: string }[];
}

export interface ScanResult {
  data: string;
  format: string;
  timestamp: number;
  type: 'url' | 'text' | 'wifi' | 'product' | 'other';
  analysis?: AnalysisResult;
}

// Helper to check if format is generally 1D or 2D (optional usage in logic)
export enum FormatCategory {
  LINEAR = '1D',
  MATRIX = '2D',
  UNKNOWN = 'UNKNOWN'
}