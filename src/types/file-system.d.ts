interface FileSystemFileHandle {
  getFile(): Promise<File>;
}

interface FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
}

interface Window {
  showOpenFilePicker(options?: {
    multiple?: boolean;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }): Promise<FileSystemFileHandle[]>;
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
}
