 interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
interface Window {
  electronAPI: {
    invoke: <T>(channel: string, ...args: any[]) => Promise<IpcResponse<T>>;
    isElectron: boolean;
    ipcRenderer: {
      on: (channel: string, listener: (...args: any[]) => void) => void;
    };
    renameItem(arg0: { id: string; newName: string; }): unknown | amy;
    getChildrenByParentId(id: any): unknown;
    getAllFiles(): unknown;

    readFile: (filePath: string) => string;
    writeFile: (filePath: string, content: string) => void;
    createDir: (dirPath: string) => void;
    listDir: (dirPath: string) => string[];
    exists: (filePath: string) => boolean;
    joinPath: (...args: string[]) => string;
    homeDir: () => string;
    stat: (filePath: string) => { isDirectory: boolean; isFile: boolean };

    stopWatch: () => void;
    onFsEvent: (callback: (data: any) => void) => void;

    selectDirectory: () => Promise<string | null>;
    startWatch: (userId: string, username: string, folderPath: string) => void;
    updateColor: (fileId: string, color: string) => Promise<IpcResponse<any>>;
    stopWatch: () => void;
    onFsEvent: (callback: (data: any) => void) => void;
    fileAction: (
      fileId: string,
      action: string
    ) => Promise<{
      success: boolean;
      success: boolean;
      type: string;
      path?: string;
      error?: string;
    }>;

    listDirectory: (
      path: string
    ) => Promise<
      | {
        name: string;
        path: string;
        isDirectory: boolean;
        isFile: boolean;
        size: number;
        createdAt: string;
        modifiedAt: string;
        mimeType: string | null;
      }[]
      | { error: string }
    >;
    selectFolder: () => Promise<any | null>;
    loadConfig: () => Promise<any | null>;
    saveConfig: (config: any) => Promise<boolean>;
    getConfig: (key: string) => Promise<any>;
    setConfig: (key: string, value: any) => Promise<boolean>;
    updateConfig: (updates: Record<string, any>) => Promise<boolean>;
    supportAction: (
      fileId: string,
      action: string
    ) => Promise<{
      success: boolean;
      type: string;
      result: any;
      path?: string;
      error?: string;
    }>;

  },

  api: {
    versions: {
      electron: string;
      chrome: string;
      node: string;
    };
  }
}
