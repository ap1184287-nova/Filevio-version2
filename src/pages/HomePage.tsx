import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  FileCheck2,
  Search,
  Shield,
  X,
} from 'lucide-react';
import {
  FAQ_ITEMS,
  PDF_TOOLS,
  PdfTool,
  TOOL_CATEGORIES,
  ToolCategoryId,
} from '../data/tools';
import { ToolCard } from '../components/ToolCard';
import { FileDropzone } from '../components/FileDropzone';
import { useFileTransfer } from '../context/TransferContext';
import { clearRecentTools, getRecentToolIds } from '../utils/recentTools';
import { formatBytes, validateFileMeta } from '../utils/fileValidation';
import { usePageSeo } from '../utils/seo';
import securityStudioImg from '../assets/images/filevio_security_architecture_1795267868777.jpg';

const POPULAR_TOOLS = PDF_TOOLS.filter((t) => t.popular);

const SINGLE_PDF_QUICK_TARGETS = [
  'split-pdf',
  'compress-pdf',
  'sign-pdf',
  'edit-pdf',
  'pdf-to-jpg',
  'rotate-pdf',
  'protect-pdf',
  'unlock-pdf',
];

export function HomePage() {
  const navigate = useNavigate();
  const { setPendingFiles } = useFileTransfer();

  usePageSeo({
    title: 'FILEVIO — Everything You Need to Work with PDFs',
    description:
      'Your Files, Simplified. Merge, split, compress, convert, edit, sign, and protect PDF files locally in your browser with FILEVIO.',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | ToolCategoryId>('all');
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentToolIds());
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Smart Dropzone state
  const [dropError, setDropError] = useState<string | null>(null);
  const [droppedSinglePdf, setDroppedSinglePdf] = useState<File | null>(null);
  const [imgError, setImgError] = useState(false);

  const recentTools = useMemo(() => {
    return recentIds
      .map((id) => PDF_TOOLS.find((t) => t.id === id))
      .filter((t): t is PdfTool => Boolean(t));
  }, [recentIds]);

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PDF_TOOLS.filter((tool) => {
      const matchesCat =
        activeCategory === 'all' || tool.category === activeCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.shortDescription.toLowerCase().includes(q) ||
        tool.keywords.some((kw) => kw.includes(q))
      );
    });
  }, [searchQuery, activeCategory]);

  const handleSmartFilesDropped = (files: File[]) => {
    setDropError(null);
    setDroppedSinglePdf(null);
    if (files.length === 0) return;

    const first = files[0];
    const lower = first.name.toLowerCase();

    if (lower.endsWith('.pdf') || first.type === 'application/pdf') {
      const validPdfs = files.filter((f) => validateFileMeta(f, 'pdf').valid);
      if (validPdfs.length !== files.length) {
        const firstInvalid = files.find((f) => !validateFileMeta(f, 'pdf').valid);
        setDropError(
          firstInvalid
            ? validateFileMeta(firstInvalid, 'pdf').error ?? 'Invalid PDF file.'
            : 'Invalid PDF file.',
        );
        return;
      }

      if (validPdfs.length >= 2) {
        setPendingFiles(validPdfs);
        navigate('/tool/merge-pdf');
        return;
      }

      setDroppedSinglePdf(validPdfs[0]);
      return;
    }

    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || first.type === 'image/jpeg') {
      const invalid = files.find((f) => !validateFileMeta(f, 'jpg').valid);
      if (invalid) {
        setDropError(validateFileMeta(invalid, 'jpg').error ?? 'Invalid JPG file.');
        return;
      }
      setPendingFiles(files);
      navigate('/tool/jpg-to-pdf');
      return;
    }

    if (lower.endsWith('.png') || first.type === 'image/png') {
      const invalid = files.find((f) => !validateFileMeta(f, 'png').valid);
      if (invalid) {
        setDropError(validateFileMeta(invalid, 'png').error ?? 'Invalid PNG file.');
        return;
      }
      setPendingFiles(files);
      navigate('/tool/png-to-pdf');
      return;
    }

    if (lower.endsWith('.docx')) {
      const check = validateFileMeta(first, 'docx');
      if (!check.valid) {
        setDropError(check.error ?? 'Invalid DOCX file.');
        return;
      }
      setPendingFiles([first]);
      navigate('/tool/word-to-pdf');
      return;
    }

    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      const check = validateFileMeta(first, 'html');
      if (!check.valid) {
        setDropError(check.error ?? 'Invalid HTML file.');
        return;
      }
      setPendingFiles([first]);
      navigate('/tool/html-to-pdf');
      return;
    }

    setDropError(
      `Unsupported file format "${first.name}". Drop PDF, JPG, PNG, DOCX, or HTML files.`,
    );
  };

  const launchToolWithSinglePdf = (slug: string) => {
    if (!droppedSinglePdf) return;
    setPendingFiles([droppedSinglePdf]);
    navigate(`/tool/${slug}`);
  };

  return (
    <div className="bg-white">
      {/* HERO & SMART DROPZONE */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-blue-50/55 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-sm font-medium text-blue-700">
                Your Files, Simplified.
              </p>
              <h1
                className="font-display font-bold tracking-tight text-slate-900 leading-[1.1]"
                style={{
                  fontSize: 'clamp(2.25rem, 4vw, 3.5rem)',
                  textWrap: 'balance',
                }}
              >
                Everything You Need to Work with PDFs.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                All your PDF tools in one simple place.
              </p>

              {/* Search PDF Tools Input */}
              <div className="max-w-lg">
                <label htmlFor="hero-tool-search" className="sr-only">
                  Search PDF tools
                </label>
                <div className="relative">
                  <Search
                    className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="hero-tool-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        setActiveCategory('all');
                      }
                    }}
                    placeholder="Search PDF tools (merge, compress, sign...)"
                    className="w-full pl-11 pr-10 py-3 text-sm bg-white border border-slate-300 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear tool search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Live quick search matches dropdown when typing in hero */}
                {searchQuery.trim().length > 0 && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-sm overflow-hidden">
                    {filteredTools.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-500">
                        No PDF tools match &ldquo;{searchQuery}&rdquo;.
                      </p>
                    ) : (
                      filteredTools.slice(0, 5).map((tool) => (
                        <Link
                          key={tool.id}
                          to={`/tool/${tool.slug}`}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50/60 transition-colors"
                        >
                          <span className="text-sm font-medium text-slate-900">
                            {tool.name}
                          </span>
                          <span className="text-xs text-slate-500 truncate ml-4">
                            {tool.shortDescription}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>21 browser-based tools</span>
                <span aria-hidden="true">·</span>
                <span>Zero server uploads</span>
                <span aria-hidden="true">·</span>
                <span>No registration required</span>
              </div>
            </div>

            {/* Smart Drag & Drop File Upload */}
            <div className="lg:col-span-6">
              {!droppedSinglePdf ? (
                <FileDropzone
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.html,.htm,application/pdf,image/jpeg,image/png,text/html"
                  multiple
                  label="Drop files here to start immediately"
                  hint="Drop 2+ PDFs to merge, 1 PDF to choose an action, or JPG, PNG, DOCX, HTML files."
                  buttonText="Choose File from Device"
                  onFilesSelected={handleSmartFilesDropped}
                  error={dropError}
                />
              ) : (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <FileCheck2
                        className="w-6 h-6 text-blue-700 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {droppedSinglePdf.name}
                        </p>
                        <p className="text-xs text-slate-600 tabular-nums mt-0.5">
                          {formatBytes(droppedSinglePdf.size)} · Choose a workspace to open this file:
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDroppedSinglePdf(null)}
                      aria-label="Clear selected file"
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SINGLE_PDF_QUICK_TARGETS.map((slug) => {
                      const t = PDF_TOOLS.find((item) => item.slug === slug);
                      if (!t) return null;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => launchToolWithSinglePdf(t.slug)}
                          className="px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-700 rounded-lg transition-colors text-left truncate cursor-pointer"
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* RECENTLY USED TOOLS (only visible when user has recent history) */}
      {recentTools.length > 0 && (
        <section
          aria-labelledby="recent-tools-heading"
          className="border-b border-slate-200 bg-slate-50/60 py-10"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h2
                id="recent-tools-heading"
                className="font-display text-lg font-semibold text-slate-900"
              >
                Recently Used Tools
              </h2>
              <button
                type="button"
                onClick={() => {
                  clearRecentTools();
                  setRecentIds([]);
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Clear History
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentTools.map((tool) => (
                <ToolCard key={`recent-${tool.id}`} tool={tool} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* POPULAR TOOLS */}
      <section aria-labelledby="popular-tools-heading" className="py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2
                id="popular-tools-heading"
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
              >
                Popular PDF Tools
              </h2>
              <p className="mt-1.5 text-sm sm:text-base text-slate-600">
                Most-used everyday workflows ready to launch in one click.
              </p>
            </div>
            <a
              href="#all-tools"
              className="text-sm font-medium text-blue-700 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Browse all 21 tools
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {POPULAR_TOOLS.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES & ALL PDF TOOLS */}
      <section id="all-tools" aria-labelledby="all-tools-heading" className="py-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h2
                id="all-tools-heading"
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
              >
                All PDF Tools
              </h2>
              <p className="mt-1.5 text-sm sm:text-base text-slate-600">
                Filter by category or search across every FILEVIO utility.
              </p>
            </div>

            {/* Category Segmented Tabs */}
            <div
              role="tablist"
              aria-label="Filter tools by category"
              className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-xl"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'all'}
                onClick={() => setActiveCategory('all')}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({PDF_TOOLS.length})
              </button>
              {TOOL_CATEGORIES.map((cat) => {
                const count = PDF_TOOLS.filter((t) => t.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat.label.replace('PDF ', '')} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {filteredTools.length === 0 ? (
            <div className="p-10 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-3">
              <p className="text-base font-medium text-slate-900">
                No tools found matching &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Reset Search & Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS & LOCAL PRIVACY ARCHITECTURE */}
      <section aria-labelledby="how-it-works-heading" className="py-16 border-b border-slate-200 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-8">
              <div>
                <h2
                  id="how-it-works-heading"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
                >
                  How FILEVIO Works
                </h2>
                <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                  Every document operation runs directly inside your browser tab—keeping confidential contracts, scans, and personal records on your own hardware.
                </p>
              </div>

              <ol className="space-y-6">
                <li className="space-y-1">
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    01. Select a Tool or Drop Your File
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Pick any of the 21 utilities or drop PDFs, images, Word documents, or HTML directly on the homepage.
                  </p>
                </li>
                <li className="space-y-1">
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    02. Preview & Configure Locally
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Inspect page thumbnails, reorder sheets, draw signatures, or adjust compression presets with real-time browser rendering.
                  </p>
                </li>
                <li className="space-y-1">
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    03. Download & Clear Workspace
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Save your finished PDF or ZIP archive instantly. Click Reset Workspace anytime to purge temporary memory buffers.
                  </p>
                </li>
              </ol>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                {!imgError ? (
                  <img
                    src={securityStudioImg}
                    alt="Layered pure white precision paper architecture with royal blue edge highlights"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-blue-50 via-white to-slate-100 flex flex-col items-center justify-center p-8 text-center">
                    <Shield className="w-10 h-10 text-blue-700 mb-3" />
                    <p className="font-display font-semibold text-slate-900">
                      Local Browser Processing Architecture
                    </p>
                  </div>
                )}
                <div className="p-5 border-t border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Private by Design
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Files never leave your browser without your action.
                    </p>
                  </div>
                  <Link
                    to="/privacy"
                    className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
                  >
                    Read Privacy Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section aria-labelledby="faq-heading" className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2
                id="faq-heading"
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
              >
                Frequently Asked Questions
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Answers about privacy, browser compatibility, and PDF conversion accuracy.
              </p>
            </div>
            <Link
              to="/faq"
              className="text-sm font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
            >
              View full FAQ
            </Link>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={item.question}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <span className="font-display text-sm sm:text-base font-semibold text-slate-900">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-blue-700' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
