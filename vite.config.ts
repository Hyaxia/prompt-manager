import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// Custom plugin to copy manifest and icons
const copyManifest = () => {
  return {
    name: 'copy-manifest',
    writeBundle() {
      // Copy manifest.json
      fs.copyFileSync('manifest.json', 'dist/manifest.json');
      
      // Ensure icons directory exists
      if (!fs.existsSync('dist/icons')) {
        fs.mkdirSync('dist/icons', { recursive: true });
      }
      
      // Copy icons
      fs.copyFileSync('public/icons/icon16.png', 'dist/icons/icon16.png');
      fs.copyFileSync('public/icons/icon48.png', 'dist/icons/icon48.png');
      fs.copyFileSync('public/icons/icon128.png', 'dist/icons/icon128.png');
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/manifest.json') {
          res.setHeader('Content-Type', 'application/json');
          res.end(fs.readFileSync('manifest.json'));
        } else {
          next();
        }
      });
    }
  };
};

export default defineConfig({
  plugins: [react(), copyManifest()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 3000
  }
});