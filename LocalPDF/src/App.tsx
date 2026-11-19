import { useEffect, useRef, useState } from 'react';
import { copy, tools, errorMessage } from './i18n.ts';
import type { Language } from './i18n.ts';
import { Icon } from './components/Icon.tsx';
import { Preview } from './components/Preview.tsx';
import { usePwa } from './pwa.ts';
import { fileKind, LIMITS, PdfError } from './pdf/contracts.ts';
import type { Tool, Options, JobResult, OutputFile } from './pdf/contracts.ts';
import { processPdf, workerTask } from './pdf/client.ts';
import { runRaster } from './pdf/raster.ts';
import { samplePdf } from './pdf/sample.ts';

type Selected = { file: File; kind: 'pdf' | 'png' | 'jpeg'; id: string };
const size = (n: number) => n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
function stored(key: string, fallback: string) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }

export default function App() {
  const [lang, setLang] = useState<Language>(() => stored('localpdf-language', navigator.language.startsWith('tr') ? 'tr' : 'en') === 'tr' ? 'tr' : 'en');
  const [dark, setDark] = useState(() => stored('localpdf-theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') === 'dark');
  const [view, setView] = useState<'tools' | 'privacy'>('tools');
  const [category, setCategory] = useState('all');
  const [files, setFiles] = useState<Selected[]>([]);
  const [tool, setTool] = useState<Tool>('merge');
  const [options, setOptions] = useState<Options>({ angle: 90, format: 'png', start: 1 });
  const [order, setOrder] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<(JobResult & { download: string; name: string })>();
  const [installHelp, setInstallHelp] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const adding = useRef(false);
  const requestedTool = useRef<Tool | null>(null);
  const workspace = useRef<HTMLElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const pwa = usePwa();
  const t = copy[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('localpdf-language', lang); localStorage.setItem('localpdf-theme', dark ? 'dark' : 'light'); } catch { /* Preferences are optional. Documents are never stored. */ }
  }, [lang, dark]);
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => { return () => { if (result) URL.revokeObjectURL(result.download); }; }, [result]);
  useEffect(() => { if (result) resultHeading.current?.focus(); }, [result]);

  const firstFile = files[0]?.file;
  const firstKind = files[0]?.kind;
  useEffect(() => {
    if (!files.length) return;
    const compatible = firstKind !== 'pdf' ? tool === 'images' : files.length > 1 ? tool === 'merge' : !['images','merge'].includes(tool);
    if (!compatible) setTool(firstKind !== 'pdf' ? 'images' : files.length > 1 ? 'merge' : 'compress');
  }, [files.length, firstKind, tool]);
  useEffect(() => {
    setOrder([]);
    if (!firstFile || firstKind !== 'pdf') return;
    const abort = new AbortController();
    void firstFile.arrayBuffer().then(bytes => workerTask<{ pages: number }>({ inspect: [{ name: firstFile.name, bytes: new Uint8Array(bytes) }] }, abort.signal)).then(info => {
      if (!abort.signal.aborted) setOrder(Array.from({ length: info.pages }, (_, i) => i));
    }).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e, lang)); });
    return () => abort.abort();
    // Language changes must not reparse a document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstFile, firstKind]);

  async function addFiles(picked: File[]) {
    if (!picked.length || busy || adding.current) return;
    adding.current = true; setChecking(true); setError('');
    try {
      if (files.length + picked.length > LIMITS.files) throw new PdfError('COUNT');
      if ([...files.map(f => f.file), ...picked].reduce((n, f) => n + f.size, 0) > LIMITS.total) throw new PdfError('SIZE');
      const selected: Selected[] = [];
      for (const file of picked) {
        if (!file.size) throw new PdfError('EMPTY');
        if (file.size > LIMITS.perFile) throw new PdfError('SIZE');
        const kind = fileKind(new Uint8Array(await file.slice(0, 32).arrayBuffer()));
        // MIME and extensions are advisory; magic bytes decide the supported format.
        selected.push({ file, kind, id: crypto.randomUUID() });
      }
      const combined = [...files, ...selected];
      if (combined.some(f => f.kind === 'pdf') && combined.some(f => f.kind !== 'pdf')) throw new PdfError('TYPE');
      setFiles(combined); setResult(undefined); setOptions({ angle: 90, format: 'png', start: 1 });
      const requested = requestedTool.current;
      const compatible = requested && (combined[0].kind !== 'pdf' ? requested === 'images' : combined.length > 1 ? requested === 'merge' : !['images','merge'].includes(requested));
      setTool(requested && compatible ? requested : combined[0].kind !== 'pdf' ? 'images' : combined.length > 1 ? 'merge' : 'compress');
      requestedTool.current = null;
      setView('tools');
      requestAnimationFrame(() => workspace.current?.scrollIntoView({ behavior: 'instant', block: 'start' }));
    } catch (e) { setError(errorMessage(e, lang)); }
    finally { adding.current = false; setChecking(false); if (input.current) input.current.value = ''; }
  }

  function selectTool(id: Tool) {
    if (busy || checking) return;
    setTool(id); setError(''); setResult(undefined); setOptions({ angle: 90, format: 'png', start: 1 });
    if (order.length) setOrder(old => [...old].sort((a,b) => a - b));
    if (!files.length) { requestedTool.current = id; input.current?.click(); }
    else workspace.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  function reset() { if (busy || checking) return; setFiles([]); setResult(undefined); setError(''); setOrder([]); }
  function moveFile(index: number, delta: number) {
    const next = [...files];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setFiles(next); setResult(undefined);
  }
  async function run() {
    if (busy || checking || !files.length) return;
    const abort = new AbortController(); controller.current = abort;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; abort.abort(); }, 120_000);
    setBusy(true); setError(''); setResult(undefined); setProgress(0);
    try {
      const inputs = [];
      for (const selected of files) {
        if (abort.signal.aborted) throw new PdfError('CANCELLED');
        inputs.push({ name: selected.file.name, bytes: new Uint8Array(await selected.file.arrayBuffer()) });
      }
      const job = { tool, inputs, options: { ...options, order } };
      const processed = tool === 'export' || (tool === 'compress' && options.rasterize)
        ? await runRaster(job, abort.signal, setProgress)
        : await processPdf(job, abort.signal, setProgress);
      let downloadFile: OutputFile = processed.files[0];
      if (processed.files.length > 1) downloadFile = await workerTask<OutputFile>({ pack: processed.files }, abort.signal);
      if (abort.signal.aborted) throw new PdfError('CANCELLED');
      const download = URL.createObjectURL(new Blob([new Uint8Array(downloadFile.bytes).buffer], { type: downloadFile.mime }));
      // Retain only the download blob, not another full set of result buffers.
      setResult({ ...processed, after: downloadFile.bytes.length, files: [], download, name: downloadFile.name });
    } catch (e) { setError(errorMessage(timedOut ? new PdfError('TIMEOUT') : e, lang)); }
    finally { clearTimeout(timer); setBusy(false); controller.current = null; }
  }
  const matching = (id: Tool) => !files.length || (firstKind !== 'pdf' ? id === 'images' : files.length > 1 ? id === 'merge' : !['images', 'merge'].includes(id));
  const recommended: Tool[] = firstKind !== 'pdf' ? ['images'] : files.length > 1 ? ['merge'] : ['compress', 'split', 'rotate', 'reorder'];
  const activeTool = tools.find(item => item.id === tool)!;
  const updateOptions = (value: Partial<Options>) => { setOptions(old => ({ ...old, ...value })); setResult(undefined); };

  return <div className="app-shell">
    <a className="skip-link" href="#main">{lang === 'tr' ? 'İçeriğe geç' : 'Skip to content'}</a>
    <aside className="sidebar">
      <button className="brand" onClick={() => { setView('tools'); setCategory('all'); }} aria-label="LocalPDF"><img src="/icon.svg" width="38" height="38" alt="" /><span>Local<span className="brand-accent">PDF</span><small>PRIVACY FIRST</small></span></button>
      <div className="sidebar-caption">{lang === 'tr' ? 'ÇALIŞMA ALANIN' : 'YOUR WORKSPACE'}</div>
      <nav aria-label={lang === 'tr' ? 'Ana menü' : 'Main navigation'}>
        <button className={view === 'tools' ? 'nav-item active' : 'nav-item'} onClick={() => setView('tools')}><Icon name="grid" size={19} />{t.all}<span className="nav-count">10</span></button>
        <button className={view === 'privacy' ? 'nav-item active' : 'nav-item'} onClick={() => setView('privacy')}><Icon name="shield" size={19} />{t.privacy}</button>
      </nav>
      <div className="sidebar-bottom"><div className="local-note"><span className="local-note-icon"><Icon name="lock" size={20} /></span><strong>{t.local}</strong><p>{lang === 'tr' ? 'İşlem için internet değil, yalnızca tarayıcın yeter.' : 'All you need is your browser. No connection required to process files.'}</p></div><button className="install-button" onClick={() => pwa.install ? void pwa.install() : setInstallHelp(n => !n)}><Icon name="download" size={17} />{t.install}</button>{installHelp && <p className="text-sm muted" role="status">{t.installHelp}</p>}<span className="version">LocalPDF · v0.1.0</span></div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><span className="browser-badge"><Icon name="shield" size={16} />{pwa.online ? t.online : t.offline}</span><div className="top-actions"><button className="language-button" onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')} aria-label={t.language}><Icon name="globe" size={17} />{lang.toUpperCase()}</button><span className="divider" /><button className="icon-button" onClick={() => setDark(n => !n)} aria-label={dark ? t.light : t.dark}><Icon name={dark ? 'sun' : 'moon'} size={20} /></button></div></header>
      <main id="main">
        <input ref={input} type="file" hidden data-testid="file-input" multiple accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" aria-label={t.choose} disabled={busy || checking} onChange={e => void addFiles(Array.from(e.target.files ?? []))} />
        {pwa.waiting && <div className="update-banner" role="status">{t.update}. <button disabled={files.length > 0 || busy} onClick={pwa.update}>{t.updateAction}</button></div>}
        {view === 'privacy' ? <section className="privacy-page">
          <span className="eyebrow">PRIVACY VERIFICATION</span><h1>{t.verifyTitle}</h1><p className="lead">{t.verifyIntro}</p>
          <div className={`offline-status ${pwa.ready ? 'is-ready' : ''}`} role="status"><Icon name={pwa.ready ? 'check' : 'shield'} />{pwa.cacheError ? t.cacheError : pwa.ready ? t.cacheReady : t.cachePending}</div>
          {[['offlineTitle', 'offlineSteps', 'lock'], ['networkTitle', 'networkSteps', 'shield'], ['sourceTitle', 'sourceSteps', 'code']].map(([title, body, icon]) => <article className="verification-card" key={title}><Icon name={icon} /><div><h2>{t[title as 'offlineTitle']}</h2><p>{t[body as 'offlineSteps']}</p>{title === 'offlineTitle' && <button className="secondary" onClick={() => void addFiles([samplePdf()])}>{t.sample}</button>}</div></article>)}
          <p className="privacy-limit">{t.limits}</p><button className="text-button" onClick={() => setView('tools')}>{t.back}</button>
        </section> : <>
          {!files.length && <section className="hero"><div className="eyebrow"><span />{t.eyebrow}</div><h1>{t.title}<br /><span>{t.titleAccent}</span></h1><p className="hero-intro">{t.intro}</p>
            <div className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); void addFiles(Array.from(e.dataTransfer.files)); }}>
              <div className="document-art" aria-hidden="true"><div className="art-sheet art-sheet-back" /><div className="art-sheet art-sheet-front"><Icon name="file" size={33} /><span>PDF</span></div><span className="art-lock"><Icon name="lock" size={15} /></span></div>
              <h2>{t.drop}</h2><p>{t.or}</p><button className="primary choose-button" disabled={checking} onClick={() => input.current?.click()}><Icon name="plus" size={20} />{checking ? t.validating : t.choose}</button><span className="formats">{t.formats}</span>
            </div><button className="sample-button" disabled={checking} onClick={() => void addFiles([samplePdf()])}><Icon name="file" size={15} />{t.sample}</button>
          </section>}

          {error && <div className="error-message" role="alert">{error}<button className="icon-button" onClick={() => setError('')} aria-label={lang === 'tr' ? 'Mesajı kapat' : 'Dismiss message'}><Icon name="close" size={18} /></button></div>}

          {files.length > 0 && <section className="workspace" ref={workspace} aria-labelledby="workspace-title">
            <div className="workspace-heading"><div><span className="eyebrow">{t.workspace}</span><h1 id="workspace-title">{activeTool[lang][0]}</h1></div><button className="text-button" disabled={busy || checking} onClick={reset}>{t.clear}</button></div>
            <div className="file-list">{files.map((selected, index) => <div className="file-row" key={selected.id}><span className="file-icon"><Icon name={selected.kind === 'pdf' ? 'file' : 'image'} /></span><div className="file-name"><strong>{selected.file.name}</strong><span>{size(selected.file.size)}{files.length === 1 && order.length > 0 ? ` · ${order.length} ${t.pages.toLowerCase()}` : ''}</span></div><div className="file-actions"><button className="icon-button" disabled={busy || checking || index === 0} onClick={() => moveFile(index, -1)} aria-label={`${t.earlier}: ${selected.file.name}`}><Icon name="up" size={17} /></button><button className="icon-button" disabled={busy || checking || index === files.length - 1} onClick={() => moveFile(index, 1)} aria-label={`${t.later}: ${selected.file.name}`}><Icon name="down" size={17} /></button><button className="icon-button" disabled={busy || checking} onClick={() => { setFiles(old => old.filter(f => f.id !== selected.id)); setResult(undefined); setError(''); }} aria-label={`${t.remove}: ${selected.file.name}`}><Icon name="close" size={18} /></button></div></div>)}</div>
            <button className="text-button add-button" disabled={busy || checking} onClick={() => input.current?.click()}><Icon name="plus" size={17} />{t.add}</button>
            <p className="recommend-label">{t.recommend}</p><div className="tool-pills">{tools.filter(item => matching(item.id)).sort((a, b) => Number(recommended.includes(b.id)) - Number(recommended.includes(a.id))).map(item => <button className={tool === item.id ? 'tool-pill selected' : 'tool-pill'} disabled={busy || checking} onClick={() => selectTool(item.id)} key={item.id}><Icon name={item.icon} size={18} />{item[lang][0]}</button>)}</div>
            <fieldset className="tool-options" disabled={busy || checking}><legend className="sr-only">{activeTool[lang][0]}</legend>
              {['split', 'delete', 'rotate', 'watermark', 'number', 'export'].includes(tool) && <label>{t.range}<input data-testid="page-range" value={options.pages ?? ''} placeholder="1,3-5" onChange={e => updateOptions({ pages: e.target.value })} inputMode="text" /><small>{tool === 'delete' ? t.deleteHint : t.rangeHint}</small></label>}
              {tool === 'split' && <label className="checkbox-label"><input type="checkbox" checked={options.separate ?? false} onChange={e => updateOptions({ separate: e.target.checked })} />{t.separate}</label>}
              {tool === 'rotate' && <label>{t.angle}<select aria-label={t.angle} value={options.angle ?? 90} onChange={e => updateOptions({ angle: Number(e.target.value) })}><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label>}
              {tool === 'export' && <label>{t.format}<select aria-label={t.format} value={options.format ?? 'png'} onChange={e => updateOptions({ format: e.target.value as 'png' | 'jpeg' })}><option value="png">PNG</option><option value="jpeg">JPG</option></select></label>}
              {tool === 'watermark' && <label>{t.text}<input data-testid="watermark-text" value={options.text ?? ''} maxLength={80} placeholder="CONFIDENTIAL" onChange={e => updateOptions({ text: e.target.value })} /><small>{t.textHint}</small></label>}
              {tool === 'number' && <label>{t.start}<input type="number" min="1" max="99999" value={options.start ?? 1} onChange={e => updateOptions({ start: Number(e.target.value) })} /></label>}
              {tool === 'compress' && <><label className="checkbox-label"><input type="checkbox" checked={options.rasterize ?? false} onChange={e => updateOptions({ rasterize: e.target.checked })} />{t.raster}</label><p className="option-note">{t.rasterHint}</p></>}
              {files.length === 1 && firstKind === 'pdf' && order.length > 0 && <Preview file={files[0].file} order={order} setOrder={value => { setOrder(value); setResult(undefined); }} lang={lang} reorder={tool === 'reorder'} />}
            </fieldset>
            <p className="output-note">{t.rebuilt}</p>
            {!result && <div className="run-row"><button className="primary" data-testid="process" disabled={busy || checking || !matching(tool) || (firstKind === 'pdf' && !order.length)} onClick={() => void run()}>{busy ? t.processing : (firstKind === 'pdf' && !order.length) ? t.validating : t.run}</button>{busy && <><progress aria-label={t.processing} value={progress} max={100} /><button className="text-button" onClick={() => controller.current?.abort()}>{t.cancel}</button></>}</div>}
            {result && <section className="result-panel" aria-label={t.ready}><span className="result-check"><Icon name="check" size={28} /></span><div><h2 ref={resultHeading} tabIndex={-1}>{result.reduced === false ? t.unchanged : t.ready}</h2><p>{result.reduced === false ? '' : t.success}</p><div className="size-comparison"><span>{t.before}: {size(result.before)}</span><span>{t.after}: {size(result.after)}</span>{result.reduced && <strong>{t.saved}: {Math.round((1 - result.after / result.before) * 100)}%</strong>}</div>{result.lossy && <p className="option-note">{t.lossy}</p>}<a className="primary download-button" data-testid="download" href={result.download} download={result.name}><Icon name="download" size={18} />{t.download}</a><button className="text-button" onClick={() => setResult(undefined)}>{t.newTask}</button></div></section>}
          </section>}

          <section className="tools-section" aria-labelledby="tools-heading"><div className="section-line"><div><h2 id="tools-heading">{t.popular}</h2><p>{t.toolIntro}</p></div><span className="free-label">{t.free}</span></div><div className="category-tabs" role="group" aria-label={lang === 'tr' ? 'Araç kategorileri' : 'Tool categories'}>{(['all', 'organize', 'convert', 'edit'] as const).map(id => <button aria-pressed={category === id} onClick={() => setCategory(id)} key={id}>{t[id]}</button>)}</div><div className="tools-grid">{tools.filter(item => category === 'all' || item.category === category).map(item => <button key={item.id} className={`tool-card ${item.category}`} disabled={busy || checking || !matching(item.id)} onClick={() => selectTool(item.id)}><span className="tool-icon"><Icon name={item.icon} size={25} /></span><h3>{item[lang][0]}</h3><p>{item[lang][1]}</p></button>)}</div></section>

          <section className="trust-section"><div className="trust-heading"><Icon name="shield" size={28} /><h2>{t.trustTitle}</h2><p>{t.trustSubtitle}</p></div><div className="trust-grid">{[['noUpload', 'noUploadText', 'lock'], ['onDevice', 'onDeviceText', 'shield'], ['open', 'openText', 'code']].map(([title, body, icon]) => <article key={title}><Icon name={icon} size={23} /><h3>{t[title as 'noUpload']}</h3><p>{t[body as 'noUploadText']}</p></article>)}</div><button className="text-button" onClick={() => { setView('privacy'); window.scrollTo(0, 0); }}>{t.privacy}</button></section>
        </>}
      </main><footer><span>{t.footer}</span><span>{t.footerNote}</span></footer>
    </div>
  </div>;
}
