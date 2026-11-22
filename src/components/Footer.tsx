import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Summary */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <BrandMark />
            </Link>
            <p className="text-sm font-medium text-slate-900">Your Files, Simplified.</p>
            <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
              FILEVIO is a browser-first PDF and document workspace built for speed, clarity, and local privacy. Process files directly on your device with no mandatory signups.
            </p>
          </div>

          {/* Organization & Optimization */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Organize & Optimize</h2>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li><Link to="/tool/merge-pdf" className="hover:text-blue-700 transition-colors">Merge PDF</Link></li>
              <li><Link to="/tool/split-pdf" className="hover:text-blue-700 transition-colors">Split PDF</Link></li>
              <li><Link to="/tool/organize-pdf" className="hover:text-blue-700 transition-colors">Organize PDF</Link></li>
              <li><Link to="/tool/rotate-pdf" className="hover:text-blue-700 transition-colors">Rotate PDF</Link></li>
              <li><Link to="/tool/compress-pdf" className="hover:text-blue-700 transition-colors">Compress PDF</Link></li>
              <li><Link to="/tool/repair-pdf" className="hover:text-blue-700 transition-colors">Repair PDF</Link></li>
            </ul>
          </div>

          {/* Convert & Edit */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Convert & Edit</h2>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li><Link to="/tool/jpg-to-pdf" className="hover:text-blue-700 transition-colors">JPG to PDF</Link></li>
              <li><Link to="/tool/pdf-to-jpg" className="hover:text-blue-700 transition-colors">PDF to JPG</Link></li>
              <li><Link to="/tool/word-to-pdf" className="hover:text-blue-700 transition-colors">Word to PDF</Link></li>
              <li><Link to="/tool/html-to-pdf" className="hover:text-blue-700 transition-colors">HTML to PDF</Link></li>
              <li><Link to="/tool/sign-pdf" className="hover:text-blue-700 transition-colors">Sign PDF</Link></li>
              <li><Link to="/tool/protect-pdf" className="hover:text-blue-700 transition-colors">Protect PDF</Link></li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Company & Legal</h2>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li><Link to="/about" className="hover:text-blue-700 transition-colors">About FILEVIO</Link></li>
              <li><Link to="/faq" className="hover:text-blue-700 transition-colors">FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-blue-700 transition-colors">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-blue-700 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-blue-700 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {year} FILEVIO. All rights reserved. Local browser-side document processing.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-slate-800 transition-colors">Privacy</Link>
            <span aria-hidden="true">·</span>
            <Link to="/terms" className="hover:text-slate-800 transition-colors">Terms</Link>
            <span aria-hidden="true">·</span>
            <Link to="/contact" className="hover:text-slate-800 transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
