export const MAX_PDF_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_ASSET_BYTES = 25 * 1024 * 1024; // 25 MB

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export function hasPdfMagicHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  // Allow leading whitespace or BOM before %PDF- within first 1024 bytes (per PDF spec)
  const limit = Math.min(bytes.length - 4, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return true;
    }
  }
  return false;
}

export type ExpectedFileKind = 'pdf' | 'jpg' | 'png' | 'docx' | 'html';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileMeta(
  file: { name: string; size: number; type?: string },
  kind: ExpectedFileKind,
): FileValidationResult {
  const lower = file.name.toLowerCase();
  if (file.size === 0) {
    return { valid: false, error: `"${file.name}" is empty (0 bytes).` };
  }

  const maxBytes = kind === 'pdf' ? MAX_PDF_BYTES : MAX_ASSET_BYTES;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `"${file.name}" (${formatBytes(file.size)}) exceeds the ${formatBytes(maxBytes)} browser limit.`,
    };
  }

  if (kind === 'pdf') {
    if (!lower.endsWith('.pdf') && file.type !== 'application/pdf') {
      return {
        valid: false,
        error: `"${file.name}" is not a PDF file. Please select a .pdf document.`,
      };
    }
  } else if (kind === 'jpg') {
    if (
      !lower.endsWith('.jpg') &&
      !lower.endsWith('.jpeg') &&
      file.type !== 'image/jpeg'
    ) {
      return {
        valid: false,
        error: `"${file.name}" is not a JPG/JPEG image.`,
      };
    }
  } else if (kind === 'png') {
    if (!lower.endsWith('.png') && file.type !== 'image/png') {
      return {
        valid: false,
        error: `"${file.name}" is not a PNG image.`,
      };
    }
  } else if (kind === 'docx') {
    if (
      !lower.endsWith('.docx') &&
      file.type !==
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return {
        valid: false,
        error: `"${file.name}" is not a .docx Word document. Legacy .doc binary files are not supported in browser extraction.`,
      };
    }
  } else if (kind === 'html') {
    if (!lower.endsWith('.html') && !lower.endsWith('.htm') && file.type !== 'text/html') {
      return {
        valid: false,
        error: `"${file.name}" is not an .html or .htm file.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Parses 1-indexed page ranges like "1-3, 5, 7-8" into sorted unique 0-indexed page indices.
 */
export function parsePageRanges(
  input: string,
  totalPages: number,
): { indices: number[]; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { indices: [], error: 'Enter at least one page number or range (e.g. 1-3, 5).' };
  }
  if (totalPages <= 0) {
    return { indices: [], error: 'Document has no pages.' };
  }

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  const selected = new Set<number>();

  for (const part of parts) {
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
        return {
          indices: [],
          error: `Range "${part}" is outside the document page count (1-${totalPages}).`,
        };
      }
      const step = start <= end ? 1 : -1;
      for (let p = start; step > 0 ? p <= end : p >= end; p += step) {
        selected.add(p - 1);
      }
      continue;
    }

    const singleMatch = /^(\d+)$/.exec(part);
    if (singleMatch) {
      const pageNum = Number(singleMatch[1]);
      if (pageNum < 1 || pageNum > totalPages) {
        return {
          indices: [],
          error: `Page ${pageNum} is outside the document page count (1-${totalPages}).`,
        };
      }
      selected.add(pageNum - 1);
      continue;
    }

    return {
      indices: [],
      error: `Invalid page syntax "${part}". Use numbers and ranges like "1-3, 5".`,
    };
  }

  return { indices: Array.from(selected).sort((a, b) => a - b) };
}

/**
 * Parses split groups like "1-3, 4-6, 7" into distinct arrays of 0-indexed page numbers.
 */
export function parseSplitGroups(
  input: string,
  totalPages: number,
): { groups: number[][]; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { groups: [], error: 'Enter page ranges separated by commas (e.g. 1-2, 3-5).' };
  }
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  const groups: number[][] = [];

  for (const part of parts) {
    const parsed = parsePageRanges(part, totalPages);
    if (parsed.error) {
      return { groups: [], error: parsed.error };
    }
    groups.push(parsed.indices);
  }

  return { groups };
}

/**
 * Strips scripts, iframes, objects, and inline event handlers from HTML strings
 * before rendering for preview or HTML-to-PDF conversion.
 */
export function sanitizeHtmlForRender(rawHtml: string): string {
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, 'blocked:');
}

export function stripExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}
