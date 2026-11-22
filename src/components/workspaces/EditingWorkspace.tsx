import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  FileText,
  Highlighter,
  PenTool,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { FileDropzone } from '../FileDropzone';
import { ProcessingStatus, ProcessedResult } from '../ProcessingStatus';
import {
  formatBytes,
  hasPdfMagicHeader,
  stripExtension,
  validateFileMeta,
} from '../../utils/fileValidation';
import {
  PageNumberFormat,
  PageNumberPosition,
  PdfAnnotationItem,
  addPageNumbersToPdf,
  addSignatureImageToPdf,
  addWatermarkToPdf,
  applyEditsToPdf,
} from '../../utils/pdfEngine';
import {
  RenderedPageThumbnail,
  getPdfInfo,
  renderSinglePdfPage,
  toPdfBlob,
  triggerBlobDownload,
} from '../../utils/pdfBrowser';

type EditingToolId =
  | 'add-page-numbers'
  | 'add-watermark'
  | 'sign-pdf'
  | 'edit-pdf'
  | 'add-text';

interface EditingWorkspaceProps {
  toolId: EditingToolId;
  initialFiles?: File[];
}

export function EditingWorkspace({ toolId, initialFiles }: EditingWorkspaceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagePreview, setPagePreview] = useState<RenderedPageThumbnail | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  // Page numbers state
  const [pnPosition, setPnPosition] = useState<PageNumberPosition>('bottom-center');
  const [pnFormat, setPnFormat] = useState<PageNumberFormat>('n-of-total');
  const [pnStart, setPnStart] = useState(1);
  const [pnSkipFirst, setPnSkipFirst] = useState(false);
  const [pnFontSize, setPnFontSize] = useState(11);
  const [pnColor, setPnColor] = useState('#334155');

  // Watermark state
  const [wmMode, setWmMode] = useState<'text' | 'image'>('text');
  const [wmText, setWmText] = useState('CONFIDENTIAL');
  const [wmFontSize, setWmFontSize] = useState(44);
  const [wmOpacity, setWmOpacity] = useState(0.28);
  const [wmRotation, setWmRotation] = useState(45);
  const [wmColor, setWmColor] = useState('#1d4ed8');
  const [wmLayout, setWmLayout] = useState<'center' | 'tiled'>('center');
  const [wmImageBytes, setWmImageBytes] = useState<Uint8Array | null>(null);
  const [wmImageFormat, setWmImageFormat] = useState<'png' | 'jpg'>('png');
  const [wmImageUrl, setWmImageUrl] = useState<string | null>(null);
  const [wmImageScale, setWmImageScale] = useState(0.35);

  // Sign PDF state
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [sigTab, setSigTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [sigInkColor, setSigInkColor] = useState('#0f172a');
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const [hasDrawnSig, setHasDrawnSig] = useState(false);
  const [typedSig, setTypedSig] = useState('Alex Morgan');
  const [typedStyle, setTypedStyle] = useState<'serif' | 'script' | 'sans'>('script');
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [sigNormX, setSigNormX] = useState(0.5);
  const [sigNormY, setSigNormY] = useState(0.76);
  const [sigWidthRatio, setSigWidthRatio] = useState(0.26);
  const [sigAllPages, setSigAllPages] = useState(false);

  // Edit PDF / Add Text state
  const [editMode, setEditMode] = useState<'text' | 'highlight' | 'redact' | 'ink'>('text');
  const [draftText, setDraftText] = useState('Approved');
  const [draftFontSize, setDraftFontSize] = useState(14);
  const [draftFontFamily, setDraftFontFamily] = useState<'helvetica' | 'times' | 'courier'>(
    'helvetica',
  );
  const [draftBold, setDraftBold] = useState(false);
  const [draftColor, setDraftColor] = useState('#0f172a');
  const [annotations, setAnnotations] = useState<PdfAnnotationItem[]>([]);
  const [dragBoxStart, setDragBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [dragBoxCurrent, setDragBoxCurrent] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [activeInkPoints, setActiveInkPoints] = useState<
    Array<{ normX: number; normY: number }>
  >([]);

  const previewOverlayRef = useRef<HTMLDivElement>(null);

  const loadPreviewPage = async (bytes: Uint8Array, pageNum: number) => {
    setLoadingPage(true);
    try {
      const rendered = await renderSinglePdfPage(bytes, pageNum, 740);
      setPagePreview(rendered);
    } finally {
      setLoadingPage(false);
    }
  };

  const loadFiles = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setUploadError(null);
    setProcessError(null);
    setResult(null);

    const check = validateFileMeta(selected, 'pdf');
    if (!check.valid) {
      setUploadError(check.error ?? 'Invalid PDF file.');
      return;
    }

    const bytes = new Uint8Array(await selected.arrayBuffer());
    if (!hasPdfMagicHeader(bytes)) {
      setUploadError(`"${selected.name}" is not a valid PDF document.`);
      return;
    }

    try {
      const info = await getPdfInfo(bytes);
      if (info.isEncrypted) {
        setUploadError(
          `"${selected.name}" is password-protected. Unlock it first before editing.`,
        );
        return;
      }
      setFile(selected);
      setPdfBytes(bytes);
      setPageCount(info.pageCount);
      setCurrentPage(1);
      setAnnotations([]);
      await loadPreviewPage(bytes, 1);
    } catch {
      setUploadError(`Could not load "${selected.name}".`);
    }
  };

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      void loadFiles(initialFiles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pdfBytes && currentPage >= 1 && currentPage <= pageCount) {
      void loadPreviewPage(pdfBytes, currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Generate typed signature PNG preview whenever typedSig/style/color changes
  useEffect(() => {
    if (toolId !== 'sign-pdf' || sigTab !== 'type') return;
    if (!typedSig.trim()) {
      setSigDataUrl(null);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = sigInkColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSpec =
      typedStyle === 'script'
        ? 'italic 54px Georgia, "Times New Roman", serif'
        : typedStyle === 'serif'
          ? '600 44px Georgia, serif'
          : '600 40px system-ui, sans-serif';
    ctx.font = fontSpec;
    ctx.fillText(typedSig.trim(), canvas.width / 2, canvas.height / 2);
    setSigDataUrl(canvas.toDataURL('image/png'));
  }, [toolId, sigTab, typedSig, typedStyle, sigInkColor]);

  const handleReset = () => {
    if (wmImageUrl) URL.revokeObjectURL(wmImageUrl);
    setFile(null);
    setPdfBytes(null);
    setPagePreview(null);
    setPageCount(0);
    setCurrentPage(1);
    setAnnotations([]);
    setResult(null);
    setUploadError(null);
    setProcessError(null);
    setProgress(0);
  };

  // Signature Draw Pad handlers
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleSigPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    ctx.strokeStyle = sigInkColor;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setIsDrawingSig(true);
  };

  const handleSigPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const ctx = sigCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    setHasDrawnSig(true);
  };

  const handleSigPointerUp = () => {
    if (!isDrawingSig) return;
    setIsDrawingSig(false);
    if (sigCanvasRef.current && hasDrawnSig) {
      setSigDataUrl(sigCanvasRef.current.toDataURL('image/png'));
    }
  };

  const clearDrawnSig = () => {
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawnSig(false);
    setSigDataUrl(null);
  };

  const handleUploadSigImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0];
    if (!imgFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(600, img.naturalWidth);
          canvas.height = Math.round((canvas.width / img.naturalWidth) * img.naturalHeight);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setSigDataUrl(canvas.toDataURL('image/png'));
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(imgFile);
  };

  const handleUploadWatermarkImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0];
    if (!imgFile) return;
    const lower = imgFile.name.toLowerCase();
    const format: 'png' | 'jpg' = lower.endsWith('.png') ? 'png' : 'jpg';
    const bytes = new Uint8Array(await imgFile.arrayBuffer());
    if (wmImageUrl) URL.revokeObjectURL(wmImageUrl);
    setWmImageBytes(bytes);
    setWmImageFormat(format);
    setWmImageUrl(URL.createObjectURL(imgFile));
    setResult(null);
  };

  // Interactive Page Canvas Pointer Handlers (Sign / Add Text / Edit PDF)
  const getNormalizedCoords = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = previewOverlayRef.current;
    if (!el) return { normX: 0.5, normY: 0.5 };
    const rect = el.getBoundingClientRect();
    return {
      normX: Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width)),
      normY: Math.max(0.01, Math.min(0.99, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handlePagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (toolId === 'sign-pdf') {
      const { normX, normY } = getNormalizedCoords(e);
      setSigNormX(normX);
      setSigNormY(normY);
      setResult(null);
      return;
    }

    if (toolId !== 'edit-pdf' && toolId !== 'add-text') return;

    const { normX, normY } = getNormalizedCoords(e);
    if (editMode === 'text' || toolId === 'add-text') {
      if (!draftText.trim()) return;
      setAnnotations((prev) => [
        ...prev,
        {
          id: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          kind: 'text',
          pageIndex: currentPage - 1,
          normX,
          normY,
          text: draftText,
          fontSize: draftFontSize,
          hexColor: draftColor,
          fontFamily: draftFontFamily,
          bold: draftBold,
        },
      ]);
      setResult(null);
    } else if (editMode === 'highlight' || editMode === 'redact') {
      previewOverlayRef.current?.setPointerCapture(e.pointerId);
      setDragBoxStart({ x: normX, y: normY });
      setDragBoxCurrent({ x: normX, y: normY });
    } else if (editMode === 'ink') {
      previewOverlayRef.current?.setPointerCapture(e.pointerId);
      setActiveInkPoints([{ normX, normY }]);
    }
  };

  const handlePagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragBoxStart) {
      const { normX, normY } = getNormalizedCoords(e);
      setDragBoxCurrent({ x: normX, y: normY });
    } else if (activeInkPoints.length > 0) {
      const { normX, normY } = getNormalizedCoords(e);
      setActiveInkPoints((prev) => [...prev, { normX, normY }]);
    }
  };

  const handlePagePointerUp = () => {
    if (dragBoxStart && dragBoxCurrent) {
      const x1 = Math.min(dragBoxStart.x, dragBoxCurrent.x);
      const y1 = Math.min(dragBoxStart.y, dragBoxCurrent.y);
      const w = Math.abs(dragBoxCurrent.x - dragBoxStart.x);
      const h = Math.abs(dragBoxCurrent.y - dragBoxStart.y);
      if (w > 0.015 && h > 0.01) {
        setAnnotations((prev) => [
          ...prev,
          {
            id: `rect-${Date.now()}`,
            kind: 'rect',
            pageIndex: currentPage - 1,
            normX: x1,
            normY: y1,
            normW: w,
            normH: h,
            hexColor: editMode === 'highlight' ? '#fde047' : '#ffffff',
            opacity: editMode === 'highlight' ? 0.38 : 1,
            mode: editMode === 'highlight' ? 'highlight' : 'solid',
          },
        ]);
        setResult(null);
      }
      setDragBoxStart(null);
      setDragBoxCurrent(null);
    }

    if (activeInkPoints.length > 1) {
      setAnnotations((prev) => [
        ...prev,
        {
          id: `ink-${Date.now()}`,
          kind: 'ink',
          pageIndex: currentPage - 1,
          points: activeInkPoints,
          hexColor: draftColor,
          strokeWidth: 2,
        },
      ]);
      setResult(null);
    }
    setActiveInkPoints([]);
  };

  const handleSave = async () => {
    if (!pdfBytes || !file) return;
    setIsProcessing(true);
    setProgress(25);
    setProcessError(null);
    setResult(null);

    const baseName = stripExtension(file.name);

    try {
      let outBytes: Uint8Array;
      let summary = '';
      let suffix = 'edited';

      if (toolId === 'add-page-numbers') {
        outBytes = await addPageNumbersToPdf(pdfBytes, {
          position: pnPosition,
          format: pnFormat,
          startNumber: pnStart,
          skipFirstPage: pnSkipFirst,
          fontSize: pnFontSize,
          hexColor: pnColor,
        });
        suffix = 'numbered';
        summary = `Added page numbers across ${
          pnSkipFirst ? Math.max(0, pageCount - 1) : pageCount
        } page(s).`;
      } else if (toolId === 'add-watermark') {
        if (wmMode === 'image') {
          if (!wmImageBytes) {
            throw new Error('Upload a PNG or JPG logo image for the watermark.');
          }
          outBytes = await addWatermarkToPdf(pdfBytes, {
            mode: 'image',
            imageBytes: wmImageBytes,
            imageFormat: wmImageFormat,
            scale: wmImageScale,
            opacity: wmOpacity,
            rotation: wmRotation,
          });
        } else {
          outBytes = await addWatermarkToPdf(pdfBytes, {
            mode: 'text',
            text: wmText,
            fontSize: wmFontSize,
            opacity: wmOpacity,
            rotation: wmRotation,
            hexColor: wmColor,
            layout: wmLayout,
          });
        }
        suffix = 'watermarked';
        summary = `Applied watermark to all ${pageCount} page(s).`;
      } else if (toolId === 'sign-pdf') {
        if (!sigDataUrl) {
          throw new Error('Draw, type, or upload a signature first.');
        }
        const res = await fetch(sigDataUrl);
        const sigBytes = new Uint8Array(await res.arrayBuffer());
        outBytes = await addSignatureImageToPdf(pdfBytes, sigBytes, {
          pageIndex: currentPage - 1,
          applyToAllPages: sigAllPages,
          normX: sigNormX,
          normY: sigNormY,
          widthRatio: sigWidthRatio,
        });
        suffix = 'signed';
        summary = sigAllPages
          ? `Placed signature across all ${pageCount} pages.`
          : `Placed signature on page ${currentPage}.`;
      } else {
        if (annotations.length === 0) {
          throw new Error('Click on the PDF page preview to add at least one edit before saving.');
        }
        outBytes = await applyEditsToPdf(pdfBytes, annotations);
        suffix = toolId === 'add-text' ? 'text-added' : 'edited';
        summary = `Saved ${annotations.length} annotation(s) onto your PDF.`;
      }

      setProgress(100);
      const blob = toPdfBlob(outBytes);
      setResult({
        blob,
        filename: `${baseName}-${suffix}.pdf`,
        summary,
        originalBytes: file.size,
        outputBytes: blob.size,
      });
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Failed to save PDF edits.');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPageAnnotations = annotations.filter(
    (a) => a.pageIndex === currentPage - 1,
  );

  // Compute preview text for Add Page Numbers overlay
  const pageNumberPreviewLabel = (() => {
    if (pnSkipFirst && currentPage === 1) return '';
    const num = pnStart + (pnSkipFirst ? currentPage - 2 : currentPage - 1);
    const totalDisp = pnSkipFirst
      ? Math.max(1, pageCount - 1) + pnStart - 1
      : pageCount + pnStart - 1;
    if (pnFormat === 'page-n') return `Page ${num}`;
    if (pnFormat === 'n-of-total') return `${num} of ${totalDisp}`;
    if (pnFormat === 'page-n-of-total') return `Page ${num} of ${totalDisp}`;
    return `${num}`;
  })();

  return (
    <div className="space-y-6">
      {!file && (
        <FileDropzone
          accept=".pdf,application/pdf"
          label="Drop a PDF document here"
          hint="Preview pages interactively and apply vector edits directly in your browser."
          buttonText="Select PDF File"
          onFilesSelected={loadFiles}
          error={uploadError}
        />
      )}

      {file && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-900 truncate">
                {file.name}
              </span>
              <span className="text-xs text-slate-500 tabular-nums shrink-0">
                {formatBytes(file.size)} · {pageCount} pages
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-slate-600 hover:text-red-700 cursor-pointer"
            >
              Change File
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Controls Column */}
            <div className="lg:col-span-5 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 space-y-5">
              {toolId === 'add-page-numbers' && (
                <div className="space-y-4">
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Page Number Settings
                  </h3>
                  <div>
                    <label
                      htmlFor="pn-pos"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Position
                    </label>
                    <select
                      id="pn-pos"
                      value={pnPosition}
                      onChange={(e) => {
                        setPnPosition(e.target.value as PageNumberPosition);
                        setResult(null);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="bottom-center">Bottom Center</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-center">Top Center</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="pn-format"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Format
                    </label>
                    <select
                      id="pn-format"
                      value={pnFormat}
                      onChange={(e) => {
                        setPnFormat(e.target.value as PageNumberFormat);
                        setResult(null);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="n">1, 2, 3...</option>
                      <option value="page-n">Page 1, Page 2...</option>
                      <option value="n-of-total">1 of N</option>
                      <option value="page-n-of-total">Page 1 of N</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="pn-start"
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        Start From
                      </label>
                      <input
                        id="pn-start"
                        type="number"
                        min={1}
                        value={pnStart}
                        onChange={(e) => setPnStart(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pn-size"
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        Font Size ({pnFontSize}pt)
                      </label>
                      <input
                        id="pn-size"
                        type="number"
                        min={8}
                        max={24}
                        value={pnFontSize}
                        onChange={(e) =>
                          setPnFontSize(Math.max(8, Math.min(24, Number(e.target.value) || 11)))
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pnSkipFirst}
                        onChange={(e) => setPnSkipFirst(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-700"
                      />
                      <span>Skip cover page (page 1)</span>
                    </label>
                    <input
                      type="color"
                      aria-label="Page number color"
                      value={pnColor}
                      onChange={(e) => setPnColor(e.target.value)}
                      className="w-9 h-8 rounded border border-slate-300 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {toolId === 'add-watermark' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWmMode('text')}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                        wmMode === 'text'
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Text Watermark
                    </button>
                    <button
                      type="button"
                      onClick={() => setWmMode('image')}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                        wmMode === 'image'
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Image Logo
                    </button>
                  </div>

                  {wmMode === 'text' ? (
                    <>
                      <div>
                        <label
                          htmlFor="wm-text"
                          className="block text-xs font-medium text-slate-700 mb-1.5"
                        >
                          Watermark Text
                        </label>
                        <input
                          id="wm-text"
                          type="text"
                          value={wmText}
                          onChange={(e) => setWmText(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="wm-layout"
                            className="block text-xs font-medium text-slate-700 mb-1.5"
                          >
                            Placement
                          </label>
                          <select
                            id="wm-layout"
                            value={wmLayout}
                            onChange={(e) => setWmLayout(e.target.value as 'center' | 'tiled')}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="center">Center</option>
                            <option value="tiled">Tiled Grid</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="wm-color"
                            className="block text-xs font-medium text-slate-700 mb-1.5"
                          >
                            Color
                          </label>
                          <input
                            id="wm-color"
                            type="color"
                            value={wmColor}
                            onChange={(e) => setWmColor(e.target.value)}
                            className="w-full h-9 rounded border border-slate-300 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="wm-size"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Font Size ({wmFontSize}pt)
                        </label>
                        <input
                          id="wm-size"
                          type="range"
                          min={16}
                          max={96}
                          value={wmFontSize}
                          onChange={(e) => setWmFontSize(Number(e.target.value))}
                          className="w-full accent-blue-700"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-xs font-medium text-slate-700">
                        Upload Watermark Image (PNG or JPG)
                      </label>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                        onChange={handleUploadWatermarkImage}
                        className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Width Scale ({Math.round(wmImageScale * 100)}%)
                        </label>
                        <input
                          type="range"
                          min={0.1}
                          max={0.8}
                          step={0.05}
                          value={wmImageScale}
                          onChange={(e) => setWmImageScale(Number(e.target.value))}
                          className="w-full accent-blue-700"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Opacity ({Math.round(wmOpacity * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0.1}
                        max={0.95}
                        step={0.05}
                        value={wmOpacity}
                        onChange={(e) => setWmOpacity(Number(e.target.value))}
                        className="w-full accent-blue-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Angle ({wmRotation}°)
                      </label>
                      <input
                        type="range"
                        min={-45}
                        max={45}
                        step={5}
                        value={wmRotation}
                        onChange={(e) => setWmRotation(Number(e.target.value))}
                        className="w-full accent-blue-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {toolId === 'sign-pdf' && (
                <div className="space-y-4">
                  <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
                    {(
                      [
                        ['draw', 'Draw'],
                        ['type', 'Type'],
                        ['upload', 'Upload'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSigTab(id)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          sigTab === id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {sigTab === 'draw' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">
                          Draw signature below
                        </span>
                        <div className="flex items-center gap-2">
                          {(['#0f172a', '#1d4ed8', '#1e3a8a'] as const).map((c) => (
                            <button
                              key={c}
                              type="button"
                              aria-label={`Select ink color ${c}`}
                              onClick={() => setSigInkColor(c)}
                              className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                                sigInkColor === c ? 'border-blue-600 scale-110' : 'border-white'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <button
                            type="button"
                            onClick={clearDrawnSig}
                            className="text-xs font-medium text-slate-600 hover:text-red-700 ml-1 cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <canvas
                        ref={sigCanvasRef}
                        width={420}
                        height={150}
                        onPointerDown={handleSigPointerDown}
                        onPointerMove={handleSigPointerMove}
                        onPointerUp={handleSigPointerUp}
                        onPointerLeave={handleSigPointerUp}
                        className="w-full h-36 bg-slate-50 border border-slate-300 rounded-lg touch-none cursor-crosshair"
                      />
                    </div>
                  )}

                  {sigTab === 'type' && (
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="typed-signature"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Full Name / Initials
                        </label>
                        <input
                          id="typed-signature"
                          type="text"
                          value={typedSig}
                          onChange={(e) => setTypedSig(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['script', 'serif', 'sans'] as const).map((style) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => setTypedStyle(style)}
                            className={`py-2 text-xs font-medium rounded-lg border capitalize cursor-pointer ${
                              typedStyle === style
                                ? 'bg-blue-50 border-blue-600 text-blue-800'
                                : 'border-slate-200 text-slate-700'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                      {sigDataUrl && (
                        <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex justify-center">
                          <img src={sigDataUrl} alt="Typed signature preview" className="h-14 object-contain" />
                        </div>
                      )}
                    </div>
                  )}

                  {sigTab === 'upload' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-700">
                        Upload transparent PNG or JPG signature
                      </label>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                        onChange={handleUploadSigImage}
                        className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700"
                      />
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Signature Width ({Math.round(sigWidthRatio * 100)}% of page)
                      </label>
                      <input
                        type="range"
                        min={0.12}
                        max={0.55}
                        step={0.02}
                        value={sigWidthRatio}
                        onChange={(e) => setSigWidthRatio(Number(e.target.value))}
                        className="w-full accent-blue-700"
                      />
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sigAllPages}
                        onChange={(e) => setSigAllPages(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-700"
                      />
                      <span>Place on all {pageCount} pages</span>
                    </label>

                    <p className="text-xs text-blue-700 font-medium">
                      Click anywhere on the PDF page preview to reposition your signature.
                    </p>
                  </div>
                </div>
              )}

              {(toolId === 'edit-pdf' || toolId === 'add-text') && (
                <div className="space-y-4">
                  {toolId === 'edit-pdf' && (
                    <div>
                      <p className="text-xs font-medium text-slate-700 mb-2">Editing Tool</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            ['text', 'Add Text', Type],
                            ['highlight', 'Highlight', Highlighter],
                            ['redact', 'Whiteout Cover', Eraser],
                            ['ink', 'Freehand Draw', PenTool],
                          ] as const
                        ).map(([id, label, IconComp]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setEditMode(id)}
                            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                              editMode === id
                                ? 'bg-blue-700 text-white border-blue-700'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <IconComp className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(toolId === 'add-text' || editMode === 'text') && (
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="pdf-add-text-input"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Text to Place (click on page preview to stamp)
                        </label>
                        <textarea
                          id="pdf-add-text-input"
                          rows={2}
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Font</label>
                          <select
                            value={draftFontFamily}
                            onChange={(e) =>
                              setDraftFontFamily(
                                e.target.value as 'helvetica' | 'times' | 'courier',
                              )
                            }
                            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="helvetica">Sans</option>
                            <option value="times">Serif</option>
                            <option value="courier">Mono</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Size</label>
                          <input
                            type="number"
                            min={8}
                            max={48}
                            value={draftFontSize}
                            onChange={(e) =>
                              setDraftFontSize(Math.max(8, Math.min(48, Number(e.target.value) || 14)))
                            }
                            className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Color</label>
                          <input
                            type="color"
                            value={draftColor}
                            onChange={(e) => setDraftColor(e.target.value)}
                            className="w-full h-8 rounded border border-slate-300 cursor-pointer"
                          />
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draftBold}
                          onChange={(e) => setDraftBold(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-700"
                        />
                        <span>Bold weight</span>
                      </label>
                    </div>
                  )}

                  {toolId === 'edit-pdf' && editMode === 'highlight' && (
                    <p className="text-xs text-blue-700 font-medium">
                      Click and drag across the page preview to draw a translucent yellow highlight box.
                    </p>
                  )}

                  {toolId === 'edit-pdf' && editMode === 'redact' && (
                    <p className="text-xs text-blue-700 font-medium">
                      Click and drag across the page preview to place a solid whiteout cover box.
                    </p>
                  )}

                  {toolId === 'edit-pdf' && editMode === 'ink' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-700 font-medium">
                          Draw directly on the page preview.
                        </span>
                        <input
                          type="color"
                          aria-label="Ink color"
                          value={draftColor}
                          onChange={(e) => setDraftColor(e.target.value)}
                          className="w-8 h-7 rounded border border-slate-300 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Annotation List for Current Page */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 tabular-nums">
                        Edits on Page {currentPage} ({currentPageAnnotations.length})
                      </span>
                      {annotations.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setAnnotations((prev) => prev.slice(0, -1))}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-700 cursor-pointer"
                        >
                          <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Undo Last
                        </button>
                      )}
                    </div>

                    {currentPageAnnotations.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No edits placed on this page yet.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                        {currentPageAnnotations.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                          >
                            <span className="truncate text-slate-700">
                              {item.kind === 'text' && `Text: "${item.text}"`}
                              {item.kind === 'rect' &&
                                (item.mode === 'highlight' ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Square className="w-3 h-3 text-amber-500" /> Highlight Box
                                  </span>
                                ) : (
                                  'Whiteout Box'
                                ))}
                              {item.kind === 'ink' && 'Freehand Stroke'}
                            </span>
                            <button
                              type="button"
                              aria-label="Remove annotation"
                              onClick={() =>
                                setAnnotations((prev) => prev.filter((a) => a.id !== item.id))
                              }
                              className="text-slate-400 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Interactive Page Preview Column */}
            <div className="lg:col-span-7 p-5 bg-slate-100/70 flex flex-col items-center justify-between gap-4">
              <div className="w-full flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 tabular-nums">
                  Page {currentPage} of {pageCount}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || loadingPage}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= pageCount || loadingPage}
                    onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                    aria-label="Next page"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {pagePreview ? (
                <div
                  ref={previewOverlayRef}
                  onPointerDown={handlePagePointerDown}
                  onPointerMove={handlePagePointerMove}
                  onPointerUp={handlePagePointerUp}
                  className={`relative bg-white shadow-sm border border-slate-300 select-none overflow-hidden max-w-full ${
                    toolId === 'sign-pdf' || toolId === 'edit-pdf' || toolId === 'add-text'
                      ? 'cursor-crosshair touch-none'
                      : ''
                  }`}
                  style={{ maxHeight: '540px' }}
                >
                  <img
                    src={pagePreview.dataUrl}
                    alt={`Page ${currentPage} preview`}
                    draggable={false}
                    className="block max-h-[540px] w-auto object-contain"
                  />

                  {/* Live Page Numbers Preview */}
                  {toolId === 'add-page-numbers' && pageNumberPreviewLabel && (
                    <div
                      className="absolute pointer-events-none font-sans font-medium"
                      style={{
                        color: pnColor,
                        fontSize: `${Math.max(10, pnFontSize)}px`,
                        top: pnPosition.startsWith('top') ? '14px' : undefined,
                        bottom: pnPosition.startsWith('bottom') ? '14px' : undefined,
                        left: pnPosition.endsWith('left')
                          ? '18px'
                          : pnPosition.endsWith('center')
                            ? '50%'
                            : undefined,
                        right: pnPosition.endsWith('right') ? '18px' : undefined,
                        transform: pnPosition.endsWith('center') ? 'translateX(-50%)' : undefined,
                      }}
                    >
                      {pageNumberPreviewLabel}
                    </div>
                  )}

                  {/* Live Watermark Preview */}
                  {toolId === 'add-watermark' && wmMode === 'text' && wmText.trim() && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                      <span
                        className="font-bold whitespace-nowrap"
                        style={{
                          color: wmColor,
                          opacity: wmOpacity,
                          fontSize: `${Math.max(14, wmFontSize * 0.65)}px`,
                          transform: `rotate(${-wmRotation}deg)`,
                        }}
                      >
                        {wmText}
                      </span>
                    </div>
                  )}

                  {toolId === 'add-watermark' && wmMode === 'image' && wmImageUrl && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                      <img
                        src={wmImageUrl}
                        alt="Watermark preview"
                        style={{
                          width: `${wmImageScale * 100}%`,
                          opacity: wmOpacity,
                          transform: `rotate(${-wmRotation}deg)`,
                        }}
                      />
                    </div>
                  )}

                  {/* Live Signature Placement Preview */}
                  {toolId === 'sign-pdf' && sigDataUrl && (
                    <img
                      src={sigDataUrl}
                      alt="Placed signature preview"
                      className="absolute pointer-events-none border border-dashed border-blue-500/70 bg-blue-50/15"
                      style={{
                        left: `${sigNormX * 100}%`,
                        top: `${sigNormY * 100}%`,
                        width: `${sigWidthRatio * 100}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}

                  {/* Live Annotations Overlay */}
                  {(toolId === 'edit-pdf' || toolId === 'add-text') && (
                    <>
                      {currentPageAnnotations.map((item) => {
                        if (item.kind === 'text') {
                          return (
                            <div
                              key={item.id}
                              className="absolute pointer-events-none whitespace-pre"
                              style={{
                                left: `${item.normX * 100}%`,
                                top: `${item.normY * 100}%`,
                                color: item.hexColor,
                                fontSize: `${Math.max(9, item.fontSize * 0.72)}px`,
                                fontWeight: item.bold ? 700 : 400,
                                fontFamily:
                                  item.fontFamily === 'times'
                                    ? 'serif'
                                    : item.fontFamily === 'courier'
                                      ? 'monospace'
                                      : 'sans-serif',
                              }}
                            >
                              {item.text}
                            </div>
                          );
                        }
                        if (item.kind === 'rect') {
                          return (
                            <div
                              key={item.id}
                              className="absolute pointer-events-none"
                              style={{
                                left: `${item.normX * 100}%`,
                                top: `${item.normY * 100}%`,
                                width: `${item.normW * 100}%`,
                                height: `${item.normH * 100}%`,
                                backgroundColor: item.hexColor,
                                opacity: item.mode === 'solid' ? 1 : item.opacity,
                              }}
                            />
                          );
                        }
                        return null;
                      })}

                      {/* Render SVG ink strokes */}
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      >
                        {currentPageAnnotations
                          .filter((a): a is Extract<PdfAnnotationItem, { kind: 'ink' }> => a.kind === 'ink')
                          .map((stroke) => (
                            <polyline
                              key={stroke.id}
                              fill="none"
                              stroke={stroke.hexColor}
                              strokeWidth="0.4"
                              points={stroke.points
                                .map((p) => `${p.normX * 100},${p.normY * 100}`)
                                .join(' ')}
                            />
                          ))}
                        {activeInkPoints.length > 1 && (
                          <polyline
                            fill="none"
                            stroke={draftColor}
                            strokeWidth="0.4"
                            points={activeInkPoints
                              .map((p) => `${p.normX * 100},${p.normY * 100}`)
                              .join(' ')}
                          />
                        )}
                      </svg>

                      {dragBoxStart && dragBoxCurrent && (
                        <div
                          className="absolute pointer-events-none border border-blue-600"
                          style={{
                            left: `${Math.min(dragBoxStart.x, dragBoxCurrent.x) * 100}%`,
                            top: `${Math.min(dragBoxStart.y, dragBoxCurrent.y) * 100}%`,
                            width: `${Math.abs(dragBoxCurrent.x - dragBoxStart.x) * 100}%`,
                            height: `${Math.abs(dragBoxCurrent.y - dragBoxStart.y) * 100}%`,
                            backgroundColor:
                              editMode === 'highlight' ? 'rgba(253, 224, 71, 0.35)' : 'rgba(255,255,255,0.85)',
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-sm text-slate-500">
                  Loading page preview...
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-4 bg-white border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isProcessing}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {toolId === 'add-page-numbers' && 'Add Page Numbers & Save'}
              {toolId === 'add-watermark' && 'Apply Watermark & Save'}
              {toolId === 'sign-pdf' && 'Apply Signature & Save'}
              {toolId === 'edit-pdf' && 'Save Edited PDF'}
              {toolId === 'add-text' && 'Save Text to PDF'}
            </button>
          </div>
        </div>
      )}

      <ProcessingStatus
        isProcessing={isProcessing}
        progress={progress}
        error={processError}
        result={result}
        onDownload={() => result && triggerBlobDownload(result.blob, result.filename)}
        onReset={handleReset}
      />
    </div>
  );
}
