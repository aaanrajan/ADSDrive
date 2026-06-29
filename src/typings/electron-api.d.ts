export {};

declare global {
  interface ElectronAPI {
    readFile: (filePath: string) => string;
    writeFile: (filePath: string, content: string) => void;
    createDir: (dirPath: string) => void;
    listDir: (dirPath: string) => string[];
    exists: (filePath: string) => boolean;
    joinPath: (...args: string[]) => string;
    homeDir: () => string;
    stat: (filePath: string) => { isDirectory: boolean };
    getAllFiles: () => Promise<{ success: boolean; data?: any; error?: string }>;
    saveConfig: (config: { username: string; userId: string; path: string }) => void;
    loadConfig: () => { username: string; userId: string; path: string } | null;
  
    startWatch: (folderPath: string) => void;
    stopWatch: () => void;
    onFsEvent: (callback: (data: { type: string; filePath?: string; dirPath?: string }) => void) => void;
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}
