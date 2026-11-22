import React, { useId, useRef, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface FileDropzoneProps {
  accept: string;
  multiple?: boolean;
  label: string;
  hint: string;
  buttonText?: string;
  onFilesSelected: (files: File[]) => void;
  error?: string | null;
  compact?: boolean;
}

export function FileDropzone({
  accept,
  multiple = false,
  label,
  hint,
  buttonText = 'Select Files',
  onFilesSelected,
  error,
  compact = false,
}: FileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    onFilesSelected(multiple ? files : [files[0]]);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed transition-colors duration-150 ${
          isDragging
            ? 'border-blue-600 bg-blue-50/80'
            : 'border-slate-300 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/30'
        } ${compact ? 'p-6' : 'p-8 sm:p-10'}`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />

        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
            <Upload className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
          </div>

          <p className="font-display text-base sm:text-lg font-semibold text-slate-900">
            {label}
          </p>
          <p className="mt-1.5 text-sm text-slate-600">{hint}</p>

          <label
            htmlFor={inputId}
            className="mt-5 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 focus-within:ring-2 focus-within:ring-blue-600"
          >
            {buttonText}
          </label>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
