import { PDFDocument, PageSizes, StandardFonts, degrees, rgb } from '@cantoo/pdf-lib';

export interface OrganizedPageInstruction {
  sourceIndex: number; // 0-indexed page from source PDF
  rotationDelta: number; // degrees: 0, 90, 180, 270
}

export interface PdfMergeOptions {
  uniformA4?: boolean;
}

export async function mergePdfBuffers(
  buffers: Uint8Array[],
  options: PdfMergeOptions = {},
): Promise<Uint8Array> {
  if (buffers.length < 2) {
    throw new Error('Select at least two PDF files to merge.');
  }

  const merged = await PDFDocument.create();

  for (const bytes of buffers) {
    const src = await PDFDocument.load(bytes);
    if (options.uniformA4) {
      const srcPages = src.getPages();
      const embeddedPages = await merged.embedPages(srcPages);
      for (const embedded of embeddedPages) {
        const page = merged.addPage(PageSizes.A4);
        const { width, height } = page.getSize();
        const scale = Math.min(width / embedded.width, height / embedded.height);
        const drawW = embedded.width * scale;
        const drawH = embedded.height * scale;
        page.drawPage(embedded, {
          x: (width - drawW) / 2,
          y: (height - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      }
    } else {
      const copied = await merged.copyPages(src, src.getPageIndices());
      for (const page of copied) {
        merged.addPage(page);
      }
    }
  }

  return merged.save({ useObjectStreams: true });
}

export async function splitPdfByGroups(
  bytes: Uint8Array,
  groups: number[][],
): Promise<Uint8Array[]> {
  const src = await PDFDocument.load(bytes);
  const results: Uint8Array[] = [];

  for (const indices of groups) {
    if (indices.length === 0) continue;
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, indices);
    for (const page of copied) {
      out.addPage(page);
    }
    results.push(await out.save({ useObjectStreams: true }));
  }

  return results;
}

export async function organizePdfPages(
  bytes: Uint8Array,
  instructions: OrganizedPageInstruction[],
): Promise<Uint8Array> {
  if (instructions.length === 0) {
    throw new Error('Document must retain at least one page.');
  }

  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const indices = instructions.map((item) => item.sourceIndex);
  const copiedPages = await out.copyPages(src, indices);

  copiedPages.forEach((page, idx) => {
    const delta = instructions[idx]?.rotationDelta ?? 0;
    if (delta !== 0) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + delta) % 360));
    }
    out.addPage(page);
  });

  return out.save({ useObjectStreams: true });
}

export async function rotatePdfPages(
  bytes: Uint8Array,
  angleDelta: 90 | 180 | 270,
  targetPageIndices?: number[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();
  const targets =
    targetPageIndices && targetPageIndices.length > 0
      ? new Set(targetPageIndices)
      : new Set(pages.map((_, idx) => idx));

  pages.forEach((page, idx) => {
    if (targets.has(idx)) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + angleDelta) % 360));
    }
  });

  return doc.save({ useObjectStreams: true });
}

export async function deletePdfPages(
  bytes: Uint8Array,
  indicesToDelete: number[],
): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes);
  const total = src.getPageCount();
  const deleteSet = new Set(indicesToDelete);
  const keepIndices: number[] = [];

  for (let i = 0; i < total; i++) {
    if (!deleteSet.has(i)) {
      keepIndices.push(i);
    }
  }

  if (keepIndices.length === 0) {
    throw new Error('Cannot delete every page. At least one page must remain.');
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, keepIndices);
  for (const page of copied) {
    out.addPage(page);
  }

  return out.save({ useObjectStreams: true });
}

export async function extractPdfPages(
  bytes: Uint8Array,
  indicesToExtract: number[],
): Promise<Uint8Array> {
  if (indicesToExtract.length === 0) {
    throw new Error('Select at least one page to extract.');
  }
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indicesToExtract);
  for (const page of copied) {
    out.addPage(page);
  }
  return out.save({ useObjectStreams: true });
}

export interface ImageToPdfInput {
  bytes: Uint8Array;
  format: 'jpg' | 'png';
}

export interface ImageToPdfOptions {
  pageSize: 'auto' | 'a4' | 'letter';
  orientation: 'auto' | 'portrait' | 'landscape';
  marginPt: number;
}

