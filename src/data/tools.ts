export type ToolCategoryId =
  | 'organization'
  | 'conversion'
  | 'optimization'
  | 'editing'
  | 'security';

export interface ToolCategory {
  id: ToolCategoryId;
  label: string;
  description: string;
}

export interface PdfTool {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  category: ToolCategoryId;
  popular?: boolean;
  accept: string;
  acceptLabel: string;
  multiple: boolean;
  keywords: string[];
  iconName:
    | 'merge'
    | 'split'
    | 'organize'
    | 'rotate'
    | 'trash'
    | 'extract'
    | 'image-jpg'
    | 'image-png'
    | 'pdf-jpg'
    | 'pdf-png'
    | 'word'
    | 'html'
    | 'compress'
    | 'repair'
    | 'hash'
    | 'stamp'
    | 'pen'
    | 'edit'
    | 'type'
    | 'lock'
    | 'unlock';
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'organization',
    label: 'PDF Organization',
    description: 'Combine, split, reorder, rotate, and trim pages cleanly.',
  },
  {
    id: 'conversion',
    label: 'PDF Conversion',
    description: 'Convert between PDF, JPG, PNG, Word DOCX, and HTML.',
  },
  {
    id: 'optimization',
    label: 'PDF Optimization',
    description: 'Reduce file footprint and repair damaged PDF structures.',
  },
  {
    id: 'editing',
    label: 'PDF Editing',
    description: 'Add page numbers, watermarks, signatures, text, and annotations.',
  },
  {
    id: 'security',
    label: 'PDF Security',
    description: 'Encrypt PDFs with AES-256 passwords or unlock authorized files.',
  },
];

