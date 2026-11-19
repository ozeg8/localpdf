import { deflateSync } from 'node:zlib';
import { writeFile, mkdir } from 'node:fs/promises';

// Original code-drawn icon. No external design assets or font downloads.
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let b = 0; b < 8; b++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const tag = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([tag, data])));
  return Buffer.concat([length, tag, data, crc]);
}
await mkdir(new URL('../public/icons/', import.meta.url), { recursive: true });
for (const side of [192, 512]) {
  const rows = Buffer.alloc(side * (side * 4 + 1));
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const u = x / side, v = y / side;
    let color = [36, 84, 230, 255];
    if (u > .32 && u < .68 && v > .22 && v < .78 && !(u > .55 && v < .35 && u + .22 - .55 > v)) color = [255,255,255,255];
    if (u > .55 && u < .68 && v > .22 && v < .35 && u + .22 - .55 <= v) color = [169,188,255,255];
    if (u > .40 && u < .60 && ((v > .46 && v < .49) || (v > .56 && v < .59) || (v > .66 && v < .69 && u < .54))) color = [36,84,230,255];
    const index = y * (side * 4 + 1) + 1 + x * 4;
    rows.set(color, index);
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(side); ihdr.writeUInt32BE(side, 4); ihdr[8] = 8; ihdr[9] = 6;
  await writeFile(new URL(`../public/icons/icon-${side}.png`, import.meta.url), Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]));
}
console.log('Created original 192px and 512px PWA icons.');
