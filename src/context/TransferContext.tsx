import React, { createContext, useContext, useState } from 'react';

interface TransferContextValue {
  pendingFiles: File[];
  setPendingFiles: (files: File[]) => void;
  consumePendingFiles: () => File[];
  clearPendingFiles: () => void;
}

const TransferContext = createContext<TransferContextValue | null>(null);

export function TransferProvider({ children }: { children: React.ReactNode }) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const consumePendingFiles = () => {
    const current = pendingFiles;
    if (current.length > 0) {
      setPendingFiles([]);
    }
    return current;
  };

  const clearPendingFiles = () => setPendingFiles([]);

  return (
    <TransferContext.Provider
      value={{
        pendingFiles,
        setPendingFiles,
        consumePendingFiles,
        clearPendingFiles,
      }}
    >
      {children}
    </TransferContext.Provider>
  );
}

export function useFileTransfer(): TransferContextValue {
  const ctx = useContext(TransferContext);
  if (!ctx) {
    throw new Error('useFileTransfer must be used within TransferProvider');
  }
  return ctx;
}
