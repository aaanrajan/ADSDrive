import { Injectable } from "@angular/core";
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { Filesystem, Directory } from '@capacitor/filesystem';
declare var window: any;

export interface DirectoryUploadResult {
  files: File[];
  emptyDirs: string[];
}
@Injectable({
  providedIn: "root",
})
export class SharedService {

  isNative = Capacitor.isNativePlatform();
  isAndroid = Capacitor.getPlatform() === 'android';
  isIOS = Capacitor.getPlatform() === 'ios';
  isWeb = Capacitor.getPlatform() === 'web';

  isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  constructor(private platform: Platform) { }

  async ensureUserFolder(email: string) {

    console.log('email', email)
    const folderName = this.getUserFolderPath(email);

    if (this.isElectron()) {
      const fs = window.require('fs');
      if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName, { recursive: true });
        console.log(`Created local folder: ${folderName}`);
      } else {
        console.log(`Local folder already exists: ${folderName}`);
      }
    } else if (this.isMobileApp()) {
      try {
        await Filesystem.readdir({
          path: folderName,
          directory: Directory.Data
        });
        console.log(`Mobile folder exists: ${folderName}`);
      } catch (error) {
        await Filesystem.mkdir({
          path: folderName,
          directory: Directory.Data,
          recursive: true
        });
        console.log(`Created mobile folder: ${folderName}`);
      }
    } else {
      console.log('Web platform — skipping local folder check.');
    }
  }

  // src/app/utils/path.utils.ts
  // src/app/utils/path.utils.ts

  getUserFolderPath(email: string): string {
    const username = email.split('@')[0];

    if (this.isElectron()) {
      const homeDir = window.electronAPI.homeDir();
      const platform = window.electronAPI.platform?.();

      // macOS
      if (platform === 'darwin') {
        return window.electronAPI.joinPath(
          homeDir,
          'Library',
          'CloudStorage',
          `ADSDrive-ADSDrive`
        );
      }

      // Windows
      if (platform === 'win32') {
        return window.electronAPI.joinPath(
          homeDir,
          'ADSDrive'
        );
      }

      // Linux
      return window.electronAPI.joinPath(
        homeDir,
        'ADSDrive'
      );
    }

    return `AdsDrive/ADSDrive-ADSDrive`;
  }

  public isElectron(): boolean {
    return window.electronAPI?.isElectron;
  }

  private isMobileApp(): boolean {
    return this.platform.is('capacitor') || this.platform.is('cordova');
  }
  /**
   * Formating the file size
   * @param size
   * @returns
   */
  formatSize(size?: number): string {
    if (!size || size <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let unitIndex = 0;
    let val = size;
    while (val > 1024 && unitIndex < units.length - 1) {
      val /= 1024;
      unitIndex++;
    }
    return `${val.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
  * Get icon filename for a file or folder.
  * Priority:
  *  1. Folder → folder icon
  *  2. Extension-based icon
  *  3. MIME-type-based icon
  *  4. Default file icon
  */
getIconForNode(fileType?: string, isFolder: boolean = false, fileName?: string): string {
  if (isFolder) return "folder.png";

  let ext = fileName ? this.getExtension(fileName, fileType).toLowerCase() : "";


  // 2️⃣ Extension → icon mapping
  const extMap: Record<string, string> = {
    pdf: "pdf-icon.png",
    doc: "DOC.png",
    docx: "DOCX.png",
    xls: "XLS.png",
    xlsx: "XLSX.png",
    ppt: "PPT.png",
    pptx: "PPT.png",
    jpg: "JPG.png",
    jpeg: "JPG.png",
    png: "PNG.png",
    gif: "GIFF.png",
    svg: "SVG.png",
    webp: "WEBP.png",
    bmp: "BMP.png",
    txt: "TXT.png",
    csv: "csv-icon.png",
    html: "html-icon.png",
    json: "json-icon.png",
    md: "MDB.png",
    xml: "XML.png",   // ✅ XML extension included
    sql: "SQL.png",
    mp3: "MP3.png",
    wav: "WAV.png",
    mp4: "MP4.png",
    avi: "AVI.png",
    mkv: "MKV.png",
    mov: "MKV.png",
    zip: "ZIP.png",
    rar: "RAR.png",
    "7z": "7Z.png",
    tar: "TAR.png",
    gz: "GZ.png",
    apk: "APK.png",
    exe: "exe-icon.png",
    dmg: "DMG.png",
    iso: "ISO.png",
    js: "JS.png",
    css: "CSS.png",
    py: "PY.png",
    c: "C.png",
    cpp: "CPP.png",
    jar: "JAR.png",
  };

  // 3️⃣ Return icon or default
  return ext && extMap[ext] ? extMap[ext] : "file.png";
}

/**
 * Extracts file extension safely, with optional MIME fallback
 * @param fileName Name of the file
 * @param mimeType MIME type of the file (optional)
 * @returns Lowercase extension string or empty string
 */
private getExtension(fileName?: string, mimeType?: string): string {
  let ext = "";

  // 1️⃣ Extract from fileName
  if (fileName) {
    const parts = fileName.split(".");
    if (parts.length > 1) {
      ext = parts.pop()!.toLowerCase();
    }
  }

  // 2️⃣ Fallback to MIME type
  if (!ext && mimeType) {
    const mimeMap: Record<string, string> = {
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
      "text/plain": "txt",
      "text/csv": "csv",
      "text/html": "html",
      "application/json": "json",
      "application/xml": "xml",
      "text/xml": "xml",
      "application/zip": "zip",
      "application/x-rar-compressed": "rar",
      "application/x-7z-compressed": "7z",
      "application/x-tar": "tar",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "video/mp4": "mp4",
      "video/x-msvideo": "avi",
      "video/x-matroska": "mkv",
      "application/vnd.android.package-archive": "apk",
      "application/x-msdownload": "exe",
      "application/x-dmg": "dmg",
    };

    ext = mimeMap[mimeType.toLowerCase()] || "";
  }

  return ext;
}


  /**
   * get FileType
   * @param type
   * @param isFolder
   * @returns
   */
  getFileType(type: string, isFolder: boolean): string {
    if (isFolder) return "Folder";
    if (!type) return "Unknown";

    type = type.toLowerCase();

    // PDF
    if (type === "application/pdf") return "PDF Document";

    // Word documents
    if (
      [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(type)
    )
      return "Word Document";

    // Excel documents
    if (
      [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel.sheet.macroenabled.12",
      ].includes(type)
    )
      return "Excel Spreadsheet";

    // PowerPoint
    if (
      [
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ].includes(type)
    )
      return "PowerPoint Presentation";

    // Images
    if (type === "image/jpeg") return "JPEG Image";
    if (type === "image/png") return "PNG Image";
    if (type === "image/gif") return "GIF Image";
    if (type === "image/svg+xml") return "SVG Image";
    if (type === "image/webp") return "WebP Image";
    if (type === "image/bmp") return "Bitmap Image";
    if (type.startsWith("image/")) return "Image"; // fallback for other images

    // Text and code files
    if (type === "text/plain") return "Text File";
    if (type === "text/csv") return "CSV File";
    if (type === "text/html") return "HTML File";
    if (type === "application/json") return "JSON File";
    if (type === "text/markdown" || type === "text/x-markdown")
      return "Markdown File";
    if (type === "text/x-sql" || type === "application/sql") return "SQL File";

    // Audio
    if (type.startsWith("audio/")) return "Audio File";

    // Video
    if (type.startsWith("video/")) return "Video File";

    // Archives
    if (
      [
        "application/zip",
        "application/x-rar-compressed",
        "application/x-7z-compressed",
        "application/x-tar",
      ].includes(type)
    )
      return "Compressed Archive";

    // Executables and installers
    if (type === "application/vnd.android.package-archive")
      return "Android Package (APK)";
    if (type === "application/x-msdownload") return "Windows Executable (EXE)";

    // Default fallback
    return "File";
  }

  getViewType(
    mimeType: string,
    useGoogleViewer = false
  ):
    | "office"
    | "google"
    | "pdf"
    | "img"
    | "video"
    | "audio"
    | "text"
    | "download"
    | "unknown" {
    const type = mimeType.toLowerCase();

    const officeTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
    ];

    // Office files
    if (officeTypes.includes(type)) return "download";

    // PDF files
    if (type === "application/pdf") {
      return useGoogleViewer ? "google" : "pdf";
    }

    // Images
    if (type.startsWith("image/")) return "img";

    // Videos
    if (type.startsWith("video/")) return "video";

    // Audio
    if (type.startsWith("audio/")) return "audio";

    // Text-based preview types (add sql, markdown, csv, xml, log, etc.)
    const textTypes = [
      "text/html",
      "application/json",
      "text/plain",
      "text/markdown",
      "text/x-markdown",
      "text/x-sql",
      "application/sql",
      "application/xml",
      "application/octet-stream",
      "text/xml",
      "text/csv",
      "text/log",
    ];

    if (textTypes.includes(type) || type.startsWith("text/")) {
      return "text";
    }

    // APK or EXE - treat as downloadable binary, no preview
    const downloadTypes = [
      "application/vnd.android.package-archive", // APK
      "application/x-msdownload", // EXE
      "application/octet-stream", // generic binary
    ];

    if (downloadTypes.includes(type)) {
      return "download";
    }

    // Default fallback
    return "unknown";
  }

  getViewTypeFromUrl(
    url: string
  ): "office" | "google" | "pdf" | "img" | "video" | "audio" | "unknown" {
    const ext = url.split(".").pop()?.toLowerCase() || "";

    const officeExt = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];
    if (officeExt.includes(ext)) return "office";

    if (ext === "pdf") return "pdf";

    if (["jpg", "jpeg", "png", "gif", "bmp", "svg"].includes(ext)) return "img";
    if (["mp4", "webm", "ogg"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg"].includes(ext)) return "audio";

    return "google"; // fallback for unknown types or Google docs
  }

  getPreviewUrl(url: string, type: string): string {
    if (type === "office") {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        url
      )}`;
    }
    if (type === "google") {
      return `https://docs.google.com/gview?url=${encodeURIComponent(
        url
      )}&embedded=true`;
    }
    return url;
  }

  getFileTypeFromExtension(ext: string | null): string | null {
    if (!ext) return null;

    // Basic mapping from extension to descriptive type
    const map: Record<string, string> = {
      pdf: "PDF Document",
      doc: "Word Document",
      docx: "Word Document",
      xls: "Excel Spreadsheet",
      xlsx: "Excel Spreadsheet",
      ppt: "PowerPoint Presentation",
      pptx: "PowerPoint Presentation",
      jpg: "JPEG Image",
      jpeg: "JPEG Image",
      png: "PNG Image",
      gif: "GIF Image",
      svg: "SVG Image",
      webp: "WebP Image",
      bmp: "Bitmap Image",
      txt: "Text File",
      csv: "CSV File",
      html: "HTML File",
      json: "JSON File",
      md: "Markdown File",
      sql: "SQL File",
      mp3: "Audio File",
      wav: "Audio File",
      mp4: "Video File",
      avi: "Video File",
      mkv: "Video File",
      zip: "Compressed Archive",
      rar: "Compressed Archive",
      apk: "Android Package (APK)",
      exe: "Windows Executable (EXE)",
    };

    return map[ext] ?? "File";
  }

  private readonly menuWidth = 192;
  private readonly menuHeight = 180;
  private readonly buffer = 10;

  /**
   * Finds the nearest scrollable container of the given element.
   */
  findScrollableContainer(element: HTMLElement): HTMLElement {
    let parent = element.parentElement;
    while (parent) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        return parent;
      }
      parent = parent.parentElement;
    }
    return document.body;
  }

  /**
   * Calculates context menu position and ensures it's within scroll bounds.
   */
  calculateMenuPosition(
    event: MouseEvent,
    hostElement: HTMLElement,
    menuHeight: any = 340
  ): { x: number; y: number } {
    const scrollContainer = this.findScrollableContainer(hostElement);
    const containerRect = scrollContainer.getBoundingClientRect();

    let x = event.clientX;
    let y = event.clientY;

    if (x + this.menuWidth > containerRect.right) {
      x = containerRect.right - this.menuWidth - this.buffer;
    }
    if (y + menuHeight > containerRect.bottom) {
      y = containerRect.bottom - menuHeight - this.buffer;
    }

    x += scrollContainer.scrollLeft;
    y += scrollContainer.scrollTop;

    return { x, y };
  }

  async pickAndReadDirectory(): Promise<DirectoryUploadResult | null> {
    const files: File[] = [];
    const emptyDirs: string[] = [];

    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      await this.readDirectoryHandle(dirHandle, "", files, emptyDirs);
      return { files, emptyDirs };
    } catch (err) {
      console.warn("User canceled folder selection or error:", err);
      return null;
    }
  }

  /**
   * Recursively reads a directory and collects files and empty folders.
   */
  private async readDirectoryHandle(
    dirHandle: any,
    path: string,
    files: File[],
    emptyDirs: string[]
  ): Promise<void> {
    let isEmpty = true;

    for await (const [name, handle] of dirHandle.entries()) {
      isEmpty = false;
      const fullPath = `${path}${dirHandle.name}/`;

      if (handle.kind === "file") {
        const file = await handle.getFile();
        file["relativePath"] = `${fullPath}${name}`;
        files.push(file);
        await new Promise(resolve => setTimeout(resolve, 0));
      } else if (handle.kind === "directory") {
        await this.readDirectoryHandle(handle, fullPath, files, emptyDirs);
      }
    }
    emptyDirs.push(`${path}${dirHandle.name}`);
  }

  async extractFilesAndDirsFromEvent(
    event: DragEvent
  ): Promise<DirectoryUploadResult> {
    const items = event.dataTransfer?.items;
    if (!items) return { files: [], emptyDirs: [] };

    const filePromises: Promise<File[]>[] = [];
    const emptyDirs: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (!entry) continue;

      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        filePromises.push(this.readFileEntry(fileEntry));
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        filePromises.push(this.readDirectoryEntry(dirEntry, "", emptyDirs));
      }
    }

    const allGroups = await Promise.all(filePromises);
    return { files: allGroups.flat(), emptyDirs };
  }

  private readFileEntry(
    fileEntry: FileSystemFileEntry,
    path = ""
  ): Promise<File[]> {
    return new Promise((resolve, reject) => {
      fileEntry.file((file) => {
        const newFile = new File([file], path + file.name, {
          type: file.type,
          lastModified: file.lastModified,
        });
        resolve([newFile]);
      }, reject);
    });
  }

  private async readDirectoryEntry(
    entry: FileSystemDirectoryEntry,
    path = "",
    emptyDirs: string[]
  ): Promise<File[]> {
    const reader = entry.createReader();

    const readAllEntries = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve, reject) => {
        const allEntries: FileSystemEntry[] = [];
        const readChunk = () => {
          reader.readEntries((entries) => {
            if (entries.length === 0) {
              resolve(allEntries);
            } else {
              allEntries.push(...entries);
              readChunk();
            }
          }, reject);
        };
        readChunk();
      });

    const entries = await readAllEntries();
    const files: File[] = [];

    for (const ent of entries) {
      const fullPath = `${path}${entry.name}/`;

      if (ent.isFile) {
        const fileList = await this.readFileEntry(
          ent as FileSystemFileEntry,
          fullPath
        );
        files.push(...fileList);
        await new Promise(resolve => setTimeout(resolve, 0));
      } else if (ent.isDirectory) {
        const subFiles = await this.readDirectoryEntry(
          ent as FileSystemDirectoryEntry,
          fullPath,
          emptyDirs
        );
        files.push(...subFiles);
      }
    }

    emptyDirs.push(path + entry.name);
    return files;
  }

  /**
   * Streams a partial preview of a file (up to maxBytes) from a URL.
   */
  async loadPartialText(url: string, maxBytes = 100 * 1024): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch file');
    if (!response.body) throw new Error('ReadableStream not supported');

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (receivedLength < maxBytes) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedLength += value.length;
      }
    }

    const combined = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      combined.set(chunk, position);
      position += chunk.length;
    }

    const decoder = new TextDecoder('utf-8');
    return decoder.decode(combined);
  }

  darkenColor(hex: string, amount: number = 30): string {
    // Remove '#' if present
    hex = hex.replace('#', '');

    // Parse r, g, b components
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Subtract the amount but clamp between 0 and 255
    const newR = Math.max(0, r - amount);
    const newG = Math.max(0, g - amount);
    const newB = Math.max(0, b - amount);

    // Convert back to hex with leading zeros
    const darkenedHex = `#${newR.toString(16).padStart(2, '0')}${newG
      .toString(16)
      .padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;

    return darkenedHex;
  }

  /**
 * Splits a file/folder name into base name and extension
 * @param fullName Full file/folder name
 * @returns Object { nameWithoutExt, extension }
 */
 getNameAndExt(fullName: string, fileType?: string): { nameWithoutExt: string; extension: string } {
  const lastDotIndex = fullName.lastIndexOf(".");
  if (lastDotIndex > 0 && lastDotIndex < fullName.length - 1) {
    return {
      nameWithoutExt: fullName.substring(0, lastDotIndex),
      extension: this.getExtension(fullName, fileType).toLowerCase(),
    };
  } else {
    return {
      nameWithoutExt: fullName,
      extension: this.getExtension(fullName, fileType).toLowerCase(),
    };
  }
}

handleMobileMenuCheck(event: MouseEvent): boolean {
  const el = document.getElementById('mobile-menu');

  if (!el) {
    event.preventDefault();
    event.stopPropagation();
    return false; // element not found
  }

  return true; // element exists
}

  getOrdinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  formatDynamic(date: Date, format: string): string {
    const map: Record<string, string> = {
      "DD": String(date.getDate()).padStart(2, "0"),
      "D": String(date.getDate()),
      "Do": this.getOrdinal(date.getDate()),

      "MMMM": date.toLocaleString("en-US", { month: "long" }),
      "MMM": date.toLocaleString("en-US", { month: "short" }),
      "MM": String(date.getMonth() + 1).padStart(2, "0"),
      "M": String(date.getMonth() + 1),

      "YYYY": String(date.getFullYear()),
      "YY": String(date.getFullYear()).slice(-2),

      "HH": String(date.getHours()).padStart(2, "0"),
      "H": String(date.getHours()),

      "hh": String((date.getHours() % 12) || 12).padStart(2, "0"),
      "h": String((date.getHours() % 12) || 12),

      "mm": String(date.getMinutes()).padStart(2, "0"),
      "m": String(date.getMinutes()),

      "ss": String(date.getSeconds()).padStart(2, "0"),
      "s": String(date.getSeconds()),

      "A": date.getHours() >= 12 ? "PM" : "AM",
      "a": date.getHours() >= 12 ? "pm" : "am",
    };

    return Object.keys(map).reduce(
      (acc, key) => acc.replace(new RegExp(key, "g"), map[key]),
      format
    );
  }

  calculateTimeAgo(createdAt: Date, format: string): string {
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));

    if (minutes < 1) return "just now";
    if (minutes < 60)
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24)
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7)
      return `${days} day${days > 1 ? "s" : ""} ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 4)
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;

    const months = Math.floor(days / 30);

    // 🔥 More than 1 month → formatted date
    if (months >= 1)
      return this.formatDynamic(createdAt, format);

    return this.formatDynamic(createdAt, format);
  }
  calculateAgo(createdAt: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hrs ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} days ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;

    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? "s" : ""} ago`;
  }
}
