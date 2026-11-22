import {
  Combine,
  Scissors,
  LayoutGrid,
  RotateCw,
  Trash2,
  FileOutput,
  FileImage,
  Image as ImageIcon,
  FileText,
  Code2,
  Minimize2,
  Wrench,
  Hash,
  Stamp,
  PenTool,
  SquarePen,
  Type,
  Lock,
  Unlock,
} from 'lucide-react';
import { PdfTool } from '../data/tools';

interface ToolIconProps {
  name: PdfTool['iconName'];
  className?: string;
}

export function ToolIcon({ name, className = 'w-5 h-5' }: ToolIconProps) {
  const strokeWidth = 1.75;
  switch (name) {
    case 'merge':
      return <Combine className={className} strokeWidth={strokeWidth} />;
    case 'split':
      return <Scissors className={className} strokeWidth={strokeWidth} />;
    case 'organize':
      return <LayoutGrid className={className} strokeWidth={strokeWidth} />;
    case 'rotate':
      return <RotateCw className={className} strokeWidth={strokeWidth} />;
    case 'trash':
      return <Trash2 className={className} strokeWidth={strokeWidth} />;
    case 'extract':
      return <FileOutput className={className} strokeWidth={strokeWidth} />;
    case 'image-jpg':
    case 'image-png':
      return <ImageIcon className={className} strokeWidth={strokeWidth} />;
    case 'pdf-jpg':
    case 'pdf-png':
      return <FileImage className={className} strokeWidth={strokeWidth} />;
    case 'word':
      return <FileText className={className} strokeWidth={strokeWidth} />;
    case 'html':
      return <Code2 className={className} strokeWidth={strokeWidth} />;
    case 'compress':
      return <Minimize2 className={className} strokeWidth={strokeWidth} />;
    case 'repair':
      return <Wrench className={className} strokeWidth={strokeWidth} />;
    case 'hash':
      return <Hash className={className} strokeWidth={strokeWidth} />;
    case 'stamp':
      return <Stamp className={className} strokeWidth={strokeWidth} />;
    case 'pen':
      return <PenTool className={className} strokeWidth={strokeWidth} />;
    case 'edit':
      return <SquarePen className={className} strokeWidth={strokeWidth} />;
    case 'type':
      return <Type className={className} strokeWidth={strokeWidth} />;
    case 'lock':
      return <Lock className={className} strokeWidth={strokeWidth} />;
    case 'unlock':
      return <Unlock className={className} strokeWidth={strokeWidth} />;
  }
}
