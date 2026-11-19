import { PdfError } from './contracts.ts';
import type { Job, JobResult, InputFile, OutputFile } from './contracts.ts';

export function workerTask<T>(payload: { job?: Job; inspect?: InputFile[]; pack?: OutputFile[] }, signal: AbortSignal, progress?: (n: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new PdfError('CANCELLED')); return; }
    let worker: Worker;
    try { worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' }); }
    catch { reject(new PdfError('WORKER')); return; }
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); worker.terminate(); };
    const abort = () => { cleanup(); reject(new PdfError('CANCELLED')); };
    const timer = setTimeout(() => { cleanup(); reject(new PdfError('TIMEOUT')); }, 120_000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => { cleanup(); reject(new PdfError('WORKER')); };
    worker.onmessageerror = () => { cleanup(); reject(new PdfError('WORKER')); };
    worker.onmessage = event => {
      if (typeof event.data.progress === 'number') { progress?.(event.data.progress); return; }
      cleanup();
      if (event.data.error) reject(new PdfError(event.data.error));
      else resolve(event.data.result ?? event.data.info);
    };
    const inputs = payload.job?.inputs ?? payload.inspect ?? payload.pack ?? [];
    try { worker.postMessage(payload, inputs.map(input => input.bytes.buffer as ArrayBuffer)); }
    catch { cleanup(); reject(new PdfError('WORKER')); }
  });
}

export const processPdf = (job: Job, signal: AbortSignal, progress: (n: number) => void) => workerTask<JobResult>({ job }, signal, progress);
