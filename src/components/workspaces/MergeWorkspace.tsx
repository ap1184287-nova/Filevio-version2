import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, FileText, Trash2 } from 'lucide-react';
import { FileDropzone } from '../FileDropzone';
import { ProcessingStatus, ProcessedResult } from '../ProcessingStatus';
import { formatBytes, hasPdfMagicHeader, validateFileMeta } from '../../utils/fileValidation';
import { mergePdfBuffers } from '../../utils/pdfEngine';
import { getPdfInfo, toPdfBlob, triggerBlobDownload } from '../../utils/pdfBrowser';

interface LoadedPdfItem {
  id: string;
  file: File;
  bytes: Uint8Array;
  pageCount: number;
}

interface MergeWorkspaceProps {
  initialFiles?: File[];
}

export function MergeWorkspace({ initialFiles }: MergeWorkspaceProps) {
  const [items, setItems] = useState<LoadedPdfItem[]>([]);
  const [uniformA4, setUniformA4] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  const addFiles = async (files: File[]) => {
    setUploadError(null);
    setProcessError(null);
    setResult(null);

    const added: LoadedPdfItem[] = [];
    for (const file of files) {
      const metaCheck = validateFileMeta(file, 'pdf');
      if (!metaCheck.valid) {
        setUploadError(metaCheck.error ?? 'Invalid PDF file.');
        continue;
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!hasPdfMagicHeader(bytes)) {
        setUploadError(`"${file.name}" does not appear to be a valid PDF document.`);
        continue;
      }

      try {
        const info = await getPdfInfo(bytes);
        if (info.isEncrypted) {
          setUploadError(
            `"${file.name}" is password-protected. Please unlock it first using Unlock PDF.`,
          );
          continue;
        }
        added.push({
          id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          bytes,
          pageCount: info.pageCount,
        });
      } catch {
        setUploadError(`Could not read "${file.name}". The file may be corrupted.`);
      }
    }

    if (added.length > 0) {
      setItems((prev) => [...prev, ...added]);
    }
  };

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      void addFiles(initialFiles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setResult(null);
    setItems((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(target, 0, moved);
      return copy;
    });
  };

  const removeItem = (id: string) => {
    setResult(null);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReset = () => {
    setItems([]);
    setUniformA4(false);
    setUploadError(null);
    setProcessError(null);
    setResult(null);
    setProgress(0);
  };

  const handleMerge = async () => {
    if (items.length < 2) {
      setProcessError('Please add at least two PDF files to merge.');
      return;
    }

    setIsProcessing(true);
    setProgress(25);
    setProcessError(null);
    setResult(null);

    try {
      const mergedBytes = await mergePdfBuffers(
        items.map((item) => item.bytes),
        { uniformA4 },
      );
      setProgress(100);
      const totalOriginal = items.reduce((sum, i) => sum + i.file.size, 0);
      const totalPages = items.reduce((sum, i) => sum + i.pageCount, 0);
      const blob = toPdfBlob(mergedBytes);
      setResult({
        blob,
        filename: 'filevio-merged.pdf',
        summary: `Combined ${items.length} PDF files (${totalPages} total pages) into a single document.`,
        originalBytes: totalOriginal,
        outputBytes: blob.size,
      });
    } catch (err) {
      setProcessError(
        err instanceof Error ? err.message : 'Failed to merge PDF files.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = items.reduce((sum, i) => sum + i.pageCount, 0);

  return (
    <div className="space-y-6">
      <FileDropzone
        accept=".pdf,application/pdf"
        multiple
        label={items.length === 0 ? 'Drop PDF files here to merge' : 'Add more PDF files'}
        hint="Select 2 or more PDF files (up to 100 MB each). Reorder them below before merging."
        buttonText={items.length === 0 ? 'Select PDF Files' : 'Add More PDFs'}
        onFilesSelected={addFiles}
        error={uploadError}
        compact={items.length > 0}
      />

      {items.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium text-slate-900 tabular-nums">
              {items.length} {items.length === 1 ? 'file' : 'files'} queued · {totalPages}{' '}
              {totalPages === 1 ? 'page' : 'pages'} total
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-slate-600 hover:text-red-700 transition-colors cursor-pointer"
            >
              Clear All Files
            </button>
          </div>

          <ul className="divide-y divide-slate-200">
            {items.map((item, idx) => (
              <li
                key={item.id}
                className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 font-mono text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">
                    {idx + 1}
                  </span>
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {formatBytes(item.file.size)} · {item.pageCount}{' '}
                      {item.pageCount === 1 ? 'page' : 'pages'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    aria-label={`Move ${item.file.name} up`}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === items.length - 1}
                    aria-label={`Move ${item.file.name} down`}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={uniformA4}
                onChange={(e) => {
                  setUniformA4(e.target.checked);
                  setResult(null);
                }}
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>Scale all pages to uniform A4 dimensions</span>
            </label>

            <button
              type="button"
              onClick={handleMerge}
              disabled={items.length < 2 || isProcessing}
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Merge {items.length} PDFs
            </button>
          </div>
        </div>
      )}

      <ProcessingStatus
        isProcessing={isProcessing}
        progress={progress}
        progressLabel="Merging PDF pages locally..."
        error={processError}
        result={result}
        onDownload={() => result && triggerBlobDownload(result.blob, result.filename)}
        onReset={handleReset}
      />
    </div>
  );
}
