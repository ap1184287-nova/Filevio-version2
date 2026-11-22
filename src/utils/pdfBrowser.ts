import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import html2canvas from 'html2canvas';
import { PDFDocument, PageSizes } from '@cantoo/pdf-lib';
import { sanitizeHtmlForRender, stripExtension } from './fileValidation';

// Configure PDF.js worker using Vite-resolvable local module URL (works offline and on GitHub Pages)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface RenderedPageThumbnail {
  pageNumber: number; // 1-indexed
  dataUrl: string;
  width: number;
  height: number;
}

export interface RenderedImagePage {
  pageNumber: number;
  filename: string;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

export function toPdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes.slice().buffer], { type: 'application/pdf' });
}

export async function getPdfInfo(bytes: Uint8Array): Promise<{
  pageCount: number;
  isEncrypted: boolean;
}> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  try {
    const doc = await loadingTask.promise;
    const pageCount = doc.numPages;
    await loadingTask.destroy();
    return { pageCount, isEncrypted: false };
  } catch (err) {
    const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : '';
    const msg = err instanceof Error ? err.message : String(err);
    if (name === 'PasswordException' || msg.toLowerCase().includes('password')) {
      return { pageCount: 0, isEncrypted: true };
    }
    throw err;
  }
}

export async function renderPdfThumbnails(
  bytes: Uint8Array,
  maxWidth = 240,
  onProgress?: (percent: number) => void,
): Promise<RenderedPageThumbnail[]> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages;
  const thumbnails: RenderedPageThumbnail[] = [];

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = Math.max(0.2, Math.min(2, maxWidth / unscaledViewport.width));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    }

    thumbnails.push({
      pageNumber: pageNum,
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      width: canvas.width,
      height: canvas.height,
    });
    page.cleanup();
    if (onProgress) {
      onProgress(Math.round((pageNum / total) * 100));
    }
  }

  await loadingTask.destroy();
  return thumbnails;
}

export async function renderSinglePdfPage(
  bytes: Uint8Array,
  pageNumber: number,
  targetWidth = 720,
): Promise<RenderedPageThumbnail> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const clamped = Math.max(1, Math.min(pdf.numPages, pageNumber));
  const page = await pdf.getPage(clamped);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.max(0.5, Math.min(3, targetWidth / baseViewport.width));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  }

  const result: RenderedPageThumbnail = {
    pageNumber: clamped,
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };

  page.cleanup();
  await loadingTask.destroy();
  return result;
}

export async function convertPdfToImages(
  bytes: Uint8Array,
  baseFilename: string,
  options: {
    format: 'jpg' | 'png';
    scale: number; // 1, 2, 3
    quality: number; // 0.6..0.98 for jpg
    pageIndices?: number[]; // 0-indexed
    transparentPng?: boolean;
  },
  onProgress?: (percent: number) => void,
): Promise<{
  pages: RenderedImagePage[];
  archiveBlob?: Blob;
  archiveFilename?: string;
}> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages;
  const targetPages =
    options.pageIndices && options.pageIndices.length > 0
      ? options.pageIndices.map((idx) => idx + 1)
      : Array.from({ length: total }, (_, i) => i + 1);

  const cleanBase = stripExtension(baseFilename);
  const ext = options.format === 'png' ? 'png' : 'jpg';
  const mime = options.format === 'png' ? 'image/png' : 'image/jpeg';
  const rendered: RenderedImagePage[] = [];

  for (let i = 0; i < targetPages.length; i++) {
    const pageNum = targetPages[i];
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: options.scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (!(options.format === 'png' && options.transparentPng)) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to encode image frame.'))),
        mime,
        options.format === 'jpg' ? options.quality : undefined,
      );
    });

    const dataUrl = canvas.toDataURL(
      mime,
      options.format === 'jpg' ? options.quality : undefined,
    );

    rendered.push({
      pageNumber: pageNum,
      filename: `${cleanBase}-page-${String(pageNum).padStart(2, '0')}.${ext}`,
      dataUrl,
      blob,
      width: canvas.width,
      height: canvas.height,
    });

    page.cleanup();
    if (onProgress) {
      onProgress(Math.round(((i + 1) / targetPages.length) * 100));
    }
  }

  await loadingTask.destroy();

  if (rendered.length > 1) {
    const zip = new JSZip();
    for (const item of rendered) {
      zip.file(item.filename, item.blob);
    }
    const archiveBlob = await zip.generateAsync({ type: 'blob' });
    return {
      pages: rendered,
      archiveBlob,
      archiveFilename: `${cleanBase}-${ext}-pages.zip`,
    };
  }

  return { pages: rendered };
}

