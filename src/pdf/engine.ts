import { PDFDocument, StandardFonts, degrees, rgb, PDFName } from 'pdf-lib';
import { PdfError, LIMITS, fileKind, pageIndices, validateInputs, validateOrder, safeName, imageDimensions } from './contracts.ts';
import type { Job, JobResult, OutputFile } from './contracts.ts';

export async function loadPdf(bytes: Uint8Array) {
  try {
    if (fileKind(bytes) !== 'pdf') throw new PdfError('TYPE');
    const document = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true });
    if (document.isEncrypted) throw new PdfError('ENCRYPTED');
    if (!document.getPageCount()) throw new PdfError('EMPTY');
    if (document.getPageCount() > LIMITS.pages) throw new PdfError('PAGES');
    return document;
  } catch (error) {
    if (error instanceof PdfError) throw error;
    if (error instanceof Error && /encrypt|password/i.test(error.message)) throw new PdfError('ENCRYPTED');
    throw new PdfError('PDF');
  }
}

/** Rebuilt documents omit catalog JavaScript, attachments and interactive forms.
 * Page actions/annotations are removed. This is NOT a complete PDF sanitizer. */
function clearPageActions(document: PDFDocument) {
  for (const page of document.getPages()) {
    for (const key of ['AA', 'Annots', 'PresSteps']) page.node.delete(PDFName.of(key));
  }
}

export async function runCore(job: Job, progress: (value: number) => void = () => {}): Promise<JobResult> {
  validateInputs(job.inputs);
  const { tool, inputs, options } = job;
  if (tool === 'export' || (tool === 'compress' && options.rasterize)) throw new PdfError('UNSUPPORTED');
  if (tool !== 'merge' && tool !== 'images' && inputs.length !== 1) throw new PdfError('COUNT');
  if (tool === 'merge' && inputs.length < 2) throw new PdfError('COUNT');
  const before = inputs.reduce((n, f) => n + f.bytes.length, 0);
  const name = safeName(inputs[0].name);
  let output = await PDFDocument.create();
  const files: OutputFile[] = [];
  const save = async (doc: PDFDocument, filename: string) => {
    clearPageActions(doc);
    const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
    if (bytes.length + files.reduce((n, f) => n + f.bytes.length, 0) > LIMITS.output) throw new PdfError('SIZE');
    files.push({ name: filename, bytes, mime: 'application/pdf' });
  };

  if (tool === 'images') {
    for (let i = 0; i < inputs.length; i++) {
      const kind = fileKind(inputs[i].bytes);
      if (kind === 'pdf') throw new PdfError('TYPE');
      imageDimensions(inputs[i].bytes);
      try {
        const image = kind === 'png' ? await output.embedPng(inputs[i].bytes) : await output.embedJpg(inputs[i].bytes);
        if (image.width * image.height > LIMITS.pixels) throw new PdfError('IMAGE');
        const landscape = image.width > image.height;
        const [w, h] = options.pageSizes?.[i] ?? (landscape ? [841.89, 595.28] : [595.28, 841.89]);
        if (![w,h].every(n => Number.isFinite(n) && n > 0 && n <= 14400)) throw new PdfError('PAGES');
        const margin = options.pageSizes ? 0 : 48;
        const scale = Math.min((w - margin) / image.width, (h - margin) / image.height);
        const page = output.addPage([w, h]);
        page.drawImage(image, { x: (w - image.width * scale) / 2, y: (h - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
      } catch (error) { if (error instanceof PdfError) throw error; throw new PdfError('IMAGE'); }
      progress(Math.round((i + 1) / inputs.length * 85));
    }
  } else if (tool === 'merge') {
    let pages = 0;
    for (let i = 0; i < inputs.length; i++) {
      const source = await loadPdf(inputs[i].bytes);
      pages += source.getPageCount();
      if (pages > LIMITS.pages) throw new PdfError('PAGES');
      for (const page of await output.copyPages(source, source.getPageIndices())) output.addPage(page);
      progress(Math.round((i + 1) / inputs.length * 85));
    }
  } else {
    const source = await loadPdf(inputs[0].bytes);
    const count = source.getPageCount();
    const selected = pageIndices(options.pages, count);
    let indices = source.getPageIndices();
    if (tool === 'split') indices = selected;
    if (tool === 'delete') {
      if (!options.pages?.trim()) throw new PdfError('PAGES');
      indices = indices.filter(i => !selected.includes(i));
      if (!indices.length) throw new PdfError('PAGES');
    }
    if (tool === 'reorder') indices = validateOrder(options.order, count);
    if (tool === 'split' && options.separate) {
      for (let i = 0; i < indices.length; i++) {
        const single = await PDFDocument.create();
        const [page] = await single.copyPages(source, [indices[i]]);
        single.addPage(page);
        await save(single, `${name}-page-${indices[i] + 1}.pdf`);
        progress(Math.round((i + 1) / indices.length * 90));
      }
    } else {
      for (const page of await output.copyPages(source, indices)) output.addPage(page);
      if (tool === 'rotate') {
        if (![90, 180, 270].includes(options.angle ?? 90)) throw new PdfError('PAGES');
        for (const i of selected) {
          const page = output.getPage(i);
          page.setRotation(degrees((page.getRotation().angle + (options.angle ?? 90)) % 360));
        }
      }
      if (tool === 'watermark' || tool === 'number') {
        const font = await output.embedFont(StandardFonts.Helvetica);
        const text = options.text?.trim() ?? '';
        if (tool === 'watermark') {
          if (!text || text.length > 80) throw new PdfError('TEXT');
          try { font.encodeText(text); } catch { throw new PdfError('TEXT'); }
        }
        const start = options.start ?? 1;
        if (!Number.isInteger(start) || start < 1 || start > 99999) throw new PdfError('TEXT');
        for (const [i, page] of output.getPages().entries()) {
          if (!selected.includes(i)) continue;
          const { width, height } = page.getSize();
          const label = tool === 'number' ? String(start + i) : text;
          const size = tool === 'number' ? 12 : Math.min(44, (width - 48) / Math.max(font.widthOfTextAtSize(label, 1), 1));
          page.drawText(label, {
            font, size, x: Math.max(12, (width - font.widthOfTextAtSize(label, size)) / 2),
            y: tool === 'number' ? 24 : height / 2,
            color: rgb(0.25, 0.28, 0.36), opacity: tool === 'number' ? 1 : 0.25,
          });
        }
      }
    }
  }
  if (!files.length) await save(output, `${name}-${tool}.pdf`);
  let after = files.reduce((n, file) => n + file.bytes.length, 0);
  let reduced: boolean | undefined;
  if (tool === 'compress') {
    reduced = after < before;
    if (!reduced) { files[0] = { name: `${name}-original.pdf`, bytes: inputs[0].bytes, mime: 'application/pdf' }; after = before; }
  }
  progress(100);
  return { files, before, after, reduced };
}
