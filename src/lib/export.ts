import type { Product } from '../types/imdb';
import { IMDB_COLUMNS } from './columns';

/** Build a plain row object (header → value) for one product, in column order. */
export function productToRow(product: Product): Record<string, string> {
  const row: Record<string, string> = {};
  for (const col of IMDB_COLUMNS) {
    row[col.header] = product.fields[col.key].value.trim();
  }
  return row;
}

const HEADERS = IMDB_COLUMNS.map((c) => c.header);

/** Escape a single CSV cell per RFC 4180. */
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Serialise products to a UTF-8 CSV string (with BOM for Excel compatibility). */
export function toCsv(products: Product[]): string {
  const lines = [HEADERS.map(csvCell).join(',')];
  for (const product of products) {
    const row = productToRow(product);
    lines.push(HEADERS.map((h) => csvCell(row[h] ?? '')).join(','));
  }
  return '﻿' + lines.join('\r\n');
}

/** Serialise products to an XLSX file as a Blob. */
export async function toXlsxBlob(products: Product[]): Promise<Blob> {
  // Lazy-loaded so the ~900 kB ExcelJS bundle is fetched only on first XLSX export.
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Image-to-IMDB Tool';
  const ws = wb.addWorksheet('predictions');

  ws.columns = IMDB_COLUMNS.map((c) => ({
    header: c.header,
    key: c.header,
    width: Math.max(12, Math.min(40, c.header.length + 6)),
  }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: 'middle' };

  for (const product of products) {
    ws.addRow(productToRow(product));
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Trigger a browser download of a Blob or string content. */
export function downloadFile(filename: string, content: Blob | string, mime?: string) {
  const blob =
    typeof content === 'string'
      ? new Blob([content], { type: mime ?? 'text/plain;charset=utf-8' })
      : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadCsv(products: Product[], filename = 'predictions.csv') {
  downloadFile(filename, toCsv(products), 'text/csv;charset=utf-8');
}

export async function downloadXlsx(products: Product[], filename = 'predictions.xlsx') {
  downloadFile(filename, await toXlsxBlob(products));
}
