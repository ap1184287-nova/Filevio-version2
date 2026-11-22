import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { PDF_TOOLS, TOOL_BY_SLUG, TOOL_CATEGORIES } from '../data/tools';
import { useFileTransfer } from '../context/TransferContext';
import { recordRecentTool } from '../utils/recentTools';
import { usePageSeo } from '../utils/seo';
import { ToolIcon } from '../components/ToolIcon';
import { ToolCard } from '../components/ToolCard';
import { MergeWorkspace } from '../components/workspaces/MergeWorkspace';
import { PageGridWorkspace } from '../components/workspaces/PageGridWorkspace';
import { ImageToPdfWorkspace } from '../components/workspaces/ImageToPdfWorkspace';
import { PdfToImageWorkspace } from '../components/workspaces/PdfToImageWorkspace';
import { DocumentToPdfWorkspace } from '../components/workspaces/DocumentToPdfWorkspace';
import { OptimizeSecurityWorkspace } from '../components/workspaces/OptimizeSecurityWorkspace';
import { EditingWorkspace } from '../components/workspaces/EditingWorkspace';

export function ToolPage() {
  const { slug } = useParams<{ slug: string }>();
  const tool = slug ? TOOL_BY_SLUG.get(slug) : undefined;
  const { consumePendingFiles } = useFileTransfer();

  const [initialFiles, setInitialFiles] = useState<File[]>([]);

  useEffect(() => {
    const incoming = consumePendingFiles();
    setInitialFiles(incoming);
    if (tool) {
      recordRecentTool(tool.id);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  usePageSeo({
    title: tool
      ? `${tool.name} — FILEVIO`
      : 'Tool Not Found — FILEVIO',
    description: tool
      ? `${tool.longDescription} Free, private browser-side PDF processing on FILEVIO.`
      : 'Explore all 21 free browser-based PDF tools on FILEVIO.',
  });

  if (!tool) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-5">
        <h1 className="font-display text-3xl font-bold text-slate-900">
          PDF tool not found
        </h1>
        <p className="text-slate-600">
          The workspace you requested does not exist. Choose any tool from the FILEVIO directory.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Tools
        </Link>
      </div>
    );
  }

  const category = TOOL_CATEGORIES.find((c) => c.id === tool.category);
  const relatedTools = PDF_TOOLS.filter(
    (t) => t.category === tool.category && t.id !== tool.id,
  ).slice(0, 4);

  const renderWorkspace = () => {
    switch (tool.id) {
      case 'merge-pdf':
        return <MergeWorkspace key={tool.id} initialFiles={initialFiles} />;
      case 'split-pdf':
      case 'organize-pdf':
      case 'rotate-pdf':
      case 'delete-pages':
      case 'extract-pages':
        return (
          <PageGridWorkspace
            key={tool.id}
            toolId={tool.id}
            initialFiles={initialFiles}
          />
        );
      case 'jpg-to-pdf':
        return (
          <ImageToPdfWorkspace
            key={tool.id}
            mode="jpg"
            initialFiles={initialFiles}
          />
        );
      case 'png-to-pdf':
        return (
          <ImageToPdfWorkspace
            key={tool.id}
            mode="png"
            initialFiles={initialFiles}
          />
        );
      case 'pdf-to-jpg':
        return (
          <PdfToImageWorkspace
            key={tool.id}
            format="jpg"
            initialFiles={initialFiles}
          />
        );
      case 'pdf-to-png':
        return (
          <PdfToImageWorkspace
            key={tool.id}
            format="png"
            initialFiles={initialFiles}
          />
        );
      case 'word-to-pdf':
        return (
          <DocumentToPdfWorkspace
            key={tool.id}
            mode="word"
            initialFiles={initialFiles}
          />
        );
      case 'html-to-pdf':
        return (
          <DocumentToPdfWorkspace
            key={tool.id}
            mode="html"
            initialFiles={initialFiles}
          />
        );
      case 'compress-pdf':
      case 'repair-pdf':
      case 'protect-pdf':
      case 'unlock-pdf':
        return (
          <OptimizeSecurityWorkspace
            key={tool.id}
            toolId={tool.id}
            initialFiles={initialFiles}
          />
        );
      case 'add-page-numbers':
      case 'add-watermark':
      case 'sign-pdf':
      case 'edit-pdf':
      case 'add-text':
        return (
          <EditingWorkspace
            key={tool.id}
            toolId={tool.id}
            initialFiles={initialFiles}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-50/40 min-h-[calc(100vh-16rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Breadcrumb & Back Link */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            All PDF Tools
          </Link>
          <span aria-hidden="true">/</span>
          <span>{category?.label}</span>
          <span aria-hidden="true">/</span>
          <span className="text-slate-900 font-medium">{tool.name}</span>
        </nav>

        {/* Tool Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <ToolIcon name={tool.iconName} className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {tool.name}
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
                {tool.longDescription}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 text-xs text-slate-600 shrink-0 pt-1">
            <ShieldCheck className="w-4 h-4 text-blue-700" aria-hidden="true" />
            <span>Processed locally in browser</span>
          </div>
        </div>

        {/* Active Functional Tool Workspace */}
        <div>{renderWorkspace()}</div>

        {/* Related Tools */}
        {relatedTools.length > 0 && (
          <section className="pt-8 border-t border-slate-200 space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              More {category?.label} Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedTools.map((rel) => (
                <ToolCard key={rel.id} tool={rel} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