export async function imagesToPdf(
  images: ImageToPdfInput[],
  options: ImageToPdfOptions,
): Promise<Uint8Array> {
  if (images.length === 0) {
    throw new Error('Add at least one image to convert.');
  }

  const doc = await PDFDocument.create();

  for (const imgInput of images) {
    const embedded =
      imgInput.format === 'png'
        ? await doc.embedPng(imgInput.bytes)
        : await doc.embedJpg(imgInput.bytes);

    let pageW: number;
    let pageH: number;

    if (options.pageSize === 'auto') {
      pageW = embedded.width + options.marginPt * 2;
      pageH = embedded.height + options.marginPt * 2;
    } else {
      const [baseW, baseH] =
        options.pageSize === 'letter' ? PageSizes.Letter : PageSizes.A4;
      const isLandscape =
        options.orientation === 'landscape' ||
        (options.orientation === 'auto' && embedded.width > embedded.height);
      pageW = isLandscape ? baseH : baseW;
      pageH = isLandscape ? baseW : baseH;
    }

    const page = doc.addPage([pageW, pageH]);
    const availW = Math.max(10, pageW - options.marginPt * 2);
    const availH = Math.max(10, pageH - options.marginPt * 2);
    const scale = Math.min(availW / embedded.width, availH / embedded.height);
    const drawW = embedded.width * scale;
    const drawH = embedded.height * scale;

    page.drawImage(embedded, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  return doc.save({ useObjectStreams: true });
}

export type PageNumberPosition =
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'top-right'
  | 'top-left';

export type PageNumberFormat = 'n' | 'page-n' | 'n-of-total' | 'page-n-of-total';

export interface PageNumberOptions {
  position: PageNumberPosition;
  format: PageNumberFormat;
  startNumber: number;
  skipFirstPage: boolean;
  fontSize: number;
  hexColor: string;
}

export function hexToRgbColor(hex: string) {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0');
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return rgb(
    Number.isFinite(r) ? r : 0.1,
    Number.isFinite(g) ? g : 0.1,
    Number.isFinite(b) ? b : 0.1,
  );
}

export async function addPageNumbersToPdf(
  bytes: Uint8Array,
  options: PageNumberOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const totalCount = pages.length;
  const color = hexToRgbColor(options.hexColor);
  const margin = 28;

  pages.forEach((page, index) => {
    if (options.skipFirstPage && index === 0) return;
    const num = options.startNumber + (options.skipFirstPage ? index - 1 : index);
    const totalDisplay = options.skipFirstPage
      ? Math.max(1, totalCount - 1) + options.startNumber - 1
      : totalCount + options.startNumber - 1;

    let label = `${num}`;
    if (options.format === 'page-n') label = `Page ${num}`;
    else if (options.format === 'n-of-total') label = `${num} of ${totalDisplay}`;
    else if (options.format === 'page-n-of-total') {
      label = `Page ${num} of ${totalDisplay}`;
    }

    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(label, options.fontSize);

    let x = (width - textWidth) / 2;
    if (options.position.endsWith('left')) x = margin;
    else if (options.position.endsWith('right')) x = width - textWidth - margin;

    const y = options.position.startsWith('top')
      ? height - margin - options.fontSize
      : margin;

    page.drawText(label, {
      x,
      y,
      size: options.fontSize,
      font,
      color,
    });
  });

  return doc.save({ useObjectStreams: true });
}

export interface TextWatermarkOptions {
  mode: 'text';
  text: string;
  fontSize: number;
  opacity: number;
  rotation: number;
  hexColor: string;
  layout: 'center' | 'tiled';
}

export interface ImageWatermarkOptions {
  mode: 'image';
  imageBytes: Uint8Array;
  imageFormat: 'png' | 'jpg';
  scale: number; // 0.1 to 1.0 relative to page width
  opacity: number;
  rotation: number;
}

export async function addWatermarkToPdf(
  bytes: Uint8Array,
  options: TextWatermarkOptions | ImageWatermarkOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();

  if (options.mode === 'text') {
    const text = options.text.trim();
    if (!text) {
      throw new Error('Enter watermark text before applying.');
    }
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const color = hexToRgbColor(options.hexColor);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, options.fontSize);

      if (options.layout === 'tiled') {
        const stepX = Math.max(160, textWidth + 70);
        const stepY = Math.max(140, options.fontSize * 3.2);
        for (let y = 40; y < height; y += stepY) {
          for (let x = 20; x < width; x += stepX) {
            page.drawText(text, {
              x,
              y,
              size: options.fontSize,
              font,
              color,
              opacity: options.opacity,
              rotate: degrees(options.rotation),
            });
          }
        }
      } else {
        const rad = (options.rotation * Math.PI) / 180;
        const cx = width / 2;
        const cy = height / 2;
        const x = cx - (textWidth / 2) * Math.cos(rad) + (options.fontSize / 3) * Math.sin(rad);
        const y = cy - (textWidth / 2) * Math.sin(rad) - (options.fontSize / 3) * Math.cos(rad);
        page.drawText(text, {
          x,
          y,
          size: options.fontSize,
          font,
          color,
          opacity: options.opacity,
          rotate: degrees(options.rotation),
        });
      }
    }
  } else {
    const img =
      options.imageFormat === 'png'
        ? await doc.embedPng(options.imageBytes)
        : await doc.embedJpg(options.imageBytes);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const targetW = width * Math.max(0.08, Math.min(0.9, options.scale));
      const targetH = (img.height / img.width) * targetW;
      page.drawImage(img, {
        x: (width - targetW) / 2,
        y: (height - targetH) / 2,
        width: targetW,
        height: targetH,
        opacity: options.opacity,
        rotate: degrees(options.rotation),
      });
    }
  }

  return doc.save({ useObjectStreams: true });
}

