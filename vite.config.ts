import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill process.env.API_KEY for compatibility with the existing code
    'process.env.API_KEY': 'import.meta.env.VITE_API_KEY'
  }
});