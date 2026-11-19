import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { LIMITS, PdfError } from './contracts.ts';

GlobalWorkerOptions.workerSrc = workerUrl;

export function openRenderedPdf(bytes: Uint8Array) {
  return getDocument({
    data: bytes.slice(),
    // PDF.js 6 removed isEvalSupported; JavaScript eval is also forbidden by CSP.
    enableXfa: false,
    useSystemFonts: true,
    // Raster display only. No annotation layer, scripting manager or links.
    cMapUrl: '/pdf-assets/cmaps/', cMapPacked: true,
    standardFontDataUrl: '/pdf-assets/standard_fonts/',
    wasmUrl: '/pdf-assets/wasm/',
    iccUrl: '/pdf-assets/iccs/',
  });
}

export function boundedViewport(width: number, height: number, scale: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new PdfError('PDF');
  return Math.min(scale, Math.sqrt(LIMITS.pixels / (width * height)), 4096 / width, 4096 / height);
}
