import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { openRenderedPdf, boundedViewport } from '../pdf/render.ts';
import { copy } from '../i18n.ts';
import type { Language } from '../i18n.ts';
import { Icon } from './Icon.tsx';

function Thumbnail({ doc, index, label }: { doc: PDFDocumentProxy; index: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let rendering: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    void (async () => {
      try {
        const page = await doc.getPage(index + 1);
        if (disposed || !ref.current) return;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: boundedViewport(base.width, base.height, 160 / base.width) });
        const canvas = ref.current;
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw Error('canvas');
        rendering = page.render({ canvasContext: context, canvas, viewport });
        await rendering.promise;
      } catch { if (!disposed) setFailed(true); }
    })();
    return () => { disposed = true; rendering?.cancel(); };
  }, [doc, index]);
  return failed ? <span role="img" aria-label={label}>?</span> : <canvas ref={ref} role="img" aria-label={label} />;
}

export function Preview({ file, order, setOrder, lang, reorder }: { file: File; order: number[]; setOrder: (n: number[]) => void; lang: Language; reorder: boolean }) {
  const t = copy[lang];
  const [doc, setDoc] = useState<PDFDocumentProxy>();
  const [failed, setFailed] = useState(false);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let disposed = false;
    let task: ReturnType<typeof openRenderedPdf> | undefined;
    setDoc(undefined); setFailed(false); setOffset(0);
    void file.arrayBuffer().then(async bytes => {
      if (disposed) return;
      task = openRenderedPdf(new Uint8Array(bytes));
      const result = await task.promise;
      if (!disposed) setDoc(result);
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; if (task) void task.destroy(); };
  }, [file]);
  const move = (i: number, delta: number) => {
    const next = [...order];
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    setOrder(next);
  };
  if (failed) return <p role="status">{t.previewError}</p>;
  if (!doc) return <p role="status">{t.validating}</p>;
  return <section className="previews" aria-label={t.preview}>
    <div className="section-line"><strong>{t.preview}</strong><span>{order.length} {t.pages.toLowerCase()}</span></div>
    {reorder && <p className="muted text-sm">{t.previewHint}</p>}
    <div className="page-grid">{order.slice(offset, offset + 12).map((index, local) => <div className="page-card" key={index}>
      <div className="page-paper"><Thumbnail doc={doc} index={index} label={`${t.page} ${index + 1}`} /></div>
      <div className="page-controls"><span>{t.page} {index + 1}</span>{reorder && <div>
        <button type="button" className="icon-button" disabled={offset + local === 0} onClick={() => move(offset + local, -1)} aria-label={`${t.earlier}: ${index + 1}`}><Icon name="up" size={16} /></button>
        <button type="button" className="icon-button" disabled={offset + local === order.length - 1} onClick={() => move(offset + local, 1)} aria-label={`${t.later}: ${index + 1}`}><Icon name="down" size={16} /></button>
      </div>}</div>
    </div>)}</div>
    {order.length > 12 && <div className="pagination"><button type="button" disabled={!offset} onClick={() => setOffset(n => n - 12)}>{t.previous}</button><span>{Math.floor(offset / 12) + 1} / {Math.ceil(order.length / 12)}</span><button type="button" disabled={offset + 12 >= order.length} onClick={() => setOffset(n => n + 12)}>{t.next}</button></div>}
  </section>;
}
