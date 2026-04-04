import { useCallback } from 'react';

interface FilePickerProps {
  onFiles: (handles: FileSystemFileHandle[]) => void;
}

export function FilePicker({ onFiles }: FilePickerProps) {
  const handleSelectFiles = useCallback(async () => {
    try {
      const handles = await window.showOpenFilePicker({
        multiple: true,
        types: [{ accept: { 'audio/*': ['.mp3', '.wav'] } }],
      });
      if (handles.length > 0) onFiles(handles);
    } catch {
      // user cancelled
    }
  }, [onFiles]);

  return (
    <button
      onClick={handleSelectFiles}
      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
    >
      Select Files
    </button>
  );
}
