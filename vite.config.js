import { defineConfig } from 'vite';

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
  }
});
