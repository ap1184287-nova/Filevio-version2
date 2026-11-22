import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Search } from 'lucide-react';
import { FAQ_ITEMS } from '../data/tools';
import { usePageSeo } from '../utils/seo';

export function PrivacyPage() {
  usePageSeo({
    title: 'Privacy Policy — FILEVIO',
    description:
      'FILEVIO Privacy Policy: documents are processed locally in your browser without third-party uploads or password collection.',
  });

  return (
    <div className="bg-white py-12 sm:py-16">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-slate-700 leading-relaxed">
        <div className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-500">Effective Date: November 2026</p>
        </div>

        <section className="space-y-2.5">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            1. Local Browser Processing
          </h2>
          <p className="text-sm sm:text-base">
            FILEVIO processes PDFs, images, Word (.docx) files, and HTML documents locally inside your web browser. Your files are not transmitted to FILEVIO servers or third-party cloud processors.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            2. Passwords and Sensitive Documents
          </h2>
          <p className="text-sm sm:text-base">
            Passwords entered in Protect PDF or Unlock PDF remain strictly in volatile memory during the encryption or decryption step and are cleared immediately when you click Reset Workspace or navigate away. FILEVIO never logs, stores, or transmits passwords.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            3. Browser Storage
          </h2>
          <p className="text-sm sm:text-base">
            FILEVIO uses your browser&apos;s <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">localStorage</code> solely to remember your Recently Used Tools list on the homepage. You can clear this list anytime with one click on the homepage. No personal file bytes or filenames are stored in <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">localStorage</code>.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            4. No Mandatory Accounts or Tracking
          </h2>
          <p className="text-sm sm:text-base">
            FILEVIO does not require account registration, payment details, or advertising cookies to access any of its 21 document tools.
          </p>
        </section>
      </article>
    </div>
  );
}

export function TermsPage() {
  usePageSeo({
    title: 'Terms of Service — FILEVIO',
    description:
      'FILEVIO Terms of Service governing client-side PDF utilities, authorized decryption, and acceptable usage.',
  });

  return (
    <div className="bg-white py-12 sm:py-16">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-slate-700 leading-relaxed">
        <div className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-500">Effective Date: November 2026</p>
        </div>

        <section className="space-y-2.5">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            1. Acceptable Use
          </h2>
          <p className="text-sm sm:text-base">
            You may use FILEVIO for lawful personal, academic, and commercial document workflows. You retain full ownership and responsibility for all files processed in your browser.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            2. Authorized Password Decryption
          </h2>
          <p className="text-sm sm:text-base">
            The Unlock PDF tool requires the valid authorized password for the document. You confirm that you hold lawful authority to decrypt any protected document you process.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            3. Conversion Accuracy & Backups
          </h2>
          <p className="text-sm sm:text-base">
            Always keep backup copies of important original documents. Complex Word (.docx), HTML, or heavily corrupted PDF structures may simplify during client-side browser rendering or repair.
          </p>
        </section>
      </article>
    </div>
  );
}

export function FaqPage() {
  usePageSeo({
    title: 'Frequently Asked Questions — FILEVIO',
    description:
      'Common questions about FILEVIO PDF tools, browser-side privacy, encryption, and file conversion.',
  });

  const [query, setQuery] = useState('');
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (i) =>
        i.question.toLowerCase().includes(q) ||
        i.answer.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="bg-white py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Frequently Asked Questions
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Everything you need to know about FILEVIO&apos;s local PDF tools.
          </p>
        </div>

        <div className="relative">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter FAQ questions..."
            aria-label="Filter FAQ questions"
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">
              No questions matched your search.
            </p>
          ) : (
            items.map((item, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div key={item.question}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="font-display text-sm sm:text-base font-semibold text-slate-900">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-blue-700' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  usePageSeo({
    title: 'Page Not Found — FILEVIO',
    description: 'Return to FILEVIO to access all 21 free browser-based PDF tools.',
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center space-y-5">
      <h1 className="font-display text-3xl font-bold text-slate-900">
        Page not found
      </h1>
      <p className="text-slate-600">
        The page you requested could not be found. Browse all FILEVIO PDF tools from the homepage.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Go to Homepage
      </Link>
    </div>
  );
}
