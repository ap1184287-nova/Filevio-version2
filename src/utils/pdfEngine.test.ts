import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, rgb } from '@cantoo/pdf-lib';
import {
  formatBytes,
  hasPdfMagicHeader,
  parsePageRanges,
  parseSplitGroups,
  sanitizeHtmlForRender,
  validateFileMeta,
} from './fileValidation';
import {
  addPageNumbersToPdf,
  addWatermarkToPdf,
  applyEditsToPdf,
  compressPdfStructural,
  deletePdfPages,
  extractPdfPages,
  mergePdfBuffers,
  organizePdfPages,
  protectPdfWithPassword,
  repairPdfStructural,
  rotatePdfPages,
  splitPdfByGroups,
  unlockPdfWithPassword,
} from './pdfEngine';

async function makeSamplePdf(pageCount: number, labelPrefix = 'Page'): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([400, 600]);
    page.drawText(`${labelPrefix} ${i}`, {
      x: 40,
      y: 520,
      size: 18,
      color: rgb(0.1, 0.2, 0.5),
    });
  }
  return doc.save();
}

test('formatBytes formats byte sizes consistently', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.00 KB');
  assert.equal(formatBytes(15 * 1024 * 1024), '15.0 MB');
});

test('hasPdfMagicHeader detects valid and invalid headers', () => {
  assert.equal(hasPdfMagicHeader(new TextEncoder().encode('%PDF-1.7\n...')), true);
  assert.equal(hasPdfMagicHeader(new TextEncoder().encode('   %PDF-1.4\n')), true);
  assert.equal(hasPdfMagicHeader(new TextEncoder().encode('<html>not a pdf</html>')), false);
});

test('validateFileMeta rejects invalid extensions, empty files, and oversized files', () => {
  assert.equal(validateFileMeta({ name: 'doc.pdf', size: 1024, type: 'application/pdf' }, 'pdf').valid, true);
  assert.equal(validateFileMeta({ name: 'empty.pdf', size: 0 }, 'pdf').valid, false);
  assert.equal(validateFileMeta({ name: 'notes.txt', size: 500, type: 'text/plain' }, 'pdf').valid, false);
  assert.equal(validateFileMeta({ name: 'huge.pdf', size: 200 * 1024 * 1024 }, 'pdf').valid, false);
  assert.equal(validateFileMeta({ name: 'photo.jpg', size: 4000, type: 'image/jpeg' }, 'jpg').valid, true);
  assert.equal(validateFileMeta({ name: 'legacy.doc', size: 4000 }, 'docx').valid, false);
});

test('parsePageRanges and parseSplitGroups parse 1-based ranges accurately', () => {
  assert.deepEqual(parsePageRanges('1-3, 5', 6), { indices: [0, 1, 2, 4] });
  assert.equal(parsePageRanges('1-9', 6).indices.length, 0);
  assert.ok(parsePageRanges('1-9', 6).error);
  assert.deepEqual(parseSplitGroups('1-2, 3-4, 5', 5), {
    groups: [[0, 1], [2, 3], [4]],
  });
});

test('sanitizeHtmlForRender strips scripts and inline event handlers', () => {
  const dirty = '<div onclick="alert(1)"><script>steal()</script><p>Hello</p><a href="javascript:void(0)">Link</a></div>';
  const clean = sanitizeHtmlForRender(dirty);
  assert.equal(clean.includes('<script>'), false);
  assert.equal(clean.includes('onclick'), false);
  assert.equal(clean.includes('javascript:'), false);
  assert.equal(clean.includes('<p>Hello</p>'), true);
});

test('mergePdfBuffers combines multiple PDFs preserving total page count', async () => {
  const a = await makeSamplePdf(2, 'A');
  const b = await makeSamplePdf(3, 'B');
  const merged = await mergePdfBuffers([a, b]);
  const loaded = await PDFDocument.load(merged);
  assert.equal(loaded.getPageCount(), 5);
});

test('splitPdfByGroups splits PDF into requested subsets', async () => {
  const src = await makeSamplePdf(4);
  const parts = await splitPdfByGroups(src, [[0, 1], [2, 3]]);
  assert.equal(parts.length, 2);
  assert.equal((await PDFDocument.load(parts[0])).getPageCount(), 2);
  assert.equal((await PDFDocument.load(parts[1])).getPageCount(), 2);
});

