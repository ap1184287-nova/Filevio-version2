import { useEffect, useState } from 'react';
import { Code2, Eye, FileText, Info } from 'lucide-react';
import { FileDropzone } from '../FileDropzone';
import { ProcessingStatus, ProcessedResult } from '../ProcessingStatus';
import {
  formatBytes,
  sanitizeHtmlForRender,
  stripExtension,
  validateFileMeta,
} from '../../utils/fileValidation';
import {
  convertDocxToPdf,
  convertHtmlToPdf,
  extractDocxToHtml,
  toPdfBlob,
  triggerBlobDownload,
} from '../../utils/pdfBrowser';

interface DocumentToPdfWorkspaceProps {
  mode: 'word' | 'html';
  initialFiles?: File[];
}

const DEFAULT_HTML_TEMPLATE = `<h1>Quarterly Project Brief</h1>
<p>Prepared with <strong>FILEVIO</strong> — clean local HTML to PDF rendering directly in your browser.</p>
<h2>Key Deliverables</h2>
<ul>
  <li>Executive summary and milestone schedule</li>
  <li>Budget allocation table</li>
  <li>Client sign-off checklist</li>
</ul>
<table>
  <thead>
    <tr><th>Phase</th><th>Owner</th><th>Target Date</th></tr>
  </thead>
  <tbody>
    <tr><td>Discovery</td><td>Product Team</td><td>Week 1–2</td></tr>
    <tr><td>Implementation</td><td>Engineering</td><td>Week 3–6</td></tr>
    <tr><td>Launch Review</td><td>Operations</td><td>Week 7</td></tr>
  </tbody>
</table>`;

