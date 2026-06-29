export interface FileInfo {
  itemName: string;
  path: string;
  isFolder: boolean;
  size?: number;
  createdAt?: Date;
  modifiedAt?: Date;
  fileType?: string;
}

export interface FileService {
  listFiles(path: string): Promise<FileInfo[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
  watchFolder?(path: string, onChange: (event: string, path: string) => void): void;
}