export const PDF_TOOLS: PdfTool[] = [
  // PDF ORGANIZATION (6)
  {
    id: 'merge-pdf',
    slug: 'merge-pdf',
    name: 'Merge PDF',
    shortDescription: 'Combine multiple PDF documents into one ordered file.',
    longDescription:
      'Combine two or more PDF files in any order you choose. Reorder documents before merging and download a single unified PDF.',
    category: 'organization',
    popular: true,
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF files (.pdf)',
    multiple: true,
    keywords: ['combine', 'join', 'append', 'bind', 'concat'],
    iconName: 'merge',
  },
  {
    id: 'split-pdf',
    slug: 'split-pdf',
    name: 'Split PDF',
    shortDescription: 'Separate a PDF into custom ranges or individual pages.',
    longDescription:
      'Divide a large PDF into custom page ranges, fixed-size chunks, or individual single-page PDFs bundled in a ZIP archive.',
    category: 'organization',
    popular: true,
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['separate', 'divide', 'cut', 'ranges', 'burst'],
    iconName: 'split',
  },
  {
    id: 'organize-pdf',
    slug: 'organize-pdf',
    name: 'Organize PDF',
    shortDescription: 'Reorder, rotate, duplicate, or remove pages visually.',
    longDescription:
      'Inspect every page thumbnail and rearrange the sequence, rotate individual sheets, duplicate key pages, or drop unwanted ones.',
    category: 'organization',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['reorder', 'rearrange', 'sort', 'pages', 'duplicate'],
    iconName: 'organize',
  },
  {
    id: 'rotate-pdf',
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    shortDescription: 'Rotate all or selected PDF pages by 90°, 180°, or 270°.',
    longDescription:
      'Fix sideways scans or upside-down sheets. Apply rotation across the entire document or select specific pages with live preview.',
    category: 'organization',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['turn', 'orientation', 'landscape', 'portrait', 'angle'],
    iconName: 'rotate',
  },
  {
    id: 'delete-pages',
    slug: 'delete-pages',
    name: 'Delete PDF Pages',
    shortDescription: 'Remove unwanted pages from your PDF document.',
    longDescription:
      'Click page thumbnails or enter page ranges to permanently remove blank or unnecessary pages and save a clean PDF.',
    category: 'organization',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['remove', 'trim', 'drop', 'pages'],
    iconName: 'trash',
  },
  {
    id: 'extract-pages',
    slug: 'extract-pages',
    name: 'Extract PDF Pages',
    shortDescription: 'Save selected pages as a new PDF or separate files.',
    longDescription:
      'Pick exact pages from a document and export them either as a single combined PDF or as individual files in a ZIP.',
    category: 'organization',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['pull', 'export', 'subset', 'pages'],
    iconName: 'extract',
  },

  // PDF CONVERSION (6)
  {
    id: 'jpg-to-pdf',
    slug: 'jpg-to-pdf',
    name: 'JPG to PDF',
    shortDescription: 'Convert JPG or JPEG images into a formatted PDF.',
    longDescription:
      'Turn one or multiple JPG photos and scans into a single PDF with configurable page size, orientation, and margins.',
    category: 'conversion',
    accept: '.jpg,.jpeg,image/jpeg',
    acceptLabel: 'JPG / JPEG images (.jpg, .jpeg)',
    multiple: true,
    keywords: ['jpeg', 'photo', 'image', 'picture', 'scan'],
    iconName: 'image-jpg',
  },
  {
    id: 'png-to-pdf',
    slug: 'png-to-pdf',
    name: 'PNG to PDF',
    shortDescription: 'Turn PNG screenshots and graphics into a clean PDF.',
    longDescription:
      'Combine PNG images into a multi-page PDF document while preserving image sharpness, aspect ratio, and custom margins.',
    category: 'conversion',
    accept: '.png,image/png',
    acceptLabel: 'PNG images (.png)',
    multiple: true,
    keywords: ['screenshot', 'graphics', 'image', 'lossless'],
    iconName: 'image-png',
  },
  {
    id: 'pdf-to-jpg',
    slug: 'pdf-to-jpg',
    name: 'PDF to JPG',
    shortDescription: 'Render PDF pages into high-resolution JPG images.',
    longDescription:
      'Convert every page or chosen pages of your PDF into crisp JPG files with adjustable DPI scale and JPEG quality.',
    category: 'conversion',
    popular: true,
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['jpeg', 'export', 'render', 'images', 'pictures'],
    iconName: 'pdf-jpg',
  },
  {
    id: 'pdf-to-png',
    slug: 'pdf-to-png',
    name: 'PDF to PNG',
    shortDescription: 'Export PDF pages as lossless PNG images.',
    longDescription:
      'Render PDF pages as sharp, lossless PNG files ideal for presentations, documentation, and web publishing.',
    category: 'conversion',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['lossless', 'export', 'render', 'images', 'screenshots'],
    iconName: 'pdf-png',
  },
  {
    id: 'word-to-pdf',
    slug: 'word-to-pdf',
    name: 'Word to PDF',
    shortDescription: 'Convert DOCX Word documents into downloadable PDFs.',
    longDescription:
      'Extract text, headings, lists, tables, and embedded images from .docx files in your browser and export a formatted PDF.',
    category: 'conversion',
    popular: true,
    accept:
      '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    acceptLabel: 'Word documents (.docx)',
    multiple: false,
    keywords: ['docx', 'document', 'microsoft word', 'writer'],
    iconName: 'word',
  },
  {
    id: 'html-to-pdf',
    slug: 'html-to-pdf',
    name: 'HTML to PDF',
    shortDescription: 'Convert HTML files or markup snippets into a PDF.',
    longDescription:
      'Upload an .html file or paste sanitized HTML markup, preview the rendered layout, and export a paginated PDF.',
    category: 'conversion',
    accept: '.html,.htm,text/html',
    acceptLabel: 'HTML files (.html, .htm) or pasted markup',
    multiple: false,
    keywords: ['webpage', 'markup', 'code', 'web', 'print'],
    iconName: 'html',
  },

  // PDF OPTIMIZATION (2)
  {
    id: 'compress-pdf',
    slug: 'compress-pdf',
    name: 'Compress PDF',
    shortDescription: 'Shrink PDF file size with lossless or image compression.',
    longDescription:
      'Optimize PDF structure losslessly or re-compress heavy page imagery at balanced DPI settings with clear before-and-after size reporting.',
    category: 'optimization',
    popular: true,
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['shrink', 'reduce', 'size', 'optimize', 'smaller'],
    iconName: 'compress',
  },
  {
    id: 'repair-pdf',
    slug: 'repair-pdf',
    name: 'Repair PDF',
    shortDescription: 'Rebuild damaged cross-reference tables and headers.',
    longDescription:
      'Recover readable pages from PDFs with malformed headers, broken xref tables, or trailing bytes by rebuilding a valid PDF structure.',
    category: 'optimization',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['fix', 'recover', 'corrupted', 'broken', 'xref'],
    iconName: 'repair',
  },

  // PDF EDITING (5)
  {
    id: 'add-page-numbers',
    slug: 'add-page-numbers',
    name: 'Add Page Numbers',
    shortDescription: 'Stamp customizable page numbers across your PDF.',
    longDescription:
      'Insert clean vector page numbers in your preferred corner or center margin, choose formatting like "1 of N", and optionally skip the cover page.',
    category: 'editing',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['pagination', 'numbering', 'footer', 'header'],
    iconName: 'hash',
  },
  {
    id: 'add-watermark',
    slug: 'add-watermark',
    name: 'Add Watermark',
    shortDescription: 'Apply custom text or image watermarks to every page.',
    longDescription:
      'Overlay semi-transparent text or logo watermarks with precise control over angle, opacity, scale, and placement.',
    category: 'editing',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['stamp', 'brand', 'confidential', 'draft', 'logo'],
    iconName: 'stamp',
  },
  {
    id: 'sign-pdf',
    slug: 'sign-pdf',
    name: 'Sign PDF',
    shortDescription: 'Draw, type, or upload your signature onto a PDF.',
    longDescription:
      'Create a crisp signature using the drawing pad, typed lettering, or image upload, then click directly on your PDF page to position it.',
    category: 'editing',
    popular: true,
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['signature', 'esign', 'autograph', 'initials', 'contract'],
    iconName: 'pen',
  },
  {
    id: 'edit-pdf',
    slug: 'edit-pdf',
    name: 'Edit PDF',
    shortDescription: 'Add text, highlights, shapes, and freehand annotations.',
    longDescription:
      'Inspect pages interactively and place text notes, colored highlights, redaction/whiteout boxes, or ink markings before saving.',
    category: 'editing',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['annotate', 'highlight', 'draw', 'redact', 'markup'],
    iconName: 'edit',
  },
  {
    id: 'add-text',
    slug: 'add-text',
    name: 'Add Text to PDF',
    shortDescription: 'Click anywhere on a PDF page to place formatted text.',
    longDescription:
      'Fill in non-interactive forms, add dates, or insert notes directly onto exact page coordinates with live visual placement.',
    category: 'editing',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['type', 'fill', 'label', 'note', 'form'],
    iconName: 'type',
  },

  // PDF SECURITY (2)
  {
    id: 'protect-pdf',
    slug: 'protect-pdf',
    name: 'Protect PDF',
    shortDescription: 'Encrypt your PDF with an AES-256 password.',
    longDescription:
      'Lock sensitive PDFs with strong AES-256 password encryption and optional printing, copying, and modification permissions.',
    category: 'security',
    accept: '.pdf,application/pdf',
    acceptLabel: 'PDF file (.pdf)',
    multiple: false,
    keywords: ['password', 'encrypt', 'lock', 'security', 'aes'],
    iconName: 'lock',
  },
  {
    id: 'unlock-pdf',
    slug: 'unlock-pdf',
    name: 'Unlock PDF',
    shortDescription: 'Remove password protection using an authorized password.',
    longDescription:
      'Decrypt and save an unprotected copy of a PDF when you already hold the authorized open password.',
    category: 'security',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Encrypted PDF file (.pdf)',
    multiple: false,
    keywords: ['decrypt', 'remove password', 'unprotect', 'open'],
    iconName: 'unlock',
  },
];

