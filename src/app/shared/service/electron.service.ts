// file.service.electron.ts
import { Injectable } from '@angular/core';
import type { FileService, FileInfo } from './file-service.interface';
import { SharedService } from '../shared.service';


type FileAction = "DOWNLOAD" | "PIN" | "UNPIN" | "REMOVE" | "FREEUP" | "LASTOPENED" | "REPLACE_LOCAL" | "REPLACE_CLOUD";
type supportAction = "FIND_ALL_SHARED" | "DROP_TABLE" | "DELETE_RECORDS" | "CREATE_TABLE" | "START_WATCHER" | "FIND_ALL_RECORDS" | "FIND_SHARED_ITEM"| "FIND_CHILDREN_BY_CLOUD_ID";
@Injectable({ providedIn: 'root' })
export class ElectronFileService implements FileService {
  
  private electron = window.electronAPI;
  
  constructor(private sharedService: SharedService) {}

   /**
   * Check if a path exists on the file system.
   * @param path The full path to check.
   * @returns True if exists, false otherwise.
   */
   pathExists(path: string): boolean {
    return this.electron?.exists(path);
  }

  /**
   * Create a directory if it doesn't exist.
   * @param dirPath The directory path to create.
   */
  createDirIfNotExists(dirPath: string): void {
    if (!this.pathExists(dirPath)) {
      this.electron?.createDir(dirPath);
      console.log('✅ Directory created:', dirPath);
    } else {
      console.log('📁 Directory already exists:', dirPath);
    }
  }

