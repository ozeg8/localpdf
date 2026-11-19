import { runCore, loadPdf } from './engine.ts';
import { PdfError, LIMITS, validateInputs, safeName } from './contracts.ts';
import type { Job, OutputFile } from './contracts.ts';
import { zipSync } from 'fflate';

// The worker has no fetch, XMLHttpRequest, WebSocket, storage or telemetry path.
// PDF rasterisation is handled by the bounded display pipeline in the UI.
self.onmessage = async (event: MessageEvent<{ job?: Job; inspect?: Job['inputs']; pack?: OutputFile[] }>) => {
  try {
    if (event.data.pack) {
      const files = event.data.pack;
      if (files.length > LIMITS.pages || files.reduce((n, f) => n + f.bytes.length, 0) > LIMITS.output) throw new PdfError('SIZE');
      const entries: Record<string, Uint8Array> = {};
      files.forEach((f, i) => { entries[`${i + 1}-${safeName(f.name)}.${f.mime === 'application/pdf' ? 'pdf' : f.mime === 'image/png' ? 'png' : 'jpg'}`] = f.bytes; });
      const bytes = zipSync(entries, { level: 0 });
      self.postMessage({ result: { name: 'localpdf-results.zip', bytes, mime: 'application/zip' } }, { transfer: [bytes.buffer as ArrayBuffer] });
      return;
    }
    if (event.data.inspect) {
      validateInputs(event.data.inspect);
      const source = await loadPdf(event.data.inspect[0].bytes);
      self.postMessage({ info: { pages: source.getPageCount() } });
      return;
    }
    if (!event.data.job) throw new PdfError('WORKER');
    const result = await runCore(event.data.job, value => self.postMessage({ progress: value }));
    const buffers = result.files.map(f => f.bytes.buffer as ArrayBuffer);
    self.postMessage({ result }, { transfer: buffers });
  } catch (error) {
    self.postMessage({ error: error instanceof PdfError ? error.code : 'PDF' });
  }
};