export function DocumentToPdfWorkspace({
  mode,
  initialFiles,
}: DocumentToPdfWorkspaceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docxBuffer, setDocxBuffer] = useState<ArrayBuffer | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>(
    mode === 'html' ? DEFAULT_HTML_TEMPLATE : '',
  );
  const [docxWarnings, setDocxWarnings] = useState<string[]>([]);
  const [htmlTab, setHtmlTab] = useState<'code' | 'preview'>('code');

  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [marginPx, setMarginPx] = useState<number>(48);

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

    const check = validateFileMeta(selected, mode === 'word' ? 'docx' : 'html');
    if (!check.valid) {
      setUploadError(check.error ?? 'Invalid document file.');
      return;
    }

    try {
      if (mode === 'word') {
        const buffer = await selected.arrayBuffer();
        const extracted = await extractDocxToHtml(buffer);
        setFile(selected);
        setDocxBuffer(buffer);
        setPreviewHtml(extracted.html);
        setDocxWarnings(extracted.warnings);
      } else {
        const text = await selected.text();
        setFile(selected);
        setPreviewHtml(text);
        setHtmlTab('preview');
      }
    } catch {
      setUploadError(
        mode === 'word'
          ? `Could not extract "${selected.name}". Make sure it is a valid .docx file.`
          : `Could not read "${selected.name}".`,
      );
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
    setDocxBuffer(null);
    setPreviewHtml(mode === 'html' ? DEFAULT_HTML_TEMPLATE : '');
    setDocxWarnings([]);
    setUploadError(null);
    setProcessError(null);
    setResult(null);
    setProgress(0);
  };

  const handleConvert = async () => {
    setIsProcessing(true);
    setProgress(10);
    setProcessError(null);
    setResult(null);

    try {
      if (mode === 'word') {
        if (!docxBuffer || !file) {
          throw new Error('Select a .docx Word document first.');
        }
        const out = await convertDocxToPdf(
          docxBuffer,
          { pageSize, marginPx, printBackground: true },
          setProgress,
        );
        const blob = toPdfBlob(out.pdfBytes);
        setResult({
          blob,
          filename: `${stripExtension(file.name)}.pdf`,
          summary: `Converted "${file.name}" to a formatted ${pageSize.toUpperCase()} PDF.`,
          originalBytes: file.size,
          outputBytes: blob.size,
        });
      } else {
        if (!previewHtml.trim()) {
          throw new Error('Enter HTML markup or upload an .html file first.');
        }
        const pdfBytes = await convertHtmlToPdf(
          previewHtml,
          { pageSize, marginPx, printBackground: true },
          setProgress,
        );
        const blob = toPdfBlob(pdfBytes);
        const outName = file ? `${stripExtension(file.name)}.pdf` : 'filevio-html.pdf';
        setResult({
          blob,
          filename: outName,
          summary: `Converted HTML content into a paginated ${pageSize.toUpperCase()} PDF.`,
          originalBytes: file?.size,
          outputBytes: blob.size,
        });
      }
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Document conversion failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const sanitizedPreviewSrcDoc = `<!doctype html><html><head><style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; background: #fff; padding: 24px; line-height: 1.6; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
    th { background: #f1f5f9; }
    img { max-width: 100%; height: auto; }
  </style></head><body>${sanitizeHtmlForRender(previewHtml)}</body></html>`;

  return (
    <div className="space-y-6">
      {mode === 'word' && !file && (
        <FileDropzone
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          label="Drop a Word document (.docx) here"
          hint="Extracts headings, paragraphs, lists, tables, and embedded images locally in your browser."
          buttonText="Select DOCX File"
          onFilesSelected={loadFiles}
          error={uploadError}
        />
      )}

      {mode === 'html' && (
        <FileDropzone
          accept=".html,.htm,text/html"
          label={file ? `Loaded: ${file.name}` : 'Drop an .html file or edit markup below'}
          hint="Upload an HTML file or paste HTML directly into the editor below."
          buttonText={file ? 'Replace HTML File' : 'Upload HTML File'}
          onFilesSelected={loadFiles}
          error={uploadError}
          compact
        />
      )}

      {((mode === 'word' && file) || mode === 'html') && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {file && (
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {file.name}
                </span>
                <span className="text-xs text-slate-500 tabular-nums shrink-0">
                  {formatBytes(file.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-medium text-slate-600 hover:text-red-700 cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}

          {mode === 'word' && (
            <div className="px-5 py-3.5 bg-blue-50/70 border-b border-blue-100 flex items-start gap-2.5 text-xs text-slate-700">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p>
                  Browser-based DOCX conversion preserves paragraphs, headings, bold/italic text, lists, tables, and embedded images. Complex Word-only layouts (macros, custom desktop fonts, or floating text frames) may simplify.
                </p>
                {docxWarnings.length > 0 && (
                  <p className="text-slate-500">
                    Extraction note: {docxWarnings[0]}
                  </p>
                )}
              </div>
            </div>
          )}

          {mode === 'html' && (
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="inline-flex p-1 bg-slate-200/70 rounded-lg">
                <button
                  type="button"
                  onClick={() => setHtmlTab('code')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    htmlTab === 'code'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                  HTML Markup
                </button>
                <button
                  type="button"
                  onClick={() => setHtmlTab('preview')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    htmlTab === 'preview'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  Sanitized Preview
                </button>
              </div>
              <span className="text-xs text-slate-500">
                Scripts & event handlers are stripped automatically
              </span>
            </div>
          )}

          <div className="p-5">
            {mode === 'html' && htmlTab === 'code' ? (
              <div>
                <label htmlFor="html-source-editor" className="sr-only">
                  HTML Markup Input
                </label>
                <textarea
                  id="html-source-editor"
                  value={previewHtml}
                  onChange={(e) => {
                    setPreviewHtml(e.target.value);
                    setResult(null);
                  }}
                  rows={12}
                  spellCheck={false}
                  className="w-full p-4 font-mono text-xs sm:text-sm text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600">
                  Document Layout Preview
                </p>
                <iframe
                  title="Document conversion preview"
                  sandbox=""
                  srcDoc={sanitizedPreviewSrcDoc}
                  className="w-full h-80 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            )}
          </div>

          <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="grid grid-cols-2 gap-4 max-w-md w-full">
              <div>
                <label
                  htmlFor="doc-page-size"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Page Size
                </label>
                <select
                  id="doc-page-size"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(e.target.value as 'a4' | 'letter');
                    setResult(null);
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="a4">A4</option>
                  <option value="letter">US Letter</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="doc-margin"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Margins
                </label>
                <select
                  id="doc-margin"
                  value={marginPx}
                  onChange={(e) => {
                    setMarginPx(Number(e.target.value));
                    setResult(null);
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value={0}>None (0 px)</option>
                  <option value={28}>Compact (28 px)</option>
                  <option value={48}>Normal (48 px)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConvert}
              disabled={isProcessing}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {mode === 'word' ? 'Convert Word to PDF' : 'Convert HTML to PDF'}
            </button>
          </div>
        </div>
      )}

      <ProcessingStatus
        isProcessing={isProcessing}
        progress={progress}
        progressLabel="Rendering document to PDF..."
        error={processError}
        result={result}
        onDownload={() => result && triggerBlobDownload(result.blob, result.filename)}
        onReset={handleReset}
      />
    </div>
  );
}
