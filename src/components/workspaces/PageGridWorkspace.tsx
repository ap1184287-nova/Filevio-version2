import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  FileText,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { FileDropzone } from '../FileDropzone';
import { ProcessingStatus, ProcessedResult } from '../ProcessingStatus';
import {
  formatBytes,
  hasPdfMagicHeader,
  parsePageRanges,
  parseSplitGroups,
  stripExtension,
  validateFileMeta,
} from '../../utils/fileValidation';
import {
  deletePdfPages,
  extractPdfPages,
  organizePdfPages,
  rotatePdfPages,
  splitPdfByGroups,
} from '../../utils/pdfEngine';
import {
  RenderedPageThumbnail,
  createZipFromPdfBuffers,
  getPdfInfo,
  renderPdfThumbnails,
  toPdfBlob,
  triggerBlobDownload,
} from '../../utils/pdfBrowser';

type PageGridToolId =
  | 'split-pdf'
  | 'organize-pdf'
  | 'rotate-pdf'
  | 'delete-pages'
  | 'extract-pages';

interface PageGridWorkspaceProps {
  toolId: PageGridToolId;
  initialFiles?: File[];
}

interface OrganizeSlot {
  uid: string;
  sourceIndex: number;
  rotationDelta: number;
}

export function PageGridWorkspace({ toolId, initialFiles }: PageGridWorkspaceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [thumbnails, setThumbnails] = useState<RenderedPageThumbnail[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [thumbProgress, setThumbProgress] = useState(0);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  // Split state
  const [splitMode, setSplitMode] = useState<'ranges' | 'every' | 'single'>('ranges');
  const [splitRangesText, setSplitRangesText] = useState('1-1');
  const [splitEveryN, setSplitEveryN] = useState(1);

  // Organize state
  const [organizeSlots, setOrganizeSlots] = useState<OrganizeSlot[]>([]);

  // Rotate state
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [rotateScope, setRotateScope] = useState<'all' | 'selected'>('all');

  // Shared selection state (Rotate selected / Delete / Extract)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeText, setRangeText] = useState('');
  const [extractAsZip, setExtractAsZip] = useState(false);

  const loadFile = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setUploadError(null);
    setProcessError(null);
    setResult(null);

    const check = validateFileMeta(selected, 'pdf');
    if (!check.valid) {
      setUploadError(check.error ?? 'Invalid file.');
      return;
    }

    const bytes = new Uint8Array(await selected.arrayBuffer());
    if (!hasPdfMagicHeader(bytes)) {
      setUploadError(`"${selected.name}" does not have a valid PDF header.`);
      return;
    }

    try {
      const info = await getPdfInfo(bytes);
      if (info.isEncrypted) {
        setUploadError(
          `"${selected.name}" is password-protected. Please unlock it first with Unlock PDF.`,
        );
        return;
      }

      setFile(selected);
      setPdfBytes(bytes);
      setLoadingThumbs(true);
      setThumbProgress(0);

      const thumbs = await renderPdfThumbnails(bytes, 220, setThumbProgress);
      setThumbnails(thumbs);

      setOrganizeSlots(
        thumbs.map((_, idx) => ({
          uid: `slot-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          sourceIndex: idx,
          rotationDelta: 0,
        })),
      );
      setSelectedPages(new Set());
      setRangeText('');
      if (thumbs.length >= 2) {
        const mid = Math.ceil(thumbs.length / 2);
        setSplitRangesText(`1-${mid}, ${mid + 1}-${thumbs.length}`);
      } else {
        setSplitRangesText('1');
      }
    } catch {
      setUploadError(`Could not parse "${selected.name}". Try Repair PDF if it is damaged.`);
    } finally {
      setLoadingThumbs(false);
    }
  };

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      void loadFile(initialFiles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    setFile(null);
    setPdfBytes(null);
    setThumbnails([]);
    setOrganizeSlots([]);
    setSelectedPages(new Set());
    setRangeText('');
    setUploadError(null);
    setProcessError(null);
    setResult(null);
    setProgress(0);
  };

  const togglePageSelection = (pageIdx: number) => {
    setResult(null);
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageIdx)) next.delete(pageIdx);
      else next.add(pageIdx);
      const sorted = Array.from(next).sort((a, b) => a - b);
      setRangeText(sorted.map((i) => i + 1).join(', '));
      return next;
    });
  };

  const applyRangeTextToSelection = (value: string) => {
    setRangeText(value);
    setResult(null);
    if (!value.trim()) {
      setSelectedPages(new Set());
      return;
    }
    const parsed = parsePageRanges(value, thumbnails.length);
    if (!parsed.error) {
      setSelectedPages(new Set(parsed.indices));
    }
  };

  const handleExecute = async () => {
    if (!pdfBytes || !file) return;
    setIsProcessing(true);
    setProgress(20);
    setProcessError(null);
    setResult(null);

    const baseName = stripExtension(file.name);

    try {
      if (toolId === 'split-pdf') {
        let groups: number[][] = [];
        if (splitMode === 'single') {
          groups = thumbnails.map((_, i) => [i]);
        } else if (splitMode === 'every') {
          const step = Math.max(1, splitEveryN);
          for (let i = 0; i < thumbnails.length; i += step) {
            const chunk: number[] = [];
            for (let j = i; j < Math.min(thumbnails.length, i + step); j++) {
              chunk.push(j);
            }
            groups.push(chunk);
          }
        } else {
          const parsed = parseSplitGroups(splitRangesText, thumbnails.length);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          groups = parsed.groups;
        }

        const parts = await splitPdfByGroups(pdfBytes, groups);
        setProgress(85);

        if (parts.length === 1) {
          const blob = toPdfBlob(parts[0]);
          setResult({
            blob,
            filename: `${baseName}-split.pdf`,
            summary: `Extracted 1 PDF segment (${groups[0].length} pages).`,
            originalBytes: file.size,
            outputBytes: blob.size,
          });
        } else {
          const zipItems = parts.map((bytes, idx) => ({
            filename: `${baseName}-part-${String(idx + 1).padStart(2, '0')}.pdf`,
            bytes,
          }));
          const zipBlob = await createZipFromPdfBuffers(zipItems);
          setResult({
            blob: zipBlob,
            filename: `${baseName}-split.zip`,
            summary: `Split into ${parts.length} PDF files bundled inside a ZIP archive.`,
            originalBytes: file.size,
            outputBytes: zipBlob.size,
          });
        }
      } else if (toolId === 'organize-pdf') {
        const outBytes = await organizePdfPages(
          pdfBytes,
          organizeSlots.map((s) => ({
            sourceIndex: s.sourceIndex,
            rotationDelta: s.rotationDelta,
          })),
        );
        const blob = toPdfBlob(outBytes);
        setResult({
          blob,
          filename: `${baseName}-organized.pdf`,
          summary: `Saved reorganized PDF with ${organizeSlots.length} pages.`,
          originalBytes: file.size,
          outputBytes: blob.size,
        });
      } else if (toolId === 'rotate-pdf') {
        const targets =
          rotateScope === 'selected' ? Array.from(selectedPages).sort((a, b) => a - b) : undefined;
        if (rotateScope === 'selected' && (!targets || targets.length === 0)) {
          throw new Error('Select at least one page to rotate, or switch to All Pages.');
        }
        const outBytes = await rotatePdfPages(pdfBytes, rotateAngle, targets);
        const blob = toPdfBlob(outBytes);
        setResult({
          blob,
          filename: `${baseName}-rotated.pdf`,
          summary: `Rotated ${
            targets ? `${targets.length} selected page(s)` : `all ${thumbnails.length} pages`
          } by ${rotateAngle}°.`,
          originalBytes: file.size,
          outputBytes: blob.size,
        });
      } else if (toolId === 'delete-pages') {
        const indices = Array.from(selectedPages).sort((a, b) => a - b);
        if (indices.length === 0) {
          throw new Error('Select at least one page to remove.');
        }
        const outBytes = await deletePdfPages(pdfBytes, indices);
        const blob = toPdfBlob(outBytes);
        const remaining = thumbnails.length - indices.length;
        setResult({
          blob,
          filename: `${baseName}-trimmed.pdf`,
          summary: `Removed ${indices.length} page(s). ${remaining} page(s) kept.`,
          originalBytes: file.size,
          outputBytes: blob.size,
        });
      } else if (toolId === 'extract-pages') {
        const indices = Array.from(selectedPages).sort((a, b) => a - b);
        if (indices.length === 0) {
          throw new Error('Select at least one page to extract.');
        }
        if (extractAsZip && indices.length > 1) {
          const singleGroups = indices.map((idx) => [idx]);
          const parts = await splitPdfByGroups(pdfBytes, singleGroups);
          const zipBlob = await createZipFromPdfBuffers(
            parts.map((bytes, i) => ({
              filename: `${baseName}-page-${String(indices[i] + 1).padStart(2, '0')}.pdf`,
              bytes,
            })),
          );
          setResult({
            blob: zipBlob,
            filename: `${baseName}-extracted.zip`,
            summary: `Extracted ${indices.length} individual PDF pages into a ZIP archive.`,
            originalBytes: file.size,
            outputBytes: zipBlob.size,
          });
        } else {
          const outBytes = await extractPdfPages(pdfBytes, indices);
          const blob = toPdfBlob(outBytes);
          setResult({
            blob,
            filename: `${baseName}-extracted.pdf`,
            summary: `Extracted ${indices.length} page(s) into a new PDF.`,
            originalBytes: file.size,
            outputBytes: blob.size,
          });
        }
      }
      setProgress(100);
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!file && (
        <FileDropzone
          accept=".pdf,application/pdf"
          label="Drop a PDF document here"
          hint="Preview all pages visually before splitting, rotating, reordering, or extracting."
          buttonText="Select PDF File"
          onFilesSelected={loadFile}
          error={uploadError}
        />
      )}

      {file && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {/* File Header Bar */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-900 truncate">
                {file.name}
              </span>
              <span className="text-xs text-slate-500 tabular-nums shrink-0">
                {formatBytes(file.size)} · {thumbnails.length} pages
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-slate-600 hover:text-red-700 transition-colors cursor-pointer"
            >
              Change File
            </button>
          </div>

          {/* Tool-specific Controls Bar */}
          <div className="p-5 border-b border-slate-200 bg-white space-y-4">
            {toolId === 'split-pdf' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['ranges', 'Custom Ranges'],
                      ['every', 'Every N Pages'],
                      ['single', 'Every Page Separately'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSplitMode(id);
                        setResult(null);
                      }}
                      className={`px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                        splitMode === id
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {splitMode === 'ranges' && (
                  <div className="max-w-md">
                    <label
                      htmlFor="split-ranges-input"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Page ranges separated by commas (each group outputs a separate PDF)
                    </label>
                    <input
                      id="split-ranges-input"
                      type="text"
                      value={splitRangesText}
                      onChange={(e) => {
                        setSplitRangesText(e.target.value);
                        setResult(null);
                      }}
                      placeholder="e.g. 1-3, 4-6, 7"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}

                {splitMode === 'every' && (
                  <div className="max-w-xs">
                    <label
                      htmlFor="split-every-n"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Pages per split file
                    </label>
                    <input
                      id="split-every-n"
                      type="number"
                      min={1}
                      max={Math.max(1, thumbnails.length)}
                      value={splitEveryN}
                      onChange={(e) => {
                        setSplitEveryN(Math.max(1, Number(e.target.value) || 1));
                        setResult(null);
                      }}
                      className="w-32 px-3.5 py-2 text-sm border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}
              </div>
            )}

            {toolId === 'rotate-pdf' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-600 mr-1">Angle:</span>
                  {([90, 180, 270] as const).map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => {
                        setRotateAngle(deg);
                        setResult(null);
                      }}
                      className={`px-3.5 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                        rotateAngle === deg
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {deg === 270 ? '270° (90° CCW)' : `${deg}° CW`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRotateScope('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                      rotateScope === 'all'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    All Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotateScope('selected')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                      rotateScope === 'selected'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    Selected Only ({selectedPages.size})
                  </button>
                </div>
              </div>
            )}

            {(toolId === 'delete-pages' || toolId === 'extract-pages') && (
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <label
                    htmlFor="page-range-selector"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    {toolId === 'delete-pages'
                      ? 'Click pages below or type page numbers to remove (e.g. 2, 4-5)'
                      : 'Click pages below or type page numbers to extract (e.g. 1, 3-5)'}
                  </label>
                  <input
                    id="page-range-selector"
                    type="text"
                    value={rangeText}
                    onChange={(e) => applyRangeTextToSelection(e.target.value)}
                    placeholder="e.g. 1, 3-5"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {toolId === 'extract-pages' && (
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer pb-1">
                    <input
                      type="checkbox"
                      checked={extractAsZip}
                      onChange={(e) => {
                        setExtractAsZip(e.target.checked);
                        setResult(null);
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span>Save each page as a separate PDF (ZIP)</span>
                  </label>
                )}
              </div>
            )}

            {toolId === 'organize-pdf' && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Use the page controls below to reorder, rotate, duplicate, or remove sheets.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOrganizeSlots(
                      thumbnails.map((_, idx) => ({
                        uid: `slot-${idx}-${Math.random().toString(36).slice(2, 7)}`,
                        sourceIndex: idx,
                        rotationDelta: 0,
                      })),
                    );
                    setResult(null);
                  }}
                  className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  Restore Original Order
                </button>
              </div>
            )}
          </div>

          {/* Thumbnail Grid */}
          <div className="p-5 bg-slate-50/60">
            {loadingThumbs ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  Rendering page previews... {thumbProgress}%
                </p>
                <div className="max-w-xs mx-auto h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-700 transition-all"
                    style={{ width: `${thumbProgress}%` }}
                  />
                </div>
              </div>
            ) : toolId === 'organize-pdf' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {organizeSlots.map((slot, slotIdx) => {
                  const thumb = thumbnails[slot.sourceIndex];
                  if (!thumb) return null;
                  return (
                    <div
                      key={slot.uid}
                      className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2.5"
                    >
                      <div className="aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center p-1">
                        <img
                          src={thumb.dataUrl}
                          alt={`Source page ${slot.sourceIndex + 1}`}
                          className="max-w-full max-h-full object-contain transition-transform duration-150"
                          style={{ transform: `rotate(${slot.rotationDelta}deg)` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
                        <span className="font-medium text-slate-900">
                          Pos {slotIdx + 1}
                        </span>
                        <span>Src p.{slot.sourceIndex + 1}</span>
                      </div>

                      <div className="grid grid-cols-5 gap-1">
                        <button
                          type="button"
                          disabled={slotIdx === 0}
                          aria-label={`Move position ${slotIdx + 1} left`}
                          onClick={() => {
                            setResult(null);
                            setOrganizeSlots((prev) => {
                              const copy = [...prev];
                              const [m] = copy.splice(slotIdx, 1);
                              copy.splice(slotIdx - 1, 0, m);
                              return copy;
                            });
                          }}
                          className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-35 flex justify-center cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={slotIdx === organizeSlots.length - 1}
                          aria-label={`Move position ${slotIdx + 1} right`}
                          onClick={() => {
                            setResult(null);
                            setOrganizeSlots((prev) => {
                              const copy = [...prev];
                              const [m] = copy.splice(slotIdx, 1);
                              copy.splice(slotIdx + 1, 0, m);
                              return copy;
                            });
                          }}
                          className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-35 flex justify-center cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Rotate position ${slotIdx + 1} by 90 degrees`}
                          onClick={() => {
                            setResult(null);
                            setOrganizeSlots((prev) =>
                              prev.map((s, idx) =>
                                idx === slotIdx
                                  ? { ...s, rotationDelta: (s.rotationDelta + 90) % 360 }
                                  : s,
                              ),
                            );
                          }}
                          className="p-1.5 rounded border border-slate-200 hover:bg-blue-50 hover:text-blue-700 flex justify-center cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Duplicate page at position ${slotIdx + 1}`}
                          onClick={() => {
                            setResult(null);
                            setOrganizeSlots((prev) => {
                              const copy = [...prev];
                              copy.splice(slotIdx + 1, 0, {
                                ...slot,
                                uid: `dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                              });
                              return copy;
                            });
                          }}
                          className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 flex justify-center cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={organizeSlots.length <= 1}
                          aria-label={`Remove page at position ${slotIdx + 1}`}
                          onClick={() => {
                            setResult(null);
                            setOrganizeSlots((prev) => prev.filter((_, idx) => idx !== slotIdx));
                          }}
                          className="p-1.5 rounded border border-slate-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-35 flex justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {thumbnails.map((thumb, idx) => {
                  const isSelected = selectedPages.has(idx);
                  const isInteractive =
                    toolId === 'delete-pages' ||
                    toolId === 'extract-pages' ||
                    (toolId === 'rotate-pdf' && rotateScope === 'selected');

                  const previewRotateDeg =
                    toolId === 'rotate-pdf' && (rotateScope === 'all' || isSelected)
                      ? rotateAngle
                      : 0;

                  const borderClass = isSelected
                    ? toolId === 'delete-pages'
                      ? 'border-red-500 ring-2 ring-red-200 bg-red-50/40'
                      : 'border-blue-600 ring-2 ring-blue-200 bg-blue-50/40'
                    : 'border-slate-200 bg-white';

                  return (
                    <button
                      key={thumb.pageNumber}
                      type="button"
                      disabled={!isInteractive && toolId !== 'rotate-pdf'}
                      onClick={() => isInteractive && togglePageSelection(idx)}
                      aria-pressed={isInteractive ? isSelected : undefined}
                      aria-label={`Page ${thumb.pageNumber}`}
                      className={`text-left rounded-xl border p-3 transition-all ${borderClass} ${
                        isInteractive ? 'cursor-pointer hover:border-blue-400' : 'cursor-default'
                      }`}
                    >
                      <div className="aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center p-1">
                        <img
                          src={thumb.dataUrl}
                          alt={`Page ${thumb.pageNumber}`}
                          className="max-w-full max-h-full object-contain transition-transform duration-150"
                          style={{ transform: `rotate(${previewRotateDeg}deg)` }}
                        />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-xs tabular-nums">
                        <span className="font-medium text-slate-900">
                          Page {thumb.pageNumber}
                        </span>
                        {isSelected && (
                          <span
                            className={`font-semibold ${
                              toolId === 'delete-pages' ? 'text-red-700' : 'text-blue-700'
                            }`}
                          >
                            {toolId === 'delete-pages' ? 'Remove' : 'Selected'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary Action Footer */}
          <div className="px-5 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Processed locally in your browser · Original file untouched
            </p>
            <button
              type="button"
              onClick={handleExecute}
              disabled={isProcessing || loadingThumbs || thumbnails.length === 0}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {toolId === 'split-pdf' && 'Split PDF'}
              {toolId === 'organize-pdf' && 'Save Organized PDF'}
              {toolId === 'rotate-pdf' && 'Apply Rotation'}
              {toolId === 'delete-pages' && `Remove ${selectedPages.size} Page(s)`}
              {toolId === 'extract-pages' && `Extract ${selectedPages.size} Page(s)`}
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
