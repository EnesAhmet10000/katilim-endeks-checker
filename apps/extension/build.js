import { build as viteBuild } from 'vite';
import { build as esbuild } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildExtension(target = 'chrome') {
  const isFirefox = target === 'firefox';
  const isSafari = target === 'safari';
  const outDir = resolve(__dirname, `dist/${target}`);

  console.log(`🔨 Building extension for ${target}...`);

  // Ensure output directory exists
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Build Popup UI with Vite
  await viteBuild({
    configFile: false,
    root: __dirname,
    base: '',
    build: {
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/popup.html')
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name].[ext]'
        }
      }
    }
  });

  // 2. Build Background Service Worker (Single bundle, fully self-contained)
  await esbuild({
    entryPoints: [resolve(__dirname, 'src/background/service-worker.ts')],
    bundle: true,
    outfile: resolve(outDir, 'background.js'),
    format: 'esm',
    target: ['chrome100', 'firefox109', 'safari15'],
    platform: 'browser',
    sourcemap: false
  });

  // 3. Build Content Script (Single bundle, IIFE format, ZERO imports)
  await esbuild({
    entryPoints: [resolve(__dirname, 'src/content/overlay-host.ts')],
    bundle: true,
    outfile: resolve(outDir, 'content.js'),
    format: 'iife',
    target: ['chrome100', 'firefox109', 'safari15'],
    platform: 'browser',
    sourcemap: false
  });

  // 4. Copy Manifest
  const manifestSrc = isFirefox
    ? resolve(__dirname, 'src/manifest.firefox.json')
    : isSafari
    ? resolve(__dirname, 'src/manifest.safari.json')
    : resolve(__dirname, 'src/manifest.json');

  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, resolve(outDir, 'manifest.json'));
  }

  // 5. Copy Icons
  const iconsSrc = resolve(__dirname, 'public/icons');
  const iconsDest = resolve(outDir, 'icons');
  if (fs.existsSync(iconsSrc)) {
    fs.mkdirSync(iconsDest, { recursive: true });
    for (const f of fs.readdirSync(iconsSrc)) {
      fs.copyFileSync(resolve(iconsSrc, f), resolve(iconsDest, f));
    }
  }

  console.log(`✅ ${target.toUpperCase()} extension built successfully in ${outDir}`);
}

const target = process.argv[2] || 'chrome';
buildExtension(target).catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