test('organize, rotate, delete, and extract pages work accurately', async () => {
  const src = await makeSamplePdf(4);

  const organized = await organizePdfPages(src, [
    { sourceIndex: 3, rotationDelta: 90 },
    { sourceIndex: 0, rotationDelta: 0 },
    { sourceIndex: 0, rotationDelta: 180 },
  ]);
  const orgDoc = await PDFDocument.load(organized);
  assert.equal(orgDoc.getPageCount(), 3);
  assert.equal(orgDoc.getPage(0).getRotation().angle, 90);
  assert.equal(orgDoc.getPage(2).getRotation().angle, 180);

  const rotated = await rotatePdfPages(src, 90, [1]);
  const rotDoc = await PDFDocument.load(rotated);
  assert.equal(rotDoc.getPage(0).getRotation().angle, 0);
  assert.equal(rotDoc.getPage(1).getRotation().angle, 90);

  const deleted = await deletePdfPages(src, [1, 2]);
  assert.equal((await PDFDocument.load(deleted)).getPageCount(), 2);

  const extracted = await extractPdfPages(src, [0, 3]);
  assert.equal((await PDFDocument.load(extracted)).getPageCount(), 2);
});

test('page numbers, watermarks, and edits save valid PDFs', async () => {
  const src = await makeSamplePdf(2);

  const numbered = await addPageNumbersToPdf(src, {
    position: 'bottom-center',
    format: 'page-n-of-total',
    startNumber: 1,
    skipFirstPage: false,
    fontSize: 11,
    hexColor: '#1d4ed8',
  });
  assert.equal((await PDFDocument.load(numbered)).getPageCount(), 2);

  const watermarked = await addWatermarkToPdf(src, {
    mode: 'text',
    text: 'CONFIDENTIAL',
    fontSize: 36,
    opacity: 0.3,
    rotation: 45,
    hexColor: '#1d4ed8',
    layout: 'center',
  });
  assert.equal((await PDFDocument.load(watermarked)).getPageCount(), 2);

  const edited = await applyEditsToPdf(src, [
    {
      id: '1',
      kind: 'text',
      pageIndex: 0,
      normX: 0.2,
      normY: 0.2,
      text: 'Approved',
      fontSize: 14,
      hexColor: '#0f172a',
    },
    {
      id: '2',
      kind: 'rect',
      pageIndex: 0,
      normX: 0.1,
      normY: 0.3,
      normW: 0.3,
      normH: 0.05,
      hexColor: '#fde047',
      opacity: 0.35,
      mode: 'highlight',
    },
  ]);
  assert.equal((await PDFDocument.load(edited)).getPageCount(), 2);
});

test('protectPdfWithPassword encrypts and unlockPdfWithPassword requires authorized password', async () => {
  const src = await makeSamplePdf(2);
  const encrypted = await protectPdfWithPassword(src, {
    userPassword: 'filevio-2026',
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
  });

  // Loading without password should reject
  await assert.rejects(() => PDFDocument.load(encrypted));
  // Unlocking with wrong password should reject
  await assert.rejects(() => unlockPdfWithPassword(encrypted, 'wrong-pass'));

  // Unlocking with authorized password should yield a clean unencrypted PDF
  const unlocked = await unlockPdfWithPassword(encrypted, 'filevio-2026');
  const cleanDoc = await PDFDocument.load(unlocked);
  assert.equal(cleanDoc.isEncrypted, false);
  assert.equal(cleanDoc.getPageCount(), 2);
});

test('repairPdfStructural strips leading junk bytes and compressPdfStructural preserves pages', async () => {
  const src = await makeSamplePdf(2);
  const prefix = new TextEncoder().encode('GARBAGE_BYTES_BEFORE_HEADER');
  const corrupted = new Uint8Array(prefix.length + src.length);
  corrupted.set(prefix, 0);
  corrupted.set(src, prefix.length);

  const repaired = await repairPdfStructural(corrupted);
  assert.equal(repaired.pagesRecovered, 2);
  assert.equal((await PDFDocument.load(repaired.bytes)).getPageCount(), 2);

  const compressed = await compressPdfStructural(src);
  assert.equal((await PDFDocument.load(compressed)).getPageCount(), 2);
});
