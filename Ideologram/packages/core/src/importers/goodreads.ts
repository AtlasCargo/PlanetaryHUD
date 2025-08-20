import Papa from 'papaparse';
import type { BookInput } from '../types.js';

function toNumber(s: any): number | undefined {
  if (s == null) return undefined;
  const n = Number(String(s).trim());
  return Number.isFinite(n) ? n : undefined;
}

function parseDateToISO(s?: string): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  if (!t) return undefined;
  // Goodreads often uses M/D/YYYY or MM/DD/YYYY
  const parts = t.split(/[\/-]/).map((p) => p.trim());
  if (parts.length === 3) {
    // determine if first is month
    const [a, b, c] = parts;
    // try MM/DD/YYYY
    const mm = Number(a);
    const dd = Number(b);
    const yyyy = Number(c);
    if (
      Number.isInteger(mm) && Number.isInteger(dd) && Number.isInteger(yyyy) &&
      mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yyyy >= 1400
    ) {
      const dt = new Date(yyyy, mm - 1, dd);
      if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
    }
  }
  // Fallback: Date.parse
  const d = new Date(t);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return undefined;
}

export type GoodreadsRow = {
  Title?: string;
  Author?: string;
  'My Rating'?: string | number;
  ISBN?: string;
  ISBN13?: string;
  'Original Publication Year'?: string | number;
  'Date Read'?: string;
  'Date Added'?: string;
  Shelves?: string; // sometimes present
  Bookshelves?: string; // often present
  'Exclusive Shelf'?: string; // e.g., read, to-read
  [k: string]: any;
};

export function parseGoodreadsCsv(csv: string): BookInput[] {
  const res = Papa.parse<GoodreadsRow>(csv, { header: true, skipEmptyLines: true });
  if (res.errors && res.errors.length > 0) {
    // We don't throw on partial errors; just proceed.
    // console.warn('CSV parse errors', res.errors);
  }
  const rows = res.data || [];
  const books: BookInput[] = [];
  for (const row of rows) {
    const title = (row.Title || '').trim();
    if (!title) continue;
    const author = (row.Author || '').trim() || undefined;
    const rating = toNumber(row['My Rating']);
    const isbn13 = (row.ISBN13 || '').replace(/[^0-9Xx]/g, '').trim();
    const isbn10 = (row.ISBN || '').replace(/[^0-9Xx]/g, '').trim();
    const isbn = isbn13 || isbn10 || undefined;
    const year = toNumber(row['Original Publication Year']);
    const dateRead = parseDateToISO(row['Date Read']);
    const exclusive = (row['Exclusive Shelf'] || '').toString().trim().toLowerCase();
    const readingStatus = (exclusive || undefined) as BookInput['readingStatus'];
    const isRead = (readingStatus === 'read') || !!dateRead;
    const shelfStr = (row.Shelves || row.Bookshelves || row['Exclusive Shelf'] || '').toString();
    const shelves = shelfStr
      .split(/[,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => !!s && s !== 'read' && s !== 'to-read' && s !== 'currently-reading');

    books.push({
      title,
      author,
      rating,
      isbn,
      year,
      dateRead,
      representative: 1,
      shelves,
      source: 'goodreads',
      readingStatus,
      isRead,
    });
  }
  return books;
}
