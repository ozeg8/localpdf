import { useEffect, useState } from 'react';
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function usePwa() {
  const [online, setOnline] = useState(navigator.onLine);
  const [ready, setReady] = useState(false);
  const [cacheError, setCacheError] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker>();
  const [prompt, setPrompt] = useState<InstallPrompt>();
  useEffect(() => {
    const change = () => setOnline(navigator.onLine);
    const install = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt); };
    window.addEventListener('online', change); window.addEventListener('offline', change);
    window.addEventListener('beforeinstallprompt', install);
    let disposed = false;
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
        const report = () => { if (!disposed && reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting); };
        report();
        const watch = () => {
          const installing = reg.installing;
          installing?.addEventListener('statechange', () => {
            report();
            if (!disposed && installing.state === 'redundant' && !reg.active) setCacheError(true);
          });
        };
        watch(); reg.addEventListener('updatefound', watch);
        return navigator.serviceWorker.ready;
      }).then(async () => {
        // Readiness is backed by the service worker's completed cache, not by navigator.onLine.
        const keys = await caches.keys();
        if (!disposed) setReady(keys.some(key => key.startsWith('localpdf-')));
      }).catch(() => { if (!disposed) setCacheError(true); });
    }
    return () => { disposed = true; window.removeEventListener('online', change); window.removeEventListener('offline', change); window.removeEventListener('beforeinstallprompt', install); };
  }, []);
  return { online, ready, cacheError, waiting,
    install: prompt ? async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(undefined); } : undefined,
    update: () => { navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true }); waiting?.postMessage({ type: 'ACTIVATE' }); },
  };
}
