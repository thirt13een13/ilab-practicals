import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',          // index.html is at the project root
  server: {
    open: true,       // open the browser automatically on `npm run dev`
  },
  build: {
    outDir: 'dist',
  },
});
