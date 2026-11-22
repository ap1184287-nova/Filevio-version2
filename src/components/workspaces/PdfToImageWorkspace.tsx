import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { FileDropzone } from '../FileDropzone';
import { ProcessingStatus, ProcessedResult } from '../ProcessingStatus';
import {
  formatBytes,
  hasPdfMagicHeader,
  parsePageRanges,
  validateFileMeta,
} from '../../utils/fileValidation';
import {
  RenderedImagePage,
  convertPdfToImages,
  getPdfInfo,
  triggerBlobDownload,
} from '../../utils/pdfBrowser';

interface PdfToImageWorkspaceProps {
  format: 'jpg' | 'png';
  initialFiles?: File[];
}

export function PdfToImageWorkspace({ format, initialFiles }: PdfToImageWorkspaceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const [scale, setScale] = useState<number>(2);
  const [jpgQuality, setJpgQuality] = useState<number>(0.9);
  const [transparentPng, setTransparentPng] = useState(false);
  const [rangeScope, setRangeScope] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState('');

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [renderedImages, setRenderedImages] = useState<RenderedImagePage[]>([]);

  const loadFile = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setUploadError(null);
    setProcessError(null);
    setResult(null);
    setRenderedImages([]);

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
          `"${selected.name}" is password-protected. Unlock it first before rendering images.`,
        );
        return;
      }
      setFile(selected);
      setPdfBytes(bytes);
      setPageCount(info.pageCount);
      setCustomRange(info.pageCount > 1 ? `1-${info.pageCount}` : '1');
    } catch {
      setUploadError(`Could not read "${selected.name}".`);
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
    setPageCount(0);
    setRenderedImages([]);
    setResult(null);
    setUploadError(null);
    setProcessError(null);
    setProgress(0);
  };

  const handleConvert = async () => {
    if (!pdfBytes || !file) return;
    setIsProcessing(true);
    setProgress(5);
    setProcessError(null);
    setResult(null);
    setRenderedImages([]);

    try {
      let pageIndices: number[] | undefined;
      if (rangeScope === 'custom') {
        const parsed = parsePageRanges(customRange, pageCount);
        if (parsed.error) throw new Error(parsed.error);
        pageIndices = parsed.indices;
      }

      const output = await convertPdfToImages(
        pdfBytes,
        file.name,
        {
          format,
          scale,
          quality: jpgQuality,
          pageIndices,
          transparentPng,
        },
        setProgress,
      );

      setRenderedImages(output.pages);
      if (output.archiveBlob && output.archiveFilename) {
        setResult({
          blob: output.archiveBlob,
          filename: output.archiveFilename,
          summary: `Rendered ${output.pages.length} ${format.toUpperCase()} images bundled into a ZIP file.`,
          outputBytes: output.archiveBlob.size,
        });
      } else if (output.pages[0]) {
        setResult({
          blob: output.pages[0].blob,
          filename: output.pages[0].filename,
          summary: `Rendered page ${output.pages[0].pageNumber} (${output.pages[0].width}×${output.pages[0].height} px).`,
          outputBytes: output.pages[0].blob.size,
        });
      }
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'PDF rendering failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!file && (
        <FileDropzone
          accept=".pdf,application/pdf"
          label={`Drop a PDF file to convert to ${format.toUpperCase()}`}
          hint="Every page renders locally at crisp resolution."
          buttonText="Select PDF File"
          onFilesSelected={loadFile}
          error={uploadError}
        />
      )}

      {file && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
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

          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label
                htmlFor="img-scale"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Resolution Scale
              </label>
              <select
                id="img-scale"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value={1}>Standard (1x · ~72 DPI)</option>
                <option value={2}>High Quality (2x · ~150 DPI)</option>
                <option value={3}>Print / Ultra (3x · ~225 DPI)</option>
              </select>
            </div>

            {format === 'jpg' ? (
              <div>
                <label
                  htmlFor="jpg-quality"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  JPEG Quality ({Math.round(jpgQuality * 100)}%)
                </label>
                <input
                  id="jpg-quality"
                  type="range"
                  min={0.6}
                  max={0.98}
                  step={0.02}
                  value={jpgQuality}
                  onChange={(e) => setJpgQuality(Number(e.target.value))}
                  className="w-full mt-2 accent-blue-700"
                />
              </div>
            ) : (
              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transparentPng}
                    onChange={(e) => setTransparentPng(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>Preserve transparent background</span>
                </label>
              </div>
            )}

            <div>
              <label
                htmlFor="pdf-img-scope"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Pages to Export
              </label>
              <select
                id="pdf-img-scope"
                value={rangeScope}
                onChange={(e) => setRangeScope(e.target.value as 'all' | 'custom')}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All {pageCount} pages</option>
                <option value="custom">Custom page range</option>
              </select>
              {rangeScope === 'custom' && (
                <input
                  type="text"
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  placeholder="e.g. 1-3, 5"
                  aria-label="Custom page range"
                  className="mt-2 w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              )}
            </div>
          </div>

          <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={handleConvert}
              disabled={isProcessing}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Convert to {format.toUpperCase()}
            </button>
          </div>
        </div>
      )}

      <ProcessingStatus
        isProcessing={isProcessing}
        progress={progress}
        progressLabel={`Rendering PDF pages to ${format.toUpperCase()}...`}
        error={processError}
        result={result}
        onDownload={() => result && triggerBlobDownload(result.blob, result.filename)}
        onReset={handleReset}
      />

      {renderedImages.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Rendered Output Preview ({renderedImages.length}{' '}
            {renderedImages.length === 1 ? 'image' : 'images'})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {renderedImages.map((item) => (
              <div
                key={item.pageNumber}
                className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-2.5 bg-slate-50/50"
              >
                <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center p-1">
                  <img
                    src={item.dataUrl}
                    alt={`Rendered page ${item.pageNumber}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-700 tabular-nums">
                    Page {item.pageNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => triggerBlobDownload(item.blob, item.filename)}
                    className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-medium cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
