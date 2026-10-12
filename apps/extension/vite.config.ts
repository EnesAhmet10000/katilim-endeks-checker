import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const isFirefox = mode === 'firefox';
  const isSafari = mode === 'safari';

  const outDirRel = isFirefox ? 'dist/firefox' : isSafari ? 'dist/safari' : 'dist/chrome';
  const outDir = resolve(__dirname, outDirRel);

  return {
    base: '',
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/popup.html'),
          background: resolve(__dirname, 'src/background/service-worker.ts'),
          content: resolve(__dirname, 'src/content/overlay-host.ts')
        },
        output: {
          entryFileNames: chunk => {
            if (chunk.name === 'background') return 'background.js';
            if (chunk.name === 'content') return 'content.js';
            return 'assets/[name].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name].[ext]'
        }
      }
    },
    plugins: [
      {
        name: 'copy-manifest-and-assets',
        closeBundle() {
          if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
          }

          const manifestFile = isFirefox
            ? resolve(__dirname, 'src/manifest.firefox.json')
            : isSafari
            ? resolve(__dirname, 'src/manifest.safari.json')
            : resolve(__dirname, 'src/manifest.json');

          if (fs.existsSync(manifestFile)) {
            fs.copyFileSync(manifestFile, resolve(outDir, 'manifest.json'));
          }

          // Copy icons if present
          const publicIcons = resolve(__dirname, 'public/icons');
          const destIcons = resolve(outDir, 'icons');
          if (fs.existsSync(publicIcons)) {
            if (!fs.existsSync(destIcons)) fs.mkdirSync(destIcons, { recursive: true });
            const files = fs.readdirSync(publicIcons);
            for (const f of files) {
              fs.copyFileSync(resolve(publicIcons, f), resolve(destIcons, f));
            }
          }
        }
      }
    ]
  };
});
