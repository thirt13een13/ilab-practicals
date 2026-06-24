import { defineConfig } from 'vite';

export default defineConfig({
  // index.html is at the project root — Vite default, no change needed.
  // Resolve `three/addons/` to the jsm examples folder in the npm package.
  resolve: {
    alias: {
      'three/addons/': 'three/examples/jsm/',
    },
  },
  server: {
    open: true,   // open browser automatically on `npm run dev`
  },
});
