import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { FileDropzone } from '../FileDropzone';
import { ProcessingStatus, ProcessedResult } from '../ProcessingStatus';
import { formatBytes, stripExtension, validateFileMeta } from '../../utils/fileValidation';
import { ImageToPdfOptions, imagesToPdf } from '../../utils/pdfEngine';
import { normalizeImageForPdf, toPdfBlob, triggerBlobDownload } from '../../utils/pdfBrowser';

interface ImageEntry {
  id: string;
  file: File;
  previewUrl: string;
}

interface ImageToPdfWorkspaceProps {
  mode: 'jpg' | 'png';
  initialFiles?: File[];
}

export function ImageToPdfWorkspace({ mode, initialFiles }: ImageToPdfWorkspaceProps) {
  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [pageSize, setPageSize] = useState<ImageToPdfOptions['pageSize']>('a4');
  const [orientation, setOrientation] = useState<ImageToPdfOptions['orientation']>('auto');
  const [marginPt, setMarginPt] = useState<number>(20);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  const addFiles = (files: File[]) => {
    setUploadError(null);
    setProcessError(null);
    setResult(null);

    const added: ImageEntry[] = [];
    for (const file of files) {
      const check = validateFileMeta(file, mode);
      if (!check.valid) {
        setUploadError(check.error ?? 'Invalid image file.');
        continue;
      }
      added.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (added.length > 0) {
      setEntries((prev) => [...prev, ...added]);
    }
  };

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      addFiles(initialFiles);
    }
    return () => {
      entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveEntry = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= entries.length) return;
    setResult(null);
    setEntries((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(target, 0, moved);
      return copy;
    });
  };

  const removeEntry = (id: string) => {
    setResult(null);
    setEntries((prev) => {
      const target = prev.find((e) => e.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((e) => e.id !== id);
    });
  };

  const handleReset = () => {
    entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    setEntries([]);
    setUploadError(null);
    setProcessError(null);
    setResult(null);
    setProgress(0);
  };

  const handleConvert = async () => {
    if (entries.length === 0) return;
    setIsProcessing(true);
    setProgress(10);
    setProcessError(null);
    setResult(null);

    try {
      const normalizedInputs = [];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const bytes = await normalizeImageForPdf(entry.file, mode);
        normalizedInputs.push({ bytes, format: mode });
        setProgress(15 + Math.round(((i + 1) / entries.length) * 65));
      }

      const pdfBytes = await imagesToPdf(normalizedInputs, {
        pageSize,
        orientation,
        marginPt,
      });

      setProgress(100);
      const totalOriginal = entries.reduce((sum, e) => sum + e.file.size, 0);
      const base =
        entries.length === 1 ? stripExtension(entries[0].file.name) : `filevio-${mode}-bundle`;
      const blob = toPdfBlob(pdfBytes);
      setResult({
        blob,
        filename: `${base}.pdf`,
        summary: `Converted ${entries.length} ${mode.toUpperCase()} image(s) into a PDF.`,
        originalBytes: totalOriginal,
        outputBytes: blob.size,
      });
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Image conversion failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <FileDropzone
        accept={mode === 'jpg' ? '.jpg,.jpeg,image/jpeg' : '.png,image/png'}
        multiple
        label={
          entries.length === 0
            ? `Drop ${mode.toUpperCase()} images here`
            : `Add more ${mode.toUpperCase()} images`
        }
        hint={`Select one or more ${mode.toUpperCase()} images (up to 25 MB each).`}
        buttonText={entries.length === 0 ? `Select ${mode.toUpperCase()} Files` : 'Add More Images'}
        onFilesSelected={addFiles}
        error={uploadError}
        compact={entries.length > 0}
      />

      {entries.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900 tabular-nums">
              {entries.length} {entries.length === 1 ? 'image' : 'images'} ready
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-slate-600 hover:text-red-700 cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <ul className="divide-y divide-slate-200">
            {entries.map((entry, idx) => (
              <li
                key={entry.id}
                className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/70"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={entry.previewUrl}
                    alt={entry.file.name}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {entry.file.name}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      Page {idx + 1} · {formatBytes(entry.file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveEntry(idx, -1)}
                    aria-label={`Move ${entry.file.name} up`}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === entries.length - 1}
                    onClick={() => moveEntry(idx, 1)}
                    aria-label={`Move ${entry.file.name} down`}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    aria-label={`Remove ${entry.file.name}`}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="p-5 bg-slate-50 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="img-page-size"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Page Size
              </label>
              <select
                id="img-page-size"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value as ImageToPdfOptions['pageSize']);
                  setResult(null);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="letter">US Letter (8.5 × 11 in)</option>
                <option value="auto">Fit to Original Image</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="img-orientation"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Orientation
              </label>
              <select
                id="img-orientation"
                value={orientation}
                disabled={pageSize === 'auto'}
                onChange={(e) => {
                  setOrientation(e.target.value as ImageToPdfOptions['orientation']);
                  setResult(null);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="auto">Auto (Match Image)</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="img-margin"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Page Margin
              </label>
              <select
                id="img-margin"
                value={marginPt}
                onChange={(e) => {
                  setMarginPt(Number(e.target.value));
                  setResult(null);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value={0}>No Margin</option>
                <option value={20}>Small Margin</option>
                <option value={40}>Standard Margin</option>
              </select>
            </div>
          </div>

          <div className="px-5 py-4 bg-white border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={handleConvert}
              disabled={isProcessing}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Convert {entries.length} {mode.toUpperCase()} to PDF
            </button>
          </div>
        </div>
      )}

      <ProcessingStatus
        isProcessing={isProcessing}
        progress={progress}
        progressLabel="Building PDF from images..."
        error={processError}
        result={result}
        onDownload={() => result && triggerBlobDownload(result.blob, result.filename)}
        onReset={handleReset}
      />
    </div>
  );
}
