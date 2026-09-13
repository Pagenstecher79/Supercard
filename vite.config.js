import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.js',
      name: 'GaugeStudio',
      fileName: 'gauge-studio',
      formats: ['es']
    },
    outDir: 'dist',
    emptyOutDir: true
  }
});