export const TOOL_BY_SLUG = new Map<string, PdfTool>(
  PDF_TOOLS.map((tool) => [tool.slug, tool]),
);

export const FAQ_ITEMS = [
  {
    question: 'Are my documents uploaded to external servers?',
    answer:
      'No. FILEVIO processes your PDFs, images, and documents directly inside your web browser using local JavaScript engines. Your files stay on your device and are cleared from temporary memory when you reset or leave a workspace.',
  },
  {
    question: 'Is FILEVIO free to use without creating an account?',
    answer:
      'Yes. All 21 PDF tools are available immediately with no compulsory registration, no paywalls, and no watermarks added to your processed files.',
  },
  {
    question: 'Can Unlock PDF bypass forgotten passwords?',
    answer:
      'No. FILEVIO respects document security and encryption standards. Unlock PDF requires you to enter the valid authorized password to decrypt and save an unprotected copy.',
  },
  {
    question: 'What are the file size limits?',
    answer:
      'Because processing runs locally in browser memory, FILEVIO supports PDFs up to 100 MB per file and images, Word (.docx), or HTML files up to 25 MB each to keep your device responsive.',
  },
  {
    question: 'How reliable is Word (.docx) to PDF conversion in the browser?',
    answer:
      'FILEVIO uses Mammoth.js to extract headings, paragraphs, lists, tables, and embedded images from .docx files and renders them cleanly to PDF. Complex desktop-only features like custom embedded fonts, macros, or multi-column floating frames may simplify during browser layout.',
  },
  {
    question: 'Does FILEVIO work on iPhone, Android, and tablets?',
    answer:
      'Yes. Every workspace and homepage section is designed mobile-first with touch-friendly controls, responsive page previews, and native file picker support across iOS, Android, tablets, and desktops.',
  },
];
