import { createHash } from 'node:crypto';

// Synthetic PDF 1.4 standard-security R2 fixture. Legacy 40-bit encryption is
// used ONLY to test rejection; it is not an encryption feature or recommendation.
const padding = Buffer.from('28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a', 'hex');
const md5 = (data: Uint8Array) => createHash('md5').update(data).digest();
const pad = (password: string) => Buffer.concat([Buffer.from(password, 'latin1'), padding]).subarray(0, 32);
function rc4(key: Uint8Array, data: Uint8Array) {
  const state = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) { j = (j + state[i] + key[i % key.length]) & 255; [state[i], state[j]] = [state[j], state[i]]; }
  let i = 0; j = 0;
  return Buffer.from(data.map(byte => { i = (i + 1) & 255; j = (j + state[i]) & 255; [state[i], state[j]] = [state[j], state[i]]; return byte ^ state[(state[i] + state[j]) & 255]; }));
}
export function encryptedFixture() {
  const id = md5(Buffer.from('LocalPDF synthetic encryption test'));
  const owner = rc4(md5(pad('synthetic-owner')).subarray(0, 5), pad('localpdf-test'));
  const permissions = Buffer.alloc(4); permissions.writeInt32LE(-4);
  const key = md5(Buffer.concat([pad('localpdf-test'), owner, permissions, id])).subarray(0, 5);
  const user = rc4(key, padding);
  const streamKey = md5(Buffer.concat([key, Buffer.from([4,0,0,0,0])])).subarray(0, 10);
  const stream = rc4(streamKey, Buffer.from('BT /F1 12 Tf 20 200 Td (LocalPDF encrypted fixture) Tj ET'));
  const objects = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>'),
    Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`), stream, Buffer.from('\nendstream')]),
    Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),
    Buffer.from(`<< /Filter /Standard /V 1 /R 2 /Length 40 /O <${owner.toString('hex')}> /U <${user.toString('hex')}> /P -4 >>`),
  ];
  const chunks = [Buffer.from('%PDF-1.4\n')];
  const offsets: number[] = [];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const bytes = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from('\nendobj\n')]);
    chunks.push(bytes); length += bytes.length;
  });
  const xref = length;
  chunks.push(Buffer.from(`xref\n0 7\n0000000000 65535 f \n${offsets.map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 7 /Root 1 0 R /Encrypt 6 0 R /ID [<${id.toString('hex')}><${id.toString('hex')}>] >>\nstartxref\n${xref}\n%%EOF\n`));
  return new Uint8Array(Buffer.concat(chunks));
}