  async listFiles(email: string): Promise<FileInfo[]> {
    try {
      const folderPath = this.sharedService.getUserFolderPath(email);
      if (!this.pathExists(folderPath)) {
        console.warn('Folder does not exist:', folderPath);
        return [];
      }
  
      const result = await this.electron?.listDirectory(folderPath);
  
      if ('error' in result) {
        console.error('Error reading directory:', result.error);
        return [];
      }
  
      const entries = result.filter((entry) => entry.name !== '.DS_Store');
  
      const data: FileInfo[] = entries.map((entry) => ({
        itemName: entry.name,
        path: entry.path,
        isFolder: entry.isDirectory ? true : false,
        size: entry.size,
        createdDate: new Date(entry.createdAt),
        modifiedDate: new Date(entry.modifiedAt),
        fileType: entry.mimeType ?? '',
      }));
  
      console.log('data', data);
      return data;
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }
  
  async getAllFiles(): Promise<any[]> {
    const result = await this.electron?.getAllFiles();
    const typedResult = result as {
      success: boolean;
      data?: any[];
      error?: string;
    };

    if (!typedResult.success) throw new Error(typedResult.error || 'Failed to fetch files');
    return typedResult.data || [];
  }

  async getChildrenByParentId(id:any): Promise<any[]> {
    const result = await this.electron?.getChildrenByParentId(id);
    const typedResult = result as {
      success: boolean;
      data?: any[];
      error?: string;
    };

    if (!typedResult.success) throw new Error(typedResult.error || 'Failed to fetch files');
    return typedResult.data || [];
  }

  async renameItemById(id: string, newName: string): Promise<any> {
    const result = await this.electron?.renameItem({ id, newName });
  
    if (!result?.success) {
      throw new Error(result?.error || 'Rename failed');
    }
    return result.data; // Return the renamed item's info (if you want to use it)
  }
  
  startWatching(userId: any, email: string) {
    const username = email.split('@')[0];
    const folderPath = this.sharedService.getUserFolderPath(email);
    this.electron?.startWatch( userId, username, folderPath);
  }

  stopWatching() {
    this.electron?.stopWatch();
  }

  async readFile(filePath: string): Promise<string> {
    return this.electron?.readFile(filePath);
  }

  async writeFile(filePath: string, data: string): Promise<void> {
    this.electron?.writeFile(filePath, data);
  }


async performFileAction(
  fileId: string,
  action: FileAction
): Promise<{ success: boolean; path?: string; error?: string; message?: string }> {
  try {
    const result = await this.electron?.fileAction(fileId, action);

    if (result.success) {
      let actionLabel = "";
      switch (action) {
        case "PIN":
          actionLabel = "📌 pinned & downloaded";
          break;
        case "DOWNLOAD":
          actionLabel = "✅ downloaded";
          break;
        case "UNPIN":
          actionLabel = "🗑 freed up space";
          break;
        case "REMOVE":
          actionLabel = "❌ removed";
          break;

        case "FREEUP":
          actionLabel = "🗑 freed up space";
          break;

        case "LASTOPENED":
          actionLabel = "🕒 last opened updated";
          break;
        case "REPLACE_LOCAL":
          actionLabel = "♻️ local file replaced";
          break;
        case "REPLACE_CLOUD":
          actionLabel = "♻️ cloud file replaced";
          break;
        default:
          actionLabel = "✅ completed";
      }
      console.log(`File ${actionLabel}:`, result.path);
    } else {
      console.error(`❌ ${action} failed:`, result.error);
    }

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ IPC call for ${action} failed:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}



async performSupportAction(
  fileId: string,
  action: supportAction
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}> {

  try {

    const result: any = await this.electron.supportAction(
      fileId,
      action
    );

    if (!result?.success) {

      return {
        success: false,
        error: result?.error || 'Operation failed'
      };
    }

    let actionLabel = '';

    switch (action) {

      case 'FIND_ALL_SHARED':
        actionLabel = '🔍 find all shared';
        break;

      case 'DROP_TABLE':
        actionLabel = '✅ dropped table';
        break;

      case 'DELETE_RECORDS':
        actionLabel = '🗑 deleted records';
        break;

      case 'CREATE_TABLE':
        actionLabel = '✅ created table';
        break;

      case 'START_WATCHER':
        actionLabel = '👁 started watcher';
        break;

      case 'FIND_ALL_RECORDS':
        actionLabel = '🔍 find all records';
        break;

      case 'FIND_SHARED_ITEM':
        actionLabel = '🔍 find shared item';
        break;
      case 'FIND_CHILDREN_BY_CLOUD_ID':
        actionLabel = '🔍 find children by cloud id';
        break;
      default:
        actionLabel = 'completed';
        break;
    }

    return {
      success: true,
      data: result.result,
      message: `File ${actionLabel}`
    };

  } catch (err) {

    const errorMsg =
      err instanceof Error
        ? err.message
        : String(err);

    console.error(
      `❌ IPC call for ${action} failed:`,
      errorMsg
    );

    return {
      success: false,
      error: errorMsg
    };
  }
}

async loadConfig(): Promise<any | null> {
    try {
      return await this.electron?.loadConfig();
    } catch (err) {
      console.error('[ElectronService] Failed to load config:', err);
      return null;
    }
  }

  async saveConfig(config: any): Promise<boolean> {
    try {
      return await this.electron?.saveConfig(config);
    } catch (err) {
      console.error('[ElectronService] Failed to save config:', err);
      return false;
    }
  }

  async getConfig(key: string): Promise<any> {
    try {
      return await this.electron?.getConfig(key);
    } catch (err) {
      console.error(`[ElectronService] Failed to get config value for key "${key}":`, err);
      return null;
    }
  }

  async setConfig(key: string, value: any): Promise<boolean> {
    try {
      return await this.electron?.setConfig(key, value);
    } catch (err) {
      console.error(`[ElectronService] Failed to set config key "${key}":`, err);
      return false;
    }
  }

  async updateConfig(updates: Record<string, any>): Promise<boolean> {
    try {
      return await this.electron?.updateConfig(updates);
    } catch (err) {
      console.error('[ElectronService] Failed to update config:', err);
      return false;
    }
  }

  async updateColor(fileId: string, color: string): Promise<boolean> {
    try {
      const result = await this.electron?.updateColor(fileId, color);
      return result.success;
    } catch (err) {
      console.error(`[ElectronService] Failed to update color for fileId "${fileId}":`, err);
      return false;
    }
  }
}
