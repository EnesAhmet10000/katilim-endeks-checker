import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a valid 1x1 or sized PNG data using pure JS buffer without heavy external deps
function createEmeraldIconPNG(size) {
  // We can create a simple uncompressed PNG with emerald green (#059669) background and white crescent/star or letter 'K'
  // Or write PNG with header and raw IDAT chunk
  const width = size;
  const height = size;

  // Simple raw BMP / PNG writer
  // Let's create an SVG first
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.22)}" fill="#0f172a"/>
    <rect x="${Math.floor(size * 0.08)}" y="${Math.floor(size * 0.08)}" width="${Math.floor(size * 0.84)}" height="${Math.floor(size * 0.84)}" rx="${Math.floor(size * 0.18)}" fill="#059669"/>
    <path d="M ${size * 0.3} ${size * 0.25} L ${size * 0.3} ${size * 0.75} M ${size * 0.3} ${size * 0.5} L ${size * 0.65} ${size * 0.25} M ${size * 0.3} ${size * 0.5} L ${size * 0.68} ${size * 0.75}" stroke="#ffffff" stroke-width="${Math.max(2, Math.floor(size * 0.12))}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="${size * 0.72}" cy="${size * 0.3}" r="${Math.max(1.5, size * 0.08)}" fill="#38bdf8"/>
  </svg>`;

  return svgContent;
}

const iconsDir = path.resolve(__dirname, '../apps/extension/public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const svg = createEmeraldIconPNG(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);
});

console.log('✅ Extension SVG icons generated.');
