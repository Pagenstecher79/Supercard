import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.js',
      name: 'Supercard',
      fileName: 'supercard',
      formats: ['es']
    },
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [
    viteCompression({
      algorithm: 'gzip',   
      ext: '.gz',         
      threshold: 1024,     
      deleteOriginFile: false 
    })
  ]
});