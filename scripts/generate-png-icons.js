import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crcBuf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  chunk.writeUInt32BE(crc32(crcBuf), 8 + len);
  return chunk;
}

function createEmeraldPNG(width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image scanlines (RGBA)
  // Emerald green #059669 (5, 150, 105), Dark blue #0f172a (15, 23, 42)
  const scanlines = [];
  for (let y = 0; y < height; y++) {
    scanlines.push(0); // Filter byte: 0 (None)
    for (let x = 0; x < width; x++) {
      // Create rounded square with emerald green & inner white K pattern
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const isLetter = (x >= width * 0.25 && x <= width * 0.35 && y >= height * 0.2 && y <= height * 0.8) ||
                       (Math.abs((x - width * 0.3) - (y - height * 0.5)) < width * 0.08 && x >= width * 0.3 && y <= height * 0.5) ||
                       (Math.abs((x - width * 0.3) + (y - height * 0.5)) < width * 0.08 && x >= width * 0.3 && y >= height * 0.5);

      if (isLetter) {
        scanlines.push(255, 255, 255, 255); // White letter
      } else if (isBorder) {
        scanlines.push(15, 23, 42, 255); // Dark navy border
      } else {
        scanlines.push(5, 150, 105, 255); // Emerald green fill
      }
    }
  }

  const rawData = Buffer.from(scanlines);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve(__dirname, '../apps/extension/public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuf = createEmeraldPNG(size, size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngBuf);
});

console.log('✅ Generated valid PNG icons: icon16.png, icon48.png, icon128.png');
