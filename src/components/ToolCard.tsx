import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PdfTool, TOOL_CATEGORIES } from '../data/tools';
import { ToolIcon } from './ToolIcon';

interface ToolCardProps {
  tool: PdfTool;
}

const categoryMap = new Map(TOOL_CATEGORIES.map((c) => [c.id, c.label]));

export function ToolCard({ tool }: ToolCardProps) {
  const categoryLabel = categoryMap.get(tool.category) ?? 'PDF Tool';

  return (
    <Link
      to={`/tool/${tool.slug}`}
      className="group flex flex-col justify-between p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/20 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
    >
      <div>
        <div className="flex items-start justify-between gap-4 mb-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-700 group-hover:text-white transition-colors duration-150">
            <ToolIcon name={tool.iconName} className="w-5 h-5" />
          </div>
          <ArrowRight
            className="w-4 h-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all duration-150 mt-1 shrink-0"
            aria-hidden="true"
          />
        </div>

        <h3 className="font-display text-base font-semibold text-slate-900 group-hover:text-blue-800 transition-colors">
          {tool.name}
        </h3>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
          {tool.shortDescription}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
        <span>{categoryLabel}</span>
        {tool.multiple && (
          <>
            <span aria-hidden="true">·</span>
            <span>Batch supported</span>
          </>
        )}
      </div>
    </Link>
  );
}
