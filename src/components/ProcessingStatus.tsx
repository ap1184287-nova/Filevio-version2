import { AlertCircle, CheckCircle2, Download, RotateCcw } from 'lucide-react';
import { formatBytes } from '../utils/fileValidation';

export interface ProcessedResult {
  blob: Blob;
  filename: string;
  summary: string;
  originalBytes?: number;
  outputBytes: number;
}

interface ProcessingStatusProps {
  isProcessing: boolean;
  progress: number;
  progressLabel?: string;
  error: string | null;
  result: ProcessedResult | null;
  onDownload: () => void;
  onReset: () => void;
}

export function ProcessingStatus({
  isProcessing,
  progress,
  progressLabel = 'Processing locally in your browser...',
  error,
  result,
  onDownload,
  onReset,
}: ProcessingStatusProps) {
  if (!isProcessing && !error && !result) {
    return null;
  }

  return (
    <div className="space-y-4">
      {isProcessing && (
        <div
          role="status"
          aria-live="polite"
          className="p-5 rounded-xl border border-blue-200 bg-blue-50/60"
        >
          <div className="flex items-center justify-between text-sm font-medium text-slate-900 mb-2.5">
            <span>{progressLabel}</span>
            <span className="font-mono tabular-nums text-blue-700">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-700 transition-all duration-150"
              style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      )}

      {error && !isProcessing && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3 text-sm text-red-900"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold">Unable to complete action</p>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {result && !isProcessing && (
        <div
          role="status"
          aria-live="polite"
          className="p-6 rounded-xl border border-emerald-200 bg-emerald-50/60"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Your file is ready
                </h3>
                <p className="text-sm text-slate-700 mt-0.5">{result.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
                  <span className="font-medium text-slate-900">{result.filename}</span>
                  <span aria-hidden="true">·</span>
                  <span>Output: {formatBytes(result.outputBytes)}</span>
                  {typeof result.originalBytes === 'number' && result.originalBytes > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        Original: {formatBytes(result.originalBytes)} (
                        {result.outputBytes < result.originalBytes
                          ? `-${Math.round(((result.originalBytes - result.outputBytes) / result.originalBytes) * 100)}%`
                          : 'no reduction'}
                        )
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Download File
              </button>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                Reset Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
