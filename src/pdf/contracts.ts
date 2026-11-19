export type Tool = 'merge' | 'split' | 'compress' | 'reorder' | 'rotate' | 'delete' | 'images' | 'export' | 'watermark' | 'number';
export type InputFile = { name: string; bytes: Uint8Array };
export type OutputFile = { name: string; bytes: Uint8Array; mime: string };
export type Options = {
  pages?: string;
  order?: number[];
  angle?: number;
  text?: string;
  start?: number;
  separate?: boolean;
  format?: 'png' | 'jpeg';
  rasterize?: boolean;
  quality?: number;
  pageSizes?: [number, number][];
};
export type Job = { tool: Tool; inputs: InputFile[]; options: Options };
export type JobResult = { files: OutputFile[]; before: number; after: number; reduced?: boolean; lossy?: boolean };
export type ErrorCode = 'TYPE' | 'SIZE' | 'EMPTY' | 'COUNT' | 'PDF' | 'ENCRYPTED' | 'PAGES' | 'TEXT' | 'IMAGE' | 'CANCELLED' | 'TIMEOUT' | 'WORKER' | 'UNSUPPORTED';
export class PdfError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode) { super(code); this.name = 'PdfError'; this.code = code; }
}
export const LIMITS = { perFile: 50 * 1024 * 1024, total: 100 * 1024 * 1024, files: 20, pages: 300, pixels: 12_000_000, output: 150 * 1024 * 1024 } as const;

export function fileKind(bytes: Uint8Array): 'pdf' | 'png' | 'jpeg' {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return 'pdf';
  if ([137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b)) return 'png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpeg';
  throw new PdfError('TYPE');
}

export function validateInputs(inputs: InputFile[]) {
  if (!inputs.length || inputs.length > LIMITS.files) throw new PdfError('COUNT');
  let total = 0;
  for (const input of inputs) {
    if (!input.bytes.length) throw new PdfError('EMPTY');
    if (input.bytes.length > LIMITS.perFile) throw new PdfError('SIZE');
    total += input.bytes.length;
    fileKind(input.bytes);
  }
  if (total > LIMITS.total) throw new PdfError('SIZE');
}

/** One-based ranges; preserves explicit order, rejects duplicates and empty tokens. */
export function pageIndices(value: string | undefined, count: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > LIMITS.pages) throw new PdfError('PAGES');
  if (!value?.trim()) return Array.from({ length: count }, (_, i) => i);
  const result: number[] = [];
  for (const token of value.split(',')) {
    const match = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(token);
    if (!match) throw new PdfError('PAGES');
    const first = Number(match[1]), last = Number(match[2] ?? first);
    if (first < 1 || last > count || first > last) throw new PdfError('PAGES');
    for (let page = first; page <= last; page++) {
      if (result.includes(page - 1)) throw new PdfError('PAGES');
      result.push(page - 1);
    }
  }
  return result;
}

export function validateOrder(order: number[] | undefined, count: number) {
  if (!order || order.length !== count || new Set(order).size !== count || order.some(i => !Number.isInteger(i) || i < 0 || i >= count)) throw new PdfError('PAGES');
  return order;
}

export function safeName(name: string) {
  return (name.replace(/\.[^.]*$/, '').replace(/[^\p{L}\p{N}_-]/gu, '_').slice(0, 80) || 'document');
}

export function imageDimensions(bytes: Uint8Array) {
  const kind = fileKind(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0, height = 0;
  if (kind === 'png' && bytes.length >= 24 && String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR') {
    width = view.getUint32(16); height = view.getUint32(20);
  } else if (kind === 'jpeg') {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1];
      if (marker === 0xda || marker === 0xd9) break;
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + length + 2 > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        height = view.getUint16(offset + 5); width = view.getUint16(offset + 7); break;
      }
      offset += length + 2;
    }
  }
  if (!width || !height || width > 16384 || height > 16384 || width * height > LIMITS.pixels) throw new PdfError('IMAGE');
  return { width, height };
}