export interface SignaturePlacement {
  pageIndex: number;
  applyToAllPages?: boolean;
  /** Normalized center X (0..1 from left) */
  normX: number;
  /** Normalized center Y (0..1 from top, screen coordinate style) */
  normY: number;
  /** Normalized width relative to page width (e.g. 0.25) */
  widthRatio: number;
}

export async function addSignatureImageToPdf(
  pdfBytes: Uint8Array,
  signaturePngBytes: Uint8Array,
  placement: SignaturePlacement,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const sigImage = await doc.embedPng(signaturePngBytes);
  const pages = doc.getPages();

  const targets = placement.applyToAllPages
    ? pages
    : [pages[placement.pageIndex]].filter(Boolean);

  for (const page of targets) {
    const { width, height } = page.getSize();
    const drawW = width * Math.max(0.08, Math.min(0.75, placement.widthRatio));
    const drawH = (sigImage.height / sigImage.width) * drawW;

    const x = placement.normX * width - drawW / 2;
    const y = (1 - placement.normY) * height - drawH / 2;

    page.drawImage(sigImage, {
      x: Math.max(4, Math.min(width - drawW - 4, x)),
      y: Math.max(4, Math.min(height - drawH - 4, y)),
      width: drawW,
      height: drawH,
    });
  }

  return doc.save({ useObjectStreams: true });
}

export type PdfAnnotationItem =
  | {
      id: string;
      kind: 'text';
      pageIndex: number;
      normX: number; // left edge 0..1
      normY: number; // top edge 0..1
      text: string;
      fontSize: number;
      hexColor: string;
      fontFamily?: 'helvetica' | 'times' | 'courier';
      bold?: boolean;
    }
  | {
      id: string;
      kind: 'rect';
      pageIndex: number;
      normX: number;
      normY: number;
      normW: number;
      normH: number;
      hexColor: string;
      opacity: number;
      mode: 'highlight' | 'solid';
    }
  | {
      id: string;
      kind: 'ink';
      pageIndex: number;
      points: Array<{ normX: number; normY: number }>;
      hexColor: string;
      strokeWidth: number;
    };