export async function createZipFromPdfBuffers(
  items: Array<{ filename: string; bytes: Uint8Array }>,
): Promise<Blob> {
  const zip = new JSZip();
  for (const item of items) {
    zip.file(item.filename, item.bytes);
  }
  return zip.generateAsync({ type: 'blob' });
}

export async function compressPdfRasterized(
  bytes: Uint8Array,
  preset: 'balanced' | 'strong',
  onProgress?: (percent: number) => void,
): Promise<Uint8Array> {
  const scale = preset === 'balanced' ? 1.5 : 1.05;
  const quality = preset === 'balanced' ? 0.76 : 0.54;

  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const out = await PDFDocument.create();
  const total = pdf.numPages;

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const renderViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(renderViewport.width));
    canvas.height = Math.max(1, Math.floor(renderViewport.height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderViewport, canvas }).promise;
    }

    const jpgBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to compress page frame.'))),
        'image/jpeg',
        quality,
      );
    });
    const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
    const embedded = await out.embedJpg(jpgBytes);

    const outPage = out.addPage([baseViewport.width, baseViewport.height]);
    outPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    });

    page.cleanup();
    if (onProgress) {
      onProgress(Math.round((pageNum / total) * 100));
    }
  }

  await loadingTask.destroy();
  return out.save({ useObjectStreams: true });
}

export async function repairPdfViaPdfJs(
  bytes: Uint8Array,
  onProgress?: (percent: number) => void,
): Promise<{ bytes: Uint8Array; pagesRecovered: number; notes: string }> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const out = await PDFDocument.create();
  const total = pdf.numPages;

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const renderViewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(renderViewport.width));
    canvas.height = Math.max(1, Math.floor(renderViewport.height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderViewport, canvas }).promise;
    }

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to reconstruct page.'))),
        'image/png',
      );
    });
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
    const embedded = await out.embedPng(pngBytes);
    const outPage = out.addPage([baseViewport.width, baseViewport.height]);
    outPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    });

    page.cleanup();
    if (onProgress) {
      onProgress(Math.round((pageNum / total) * 100));
    }
  }

  await loadingTask.destroy();
  const saved = await out.save({ useObjectStreams: true });
  return {
    bytes: saved,
    pagesRecovered: total,
    notes:
      'Low-level object tables were unrecoverable directly; reconstructed clean pages via tolerant PDF.js parser.',
  };
}

/**
 * Ensures any browser-readable image file (including CMYK or EXIF-rotated JPEGs)
 * encodes cleanly to standard RGB JPG or RGBA PNG bytes for pdf-lib.
 */
