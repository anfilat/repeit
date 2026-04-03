import { useCallback } from 'react';

interface FilePickerProps {
  onFiles: (handles: FileSystemFileHandle[]) => void;
  onFolder: (dirHandle: FileSystemDirectoryHandle) => void;
}

export function FilePicker({ onFiles, onFolder }: FilePickerProps) {
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

  const handleSelectFolder = useCallback(async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      onFolder(dirHandle);
    } catch {
      // user cancelled
    }
  }, [onFolder]);

  return (
    <div className="flex gap-3">
      <button
        onClick={handleSelectFiles}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
      >
        Select Files
      </button>
      <button
        onClick={handleSelectFolder}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
      >
        Select Folder
      </button>
    </div>
  );
}
