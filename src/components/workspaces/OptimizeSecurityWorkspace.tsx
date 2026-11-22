import { useEffect, useState } from 'react';
import { Eye, EyeOff, FileText, ShieldCheck } from 'lucide-react';
import { FileDropzone } from '../FileDropzone';
import { ProcessingStatus, ProcessedResult } from '../ProcessingStatus';
import {
  formatBytes,
  hasPdfMagicHeader,
  stripExtension,
  validateFileMeta,
} from '../../utils/fileValidation';
import {
  compressPdfStructural,
  protectPdfWithPassword,
  repairPdfStructural,
  unlockPdfWithPassword,
} from '../../utils/pdfEngine';
import {
  compressPdfRasterized,
  getPdfInfo,
  repairPdfViaPdfJs,
  toPdfBlob,
  triggerBlobDownload,
} from '../../utils/pdfBrowser';

type OptimizeSecurityToolId =
  | 'compress-pdf'
  | 'repair-pdf'
  | 'protect-pdf'
  | 'unlock-pdf';

interface OptimizeSecurityWorkspaceProps {
  toolId: OptimizeSecurityToolId;
  initialFiles?: File[];
}

export function OptimizeSecurityWorkspace({
  toolId,
  initialFiles,
}: OptimizeSecurityWorkspaceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [fileEncrypted, setFileEncrypted] = useState(false);

  // Compress
  const [compressPreset, setCompressPreset] = useState<'structural' | 'balanced' | 'strong'>(
    'balanced',
  );

  // Protect & Unlock
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);
  const [allowModifying, setAllowModifying] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  const loadFiles = async (files: File[]) => {
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
    if (toolId !== 'repair-pdf' && !hasPdfMagicHeader(bytes)) {
      setUploadError(`"${selected.name}" is not a valid PDF document.`);
      return;
    }

    try {
      const info = await getPdfInfo(bytes);
      if (toolId === 'unlock-pdf') {
        if (!info.isEncrypted) {
          setUploadError(
            `"${selected.name}" is not password-protected. No unlocking needed.`,
          );
          return;
        }
        setFileEncrypted(true);
      } else if (info.isEncrypted && toolId !== 'repair-pdf') {
        setUploadError(
          `"${selected.name}" is already password-protected. Unlock it first using Unlock PDF.`,
        );
        return;
      }

      setFile(selected);
      setPdfBytes(bytes);
      setPageCount(info.pageCount);
    } catch {
      if (toolId === 'repair-pdf') {
        // Allow potentially damaged PDFs into Repair workspace
        setFile(selected);
        setPdfBytes(bytes);
        setPageCount(0);
      } else {
        setUploadError(
          `Could not read "${selected.name}". Try Repair PDF if the file structure is damaged.`,
        );
      }
    }
  };

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      void loadFiles(initialFiles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    setFile(null);
    setPdfBytes(null);
    setPageCount(0);
    setFileEncrypted(false);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setUploadError(null);
    setProcessError(null);
    setResult(null);
    setProgress(0);
  };

  const handleExecute = async () => {
    if (!pdfBytes || !file) return;
    setIsProcessing(true);
    setProgress(15);
    setProcessError(null);
    setResult(null);

    const baseName = stripExtension(file.name);

    try {
      if (toolId === 'compress-pdf') {
        let outBytes: Uint8Array;
        let note = '';
        if (compressPreset === 'structural') {
          outBytes = await compressPdfStructural(pdfBytes);
          note = 'Lossless structural optimization applied (vector text preserved).';
        } else {
          outBytes = await compressPdfRasterized(pdfBytes, compressPreset, setProgress);
          note =
            compressPreset === 'balanced'
              ? 'Balanced 150 DPI optimization applied across all pages.'
              : 'Strong 105 DPI compression applied for minimal file footprint.';
        }

        setProgress(100);
        const blob = toPdfBlob(outBytes);
        const savedPct = Math.round(((file.size - blob.size) / file.size) * 100);
        setResult({
          blob,
          filename: `${baseName}-compressed.pdf`,
          summary:
            savedPct > 0
              ? `${note} Reduced size by ${savedPct}%.`
              : `${note} This PDF is already tightly compressed; try Balanced or Strong mode if you need further reduction.`,
          originalBytes: file.size,
          outputBytes: blob.size,
        });
      } else if (toolId === 'repair-pdf') {
        let repaired: { bytes: Uint8Array; pagesRecovered: number; notes: string };
        try {
          repaired = await repairPdfStructural(pdfBytes);
          setProgress(85);
        } catch {
          repaired = await repairPdfViaPdfJs(pdfBytes, setProgress);
        }

        setProgress(100);
        const blob = toPdfBlob(repaired.bytes);
        setResult({
          blob,
          filename: `${baseName}-repaired.pdf`,
          summary: `Recovered ${repaired.pagesRecovered} page(s). ${repaired.notes}`,
          originalBytes: file.size,
          outputBytes: blob.size,
        });
      } else if (toolId === 'protect-pdf') {
        if (password.length < 4) {
          throw new Error('Password must be at least 4 characters long.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter carefully.');
        }

        setProgress(45);
        const encryptedBytes = await protectPdfWithPassword(pdfBytes, {
          userPassword: password,
          allowPrinting,
          allowCopying,
          allowModifying,
        });
        setProgress(100);

        const blob = toPdfBlob(encryptedBytes);
        setResult({
          blob,
          filename: `${baseName}-protected.pdf`,
          summary: 'Encrypted PDF with AES-256 password protection.',
          originalBytes: file.size,
          outputBytes: blob.size,
        });
      } else if (toolId === 'unlock-pdf') {
        if (!password) {
          throw new Error('Enter the authorized open password for this PDF.');
        }
        setProgress(45);
        const unlockedBytes = await unlockPdfWithPassword(pdfBytes, password);
        setProgress(100);

        const blob = toPdfBlob(unlockedBytes);
        setResult({
          blob,
          filename: `${baseName}-unlocked.pdf`,
          summary: 'Verified authorized password and saved an unprotected PDF copy.',
          originalBytes: file.size,
          outputBytes: blob.size,
        });
      }
    } catch (err) {
      setProcessError(
        err instanceof Error ? err.message : 'Unable to process this PDF.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!file && (
        <FileDropzone
          accept=".pdf,application/pdf"
          label={
            toolId === 'unlock-pdf'
              ? 'Drop a password-protected PDF here'
              : toolId === 'repair-pdf'
                ? 'Drop a damaged PDF file here to attempt repair'
                : 'Drop a PDF file here'
          }
          hint="All optimization and encryption runs strictly in local browser memory."
          buttonText="Select PDF File"
          onFilesSelected={loadFiles}
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
                {formatBytes(file.size)}
                {pageCount > 0 ? ` · ${pageCount} pages` : ''}
                {fileEncrypted ? ' · Encrypted' : ''}
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

          <div className="p-5 space-y-5">
            {toolId === 'compress-pdf' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-900">
                  Select Compression Method
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        id: 'structural',
                        title: 'Lossless Structural',
                        desc: 'Keeps crisp vector text and strips redundant metadata & objects.',
                      },
                      {
                        id: 'balanced',
                        title: 'Balanced (150 DPI)',
                        desc: 'Re-compresses heavy page graphics for clear reading & smaller size.',
                      },
                      {
                        id: 'strong',
                        title: 'Maximum (105 DPI)',
                        desc: 'Smallest footprint for fast email sharing; reduces image detail.',
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setCompressPreset(opt.id);
                        setResult(null);
                      }}
                      className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                        compressPreset === opt.id
                          ? 'border-blue-600 bg-blue-50/70'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <p className="font-display text-sm font-semibold text-slate-900">
                        {opt.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {toolId === 'repair-pdf' && (
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-sm text-slate-700 space-y-1.5">
                <p className="font-medium text-slate-900">How Browser PDF Repair Works</p>
                <p className="text-xs leading-relaxed">
                  FILEVIO inspects leading corrupted bytes, repairs broken cross-reference (xref) tables, and rebuilds the page tree locally. Severely truncated files missing core page streams cannot always be restored.
                </p>
              </div>
            )}

            {toolId === 'protect-pdf' && (
              <div className="space-y-5 max-w-lg">
                <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Uses AES-256 PDF encryption locally in your browser. Your password is never transmitted or stored.
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="protect-password"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Document Open Password (minimum 4 characters)
                    </label>
                    <div className="relative">
                      <input
                        id="protect-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setResult(null);
                        }}
                        placeholder="Enter strong password"
                        className="w-full pl-3.5 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="protect-confirm"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Confirm Password
                    </label>
                    <input
                      id="protect-confirm"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setResult(null);
                      }}
                      placeholder="Re-enter password"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-slate-700">Reader Permissions</p>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowPrinting}
                        onChange={(e) => setAllowPrinting(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-700"
                      />
                      <span>Allow printing</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowCopying}
                        onChange={(e) => setAllowCopying(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-700"
                      />
                      <span>Allow text copying</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowModifying}
                        onChange={(e) => setAllowModifying(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-700"
                      />
                      <span>Allow editing</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {toolId === 'unlock-pdf' && (
              <div className="space-y-4 max-w-md">
                <p className="text-xs text-slate-600 leading-relaxed">
                  FILEVIO only decrypts documents when you provide the authorized password. It does not bypass or crack unauthorized encryption.
                </p>
                <div>
                  <label
                    htmlFor="unlock-password"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Authorized PDF Password
                  </label>
                  <div className="relative">
                    <input
                      id="unlock-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setResult(null);
                      }}
                      placeholder="Enter authorized password"
                      className="w-full pl-3.5 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={handleExecute}
              disabled={isProcessing}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {toolId === 'compress-pdf' && 'Compress PDF'}
              {toolId === 'repair-pdf' && 'Repair PDF'}
              {toolId === 'protect-pdf' && 'Encrypt & Protect PDF'}
              {toolId === 'unlock-pdf' && 'Unlock PDF'}
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