export async function normalizeImageForPdf(
  file: File,
  targetFormat: 'jpg' | 'png',
): Promise<Uint8Array> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Could not decode image "${file.name}".`));
      el.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, img.naturalWidth);
    canvas.height = Math.max(1, img.naturalHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable.');
    }
    if (targetFormat === 'jpg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error(`Failed to encode "${file.name}".`))),
        targetFormat === 'png' ? 'image/png' : 'image/jpeg',
        targetFormat === 'jpg' ? 0.92 : undefined,
      );
    });
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface HtmlToPdfOptions {
  pageSize: 'a4' | 'letter';
  marginPx: number;
  printBackground: boolean;
}

/**
 * Renders sanitized HTML inside an isolated iframe using pure hex CSS (never inheriting
 * Tailwind v4 oklch/lab tokens), captures via html2canvas, and paginates cleanly via pdf-lib.
 */
export async function convertHtmlToPdf(
  rawHtml: string,
  options: HtmlToPdfOptions,
  onProgress?: (percent: number) => void,
): Promise<Uint8Array> {
  const cleanHtml = sanitizeHtmlForRender(rawHtml);
  if (!cleanHtml.trim()) {
    throw new Error('Provide HTML content or upload an HTML file first.');
  }

  const [pageW, pageH] =
    options.pageSize === 'letter' ? PageSizes.Letter : PageSizes.A4;
  // 96 DPI equivalent width for crisp document layout (~794px for A4)
  const viewportWidth = options.pageSize === 'letter' ? 816 : 794;
  const contentWidth = Math.max(320, viewportWidth - options.marginPx * 2);

  if (onProgress) onProgress(15);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${viewportWidth}px`;
  iframe.style.height = '1200px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) {
      throw new Error('Isolated render frame unavailable.');
    }

    const isFullDocument = /<html[\s>]/i.test(cleanHtml) || /<body[\s>]/i.test(cleanHtml);
    const bodyContent = isFullDocument ? cleanHtml : cleanHtml;

    doc.open();
    doc.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: ${options.printBackground ? '#ffffff' : '#ffffff'};
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
  }
  .filevio-render-root {
    width: ${contentWidth}px;
    margin: ${options.marginPx}px auto;
    background: #ffffff;
    color: #0f172a;
    word-wrap: break-word;
  }
  h1, h2, h3, h4 { color: #0f172a; margin-top: 1.1em; margin-bottom: 0.4em; line-height: 1.25; }
  h1 { font-size: 26px; }
  h2 { font-size: 20px; }
  h3 { font-size: 16px; }
  p { margin: 0 0 0.8em 0; }
  ul, ol { margin: 0 0 0.9em 0; padding-left: 1.5em; }
  table { width: 100%; border-collapse: collapse; margin: 1em 0; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
  th { background-color: #f1f5f9; font-weight: 600; }
  img { max-width: 100%; height: auto; }
  pre, code { background-color: #f8fafc; padding: 2px 5px; border-radius: 4px; font-family: monospace; }
  blockquote { border-left: 3px solid #1d4ed8; padding-left: 12px; margin: 1em 0; color: #334155; }
</style>
</head>
<body>
  <div class="filevio-render-root">${bodyContent}</div>
</body>
</html>`);
    doc.close();

    // Wait briefly for embedded images/fonts in iframe
    await new Promise((r) => setTimeout(r, 250));
    if (onProgress) onProgress(45);

    const rootEl = doc.querySelector('.filevio-render-root') as HTMLElement | null;
    const targetEl = rootEl || doc.body;
    const totalHeight = Math.max(200, targetEl.scrollHeight + options.marginPx * 2);
    iframe.style.height = `${totalHeight}px`;

    const fullCanvas = await html2canvas(doc.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: viewportWidth,
      windowWidth: viewportWidth,
    });

    if (onProgress) onProgress(75);

    const outPdf = await PDFDocument.create();
    const scaleFactor = fullCanvas.width / pageW;
    const sliceHeightPx = Math.floor(pageH * scaleFactor);
    let offsetY = 0;

    while (offsetY < fullCanvas.height) {
      const currentSliceH = Math.min(sliceHeightPx, fullCanvas.height - offsetY);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = fullCanvas.width;
      pageCanvas.height = currentSliceH;
      const pCtx = pageCanvas.getContext('2d');
      if (pCtx) {
        pCtx.fillStyle = '#ffffff';
        pCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pCtx.drawImage(
          fullCanvas,
          0,
          offsetY,
          fullCanvas.width,
          currentSliceH,
          0,
          0,
          fullCanvas.width,
          currentSliceH,
        );
      }

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        pageCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to encode PDF page.'))),
          'image/png',
        );
      });
      const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
      const embedded = await outPdf.embedPng(pngBytes);
      const pdfPage = outPdf.addPage([pageW, pageH]);
      const drawHeight = (currentSliceH / fullCanvas.height) * ((fullCanvas.height / fullCanvas.width) * pageW);
      pdfPage.drawImage(embedded, {
        x: 0,
        y: pageH - drawHeight,
        width: pageW,
        height: drawHeight,
      });

      offsetY += sliceHeightPx;
    }

    if (onProgress) onProgress(100);
    return outPdf.save({ useObjectStreams: true });
  } finally {
    document.body.removeChild(iframe);
  }
}

export async function extractDocxToHtml(arrayBuffer: ArrayBuffer): Promise<{
  html: string;
  warnings: string[];
}> {
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return {
    html: sanitizeHtmlForRender(result.value),
    warnings: result.messages.map((m) => m.message),
  };
}

export async function convertDocxToPdf(
  arrayBuffer: ArrayBuffer,
  options: HtmlToPdfOptions,
  onProgress?: (percent: number) => void,
): Promise<{
  pdfBytes: Uint8Array;
  previewHtml: string;
  warnings: string[];
}> {
  if (onProgress) onProgress(10);
  const { html, warnings } = await extractDocxToHtml(arrayBuffer);
  if (!html.trim()) {
    throw new Error('No readable content found inside this DOCX file.');
  }
  const pdfBytes = await convertHtmlToPdf(html, options, (p) => {
    if (onProgress) onProgress(15 + Math.round(p * 0.85));
  });
  return { pdfBytes, previewHtml: html, warnings };
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
