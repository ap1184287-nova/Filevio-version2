import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Cpu, Globe } from 'lucide-react';
import { usePageSeo } from '../utils/seo';
import securityStudioImg from '../assets/images/filevio_security_architecture_1795267868777.jpg';

export function AboutPage() {
  usePageSeo({
    title: 'About FILEVIO — Your Files, Simplified',
    description:
      'Learn how FILEVIO delivers fast, private, browser-based PDF and document tools without mandatory signups or server uploads.',
  });

  return (
    <div className="bg-white py-12 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            About FILEVIO
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
            Your Files, Simplified. FILEVIO is a browser-first PDF and document utility platform engineered for individuals, students, and global teams who value speed and privacy.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
          <img
            src={securityStudioImg}
            alt="FILEVIO minimalist paper architecture representing precision document handling"
            referrerPolicy="no-referrer"
            className="w-full max-h-[380px] object-cover"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <Cpu className="w-6 h-6 text-blue-700" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Client-Side Engine
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              PDF assembly, page rendering, encryption, and image conversions execute directly in your browser using open standards like pdf-lib, PDF.js, JSZip, and Mammoth.js.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <ShieldCheck className="w-6 h-6 text-blue-700" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Privacy First
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We never upload your documents to external processing servers, never collect document passwords, and clear temporary buffers as soon as you reset or leave a workspace.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <Globe className="w-6 h-6 text-blue-700" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Built for Every Device
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Responsive workspaces adapt cleanly across iPhone, Android, tablets, and wide desktop displays with zero account walls or popups.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
