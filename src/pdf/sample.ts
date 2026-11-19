// Synthetic, non-personal fixture generated on device. No downloadable remote PDF.
export function samplePdf(): File {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 595] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
    '',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 595] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  for (const [index, page] of [[3, 1], [5, 2]]) {
    const stream = `BT /F1 24 Tf 48 500 Td (LocalPDF - Sample ${page}) Tj 0 -40 Td /F1 12 Tf (Created on your device. No personal information.) Tj ET`;
    objects[index] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }
  let text = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(text.length); text += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = text.length;
  text += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { text += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  text += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new File([text], 'localpdf-sample.pdf', { type: 'application/pdf' });
}