export async function applyEditsToPdf(
  pdfBytes: Uint8Array,
  annotations: PdfAnnotationItem[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const times = await doc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const courier = await doc.embedFont(StandardFonts.Courier);
  const courierBold = await doc.embedFont(StandardFonts.CourierBold);

  const pickFont = (family: 'helvetica' | 'times' | 'courier' = 'helvetica', bold = false) => {
    if (family === 'times') return bold ? timesBold : times;
    if (family === 'courier') return bold ? courierBold : courier;
    return bold ? helveticaBold : helvetica;
  };

  for (const item of annotations) {
    const page = pages[item.pageIndex];
    if (!page) continue;
    const { width, height } = page.getSize();

    if (item.kind === 'text') {
      const font = pickFont(item.fontFamily, item.bold);
      const color = hexToRgbColor(item.hexColor);
      const lines = item.text.split('\n');
      const lineHeight = item.fontSize * 1.25;
      lines.forEach((line, idx) => {
        page.drawText(line, {
          x: item.normX * width,
          y: (1 - item.normY) * height - item.fontSize - idx * lineHeight,
          size: item.fontSize,
          font,
          color,
        });
      });
    } else if (item.kind === 'rect') {
      const color = hexToRgbColor(item.hexColor);
      const rectW = item.normW * width;
      const rectH = item.normH * height;
      page.drawRectangle({
        x: item.normX * width,
        y: (1 - item.normY) * height - rectH,
        width: rectW,
        height: rectH,
        color,
        opacity: item.mode === 'solid' ? 1 : item.opacity,
      });
    } else if (item.kind === 'ink' && item.points.length >= 2) {
      const color = hexToRgbColor(item.hexColor);
      for (let i = 1; i < item.points.length; i++) {
        const p1 = item.points[i - 1];
        const p2 = item.points[i];
        page.drawLine({
          start: { x: p1.normX * width, y: (1 - p1.normY) * height },
          end: { x: p2.normX * width, y: (1 - p2.normY) * height },
          thickness: item.strokeWidth,
          color,
        });
      }
    }
  }

  return doc.save({ useObjectStreams: true });
}

export interface ProtectPdfOptions {
  userPassword: string;
  ownerPassword?: string;
  allowPrinting: boolean;
  allowCopying: boolean;
  allowModifying: boolean;
}

export async function protectPdfWithPassword(
  bytes: Uint8Array,
  options: ProtectPdfOptions,
): Promise<Uint8Array> {
  if (!options.userPassword) {
    throw new Error('Please enter a password to protect the PDF.');
  }

  const doc = await PDFDocument.load(bytes);
  doc.encrypt({
    userPassword: options.userPassword,
    ownerPassword: options.ownerPassword?.trim() || options.userPassword,
    algorithm: 'AES-256',
    permissions: {
      printing: options.allowPrinting ? 'highResolution' : false,
      copying: options.allowCopying,
      modifying: options.allowModifying,
      annotating: options.allowModifying,
      fillingForms: options.allowModifying,
      contentAccessibility: true,
      documentAssembly: options.allowModifying,
    },
  });

  return doc.save({ useObjectStreams: false });
}

export async function unlockPdfWithPassword(
  bytes: Uint8Array,
  password: string,
): Promise<Uint8Array> {
  if (!password) {
    throw new Error('Please enter the authorized password for this PDF.');
  }

  let unlocked: PDFDocument;
  try {
    unlocked = await PDFDocument.load(bytes, { password });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('password')) {
      throw new Error('Incorrect password. Please check the authorized password and try again.');
    }
    throw new Error(`Could not unlock PDF: ${msg}`);
  }

  // Copy decrypted pages into a fresh unencrypted PDFDocument
  const cleanDoc = await PDFDocument.create();
  const copied = await cleanDoc.copyPages(unlocked, unlocked.getPageIndices());
  for (const page of copied) {
    cleanDoc.addPage(page);
  }

  return cleanDoc.save({ useObjectStreams: true });
}

export async function compressPdfStructural(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setCreator('FILEVIO');
  doc.setProducer('FILEVIO');
  return doc.save({ useObjectStreams: true });
}

export async function repairPdfStructural(bytes: Uint8Array): Promise<{
  bytes: Uint8Array;
  pagesRecovered: number;
  notes: string;
}> {
  // Trim any garbage bytes before %PDF- header
  let sliced = bytes;
  const limit = Math.min(bytes.length - 4, 2048);
  let headerOffset = -1;
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      headerOffset = i;
      break;
    }
  }
  if (headerOffset > 0) {
    sliced = bytes.slice(headerOffset);
  }

  const src = await PDFDocument.load(sliced, {
    ignoreEncryption: true,
    throwOnInvalidObject: false,
    warnOnInvalidObjects: true,
    updateMetadata: false,
  });

  const clean = await PDFDocument.create();
  const indices = src.getPageIndices();
  const copied = await clean.copyPages(src, indices);
  for (const page of copied) {
    clean.addPage(page);
  }

  const saved = await clean.save({ useObjectStreams: true });
  return {
    bytes: saved,
    pagesRecovered: clean.getPageCount(),
    notes:
      headerOffset > 0
        ? `Trimmed ${headerOffset} leading corrupted bytes and rebuilt cross-reference stream.`
        : 'Rebuilt cross-reference table and normalized page tree.',
  };
}
