const paths: Record<string, string> = {
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
  shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z M8 12l3 3 5-6',
  merge: 'M5 3v5c0 3 7 3 7 7v6 M19 3v5c0 3-7 3-7 7 M8 17l4 4 4-4',
  split: 'M12 21v-5c0-4-7-4-7-7V3 M12 16c0-4 7-4 7-7V3 M2 6l3-3 3 3 M16 6l3-3 3 3',
  compress: 'M3 8h5V3 M21 16h-5v5 M8 8 2 2 M16 16l6 6 M16 3v5h5 M8 21v-5H3 M16 8l6-6 M8 16l-6 6',
  image: 'M3 3h18v18H3z M3 17l5-5 5 5 3-3 5 5 M8 8h.01',
  export: 'M14 2H6a2 2 0 0 0-2 2v16h16V8z M14 2v6h6 M8 16l3-3 4 4',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  rotate: 'M3 10a9 9 0 1 1 2 8 M3 4v6h6',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  watermark: 'M5 21h14 M8 17h8l-1-6a4 4 0 1 0-6 0z',
  number: 'M5 8h14 M4 16h14 M10 3 8 21 M17 3l-2 18',
  upload: 'M12 16V3 M7 8l5-5 5 5 M4 16v5h16v-5',
  download: 'M12 3v13 M7 11l5 5 5-5 M4 17v4h16v-4',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1',
  moon: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10',
  check: 'M5 12l4 4L19 6', lock: 'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
  code: 'M8 5 2 12l6 7 M16 5l6 7-6 7 M14 3l-4 18',
  plus: 'M12 4v16 M4 12h16', close: 'M6 6l12 12 M6 18 18 6',
  up: 'M12 20V4 M5 11l7-7 7 7', down: 'M12 4v16 M5 13l7 7 7-7',
  globe: 'M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0 M3 12h18 M12 3c-5 5-5 13 0 18 M12 3c5 5 5 13 0 18',
};
export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.file} /></svg>;
}
