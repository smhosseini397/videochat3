const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, drawFn) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crcVal = crc32(typeAndData);
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

// Drawing logic: Emerald rounded background with phone & camera
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const rCorner = w * 0.22;
  const margin = w * 0.08;

  // Squircle distance check
  const dx = Math.max(0, Math.abs(x - cx) - (cx - margin - rCorner));
  const dy = Math.max(0, Math.abs(y - cy) - (cy - margin - rCorner));
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > rCorner) {
    return [0, 0, 0, 0]; // transparent outside squircle
  }

  // Emerald gradient from #10b981 to #047857
  const t = y / h;
  let red = Math.floor(16 + (4 - 16) * t);
  let green = Math.floor(185 + (120 - 185) * t);
  let blue = Math.floor(129 + (87 - 129) * t);

  // Center phone silhouette / handset approximation
  const nx = (x - cx) / (w * 0.4);
  const ny = (y - cy) / (h * 0.4);
  const phoneDist = Math.sqrt(nx * nx + ny * ny);

  // Phone circle ring in center
  if (phoneDist >= 0.35 && phoneDist <= 0.65) {
    return [255, 255, 255, 240];
  }
  // Center dot / receiver
  if (phoneDist < 0.2) {
    return [255, 255, 255, 255];
  }

  return [red, green, blue, 255];
}

const pubDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), createPng(192, 192, drawIcon));
fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), createPng(512, 512, drawIcon));
fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), createPng(512, 512, drawIcon));
fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), createPng(180, 180, drawIcon));
fs.writeFileSync(path.join(pubDir, 'favicon.ico'), createPng(32, 32, drawIcon));

console.log('PNG Icons successfully generated in public/');
