import { openRenderedPdf, boundedViewport } from './render.ts';
import { processPdf } from './client.ts';
import { LIMITS, PdfError, pageIndices, safeName, validateInputs, fileKind } from './contracts.ts';
import type { Job, JobResult, OutputFile, InputFile } from './contracts.ts';

export async function runRaster(job: Job, signal: AbortSignal, progress: (n: number) => void): Promise<JobResult> {
  if (job.inputs.length !== 1) throw new PdfError('COUNT');
  validateInputs(job.inputs);
  const original = job.inputs[0];
  if (fileKind(original.bytes) !== 'pdf') throw new PdfError('TYPE');
  const before = original.bytes.length;
  const task = openRenderedPdf(original.bytes);
  const abort = () => { void task.destroy(); };
  signal.addEventListener('abort', abort, { once: true });
  const files: OutputFile[] = [];
  let allocated = 0;
  const pageSizes: [number, number][] = [];
  try {
    if (signal.aborted) throw new PdfError('CANCELLED');
    const doc = await task.promise;
    if (doc.numPages > LIMITS.pages) throw new PdfError('PAGES');
    const indices = pageIndices(job.tool === 'export' ? job.options.pages : undefined, doc.numPages);
    // Rebuilding an image PDF retains compressed page images until save.
    if (job.tool === 'compress' && indices.length > LIMITS.files) throw new PdfError('COUNT');
    for (const [i, index] of indices.entries()) {
      if (signal.aborted) throw new PdfError('CANCELLED');
      const page = await doc.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      pageSizes.push([base.width, base.height]);
      const scale = boundedViewport(base.width, base.height, job.tool === 'compress' ? 1 : 1.5);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new PdfError('UNSUPPORTED');
      try {
        await page.render({ canvasContext: context, canvas, viewport, background: 'rgb(255,255,255)' }).promise;
        const format = job.tool === 'compress' ? 'jpeg' : (job.options.format ?? 'png');
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new PdfError('IMAGE')), `image/${format}`, job.tool === 'compress' ? 0.65 : 0.9));
        allocated += blob.size;
        if (allocated > Math.min(LIMITS.output, LIMITS.total)) throw new PdfError('SIZE');
        files.push({ name: `${safeName(original.name)}-page-${index + 1}.${format === 'jpeg' ? 'jpg' : 'png'}`, bytes: new Uint8Array(await blob.arrayBuffer()), mime: `image/${format}` });
      } finally { canvas.width = 0; canvas.height = 0; page.cleanup(); }
      progress(Math.round((i + 1) / indices.length * 80));
    }
    if (job.tool === 'compress') {
      const imageInputs: InputFile[] = files.map(f => ({ name: f.name, bytes: f.bytes }));
      const result = await processPdf({ tool: 'images', inputs: imageInputs, options: { pageSizes } }, signal, n => progress(80 + Math.round(n * 0.2)));
      const reduced = result.after < before;
      return { files: reduced ? [{ ...result.files[0], name: `${safeName(original.name)}-compressed.pdf` }] : [{ ...original, mime: 'application/pdf', name: `${safeName(original.name)}-original.pdf` }], before, after: reduced ? result.after : before, reduced, lossy: reduced };
    }
    progress(100);
    return { files, before, after: allocated };
  } catch (error) {
    if (signal.aborted) throw new PdfError('CANCELLED');
    if (error instanceof PdfError) throw error;
    throw new PdfError('PDF');
  } finally { signal.removeEventListener('abort', abort); await task.destroy(); }
}
