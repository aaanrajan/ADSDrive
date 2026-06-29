import { Injectable } from "@angular/core";
import { BaseService } from "./base.service";
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from "@angular/common/http";
import { BehaviorSubject, Observable, catchError, from, map, throwError } from "rxjs";
import { environment } from "../../../environments/environment";
import { InternalUploadTask, UploadTask } from "../../model/upload-task.model";
import { AppStorageService } from "./app-storage.service";
// const fs = window.require('fs');
export interface DownloadProgress {
  progress: number;
  fileName?: string;
  blob?: Blob;
  done?: boolean;
}

@Injectable({ providedIn: "root" })
export class FileService extends BaseService {
  downloadFileById(id: any) {
    throw new Error("Method not implemented.");
  }
  multiDelete(fileIds: string[]) {
    throw new Error("Method not implemented.");
  }
  baseUrl = environment.service_url;
  tasks: UploadTask[] = [];
  taskQueue: UploadTask[] = [];
  currentTask: UploadTask | null = null;
  cancelMap = new Map<string, boolean>();
  pauseMap = new Map<string, boolean>();
  uploadSubject = new BehaviorSubject<UploadTask[]>([]);
  uploadTasks$ = this.uploadSubject.asObservable();
  private originalTaskMap = new Map<string, InternalUploadTask>();
  private chunkSize = 1024 * 1024 * 10; // 10MB
  private maxConcurrentUploads = 3;
  private activeUploads = 0;
  private isElectron = !!(window && window.electronAPI?.isElectron);

  constructor(protected http: HttpClient) {
    super();
  }

private invoke<T>(
  electronChannel: string,
  httpCall: () => Observable<IpcResponse<T>>,
  options?: { isShared?: boolean },
  ...args: any[]
): Observable<any> {
    const isShared = options?.isShared ?? false;

  if (this.isElectron && !isShared) {
    return from(window.electronAPI.invoke<any>(electronChannel, ...args));
  } else {
    return httpCall().pipe(catchError(this.handleError));
  }
}


/**
 * Registers a new user.
 * @param data User registration data
 * @returns Observable of HTTP response
 */
register(data: any) {
    const url = `${this.baseUrl}/users`;
    return this.http.put(url, data).pipe(catchError(this.handleError));
  }

  /**
   * Logs in a user.
   * @param data Login credentials
   * @returns Observable containing the HTTP response with user data
   */
  login(data: any) {
    const url = `${this.baseUrl}/login`;
    const headers = this.loginHeaders();
    return this.http.post(url, data, {headers, observe: "response" }).pipe(
      map((user: any) => user),
      catchError(this.handleError)
    );
  }

  loadUserByEmail(email: any) {
    let url = `${this.baseUrl}/users/load?email=${email}`;
    const headers = this.getHeader();
    return this.http
      .get<any>(url, { headers })
      .pipe(catchError(this.handleError));
  }
  /**
   * Creates or updates a file or folder.
   * @param data Metadata or payload for folder/file
   * @returns Observable of HTTP response
   */
  createOrUpdateFileAndFolder(data: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/drive`;
    return this.http
      .put(url, data, { headers })
      .pipe(catchError(this.handleError));
  }

  /**
   * Uploads a file using form data.
   * @param formData File data wrapped in FormData
   * @returns Observable of upload response
   */
  uploadFile(formData: FormData) {
    const url = `${this.baseUrl}/drive/upload-and-save`;

    const token: any = AppStorageService.getItem("token") || "";
    let headers = new HttpHeaders().set("Authorization", token);
    return this.http
      .post(url, formData, { headers })
      .pipe(catchError(this.handleError));
  }

  uploadFiles(
    file: File,
    parentId: string,
    fileDetailId: string,
    userId?: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = `${file.name}-${Date.now()}`;
      const task: UploadTask = {
        id,
        fileName: file.name,
        progress: 0,
        done: false,
        error: false,
      };
      this.tasks.push(task);

      const internalTask: InternalUploadTask = {
        ...task,
        file,
        parentId,
        fileDetailId,
        userId
      };
      this.taskQueue.push(internalTask);
      this.originalTaskMap.set(id, internalTask);

      this.uploadSubject.next([...this.tasks]);
      this.processQueue();

      // Poll the tasks list for this task's done/error flags
      const interval = setInterval(() => {
        const currentTask = this.tasks.find((t) => t.id === id);

        if (!currentTask) {
          clearInterval(interval);
          reject(new Error("Upload task disappeared"));
          return;
        }

        if (currentTask.done) {
          clearInterval(interval);
          resolve();
        }

        if (currentTask.error) {
          clearInterval(interval);
          reject(new Error(`Upload failed for file ${file.name}`));
        }
      }, 200);
    });
  }
  enqueueTask(task: UploadTask) {
    if (!this.tasks.find((t) => t.id === task.id)) {
      this.tasks.push(task);
    }
    let original = this.getOriginalTask(task.id);
    if (original) {
      this.taskQueue.push(original);
    } else {
      this.taskQueue.push(task);
    }
    this.uploadSubject.next([...this.tasks]);
    this.processQueue();
  }

  getOriginalTask(id: string): InternalUploadTask | undefined {
    return this.originalTaskMap.get(id);
  }

  clearUploadTasks() {
    // Unsubscribe or cancel tasks if needed
    this.uploadSubject.next([]);
    this.pauseMap.clear();
    this.cancelMap.clear();
    this.originalTaskMap.clear();
    this.tasks = [];
    this.taskQueue = [];
  }

  togglePause(task: UploadTask) {
    const isPaused = this.pauseMap.get(task.id);
    isPaused ? this.pauseMap.delete(task.id) : this.pauseMap.set(task.id, true);
  }

  cancelTask(task: UploadTask) {
    this.cancelMap.set(task.id, true);
  }

  private async processQueue() {
    while (
      this.activeUploads < this.maxConcurrentUploads &&
      this.taskQueue.length > 0
    ) {
      const task = this.taskQueue.shift() as InternalUploadTask;
      this.activeUploads++;
      this.startUpload(task).finally(() => {
        this.activeUploads--;
        setTimeout(() => this.processQueue(), 0);
      });
    }
  }

  private async startUpload(task: InternalUploadTask) {
    const { id, file, parentId, fileDetailId, userId } = task;
    const realTask = this.tasks.find((t) => t.id === id);
    if (!realTask || !file) return;

    const totalChunks = Math.ceil(file.size / this.chunkSize);
    let currentChunk = 0;

    const headers = new HttpHeaders().set(
      "Authorization",
      AppStorageService.getItem("token") || ""
    );

    while (currentChunk < totalChunks) {
      if (this.cancelMap.get(id)) {
        realTask.error = true;
        this.cancelMap.delete(id);
        break;
      }
      if (this.pauseMap.get(id)) {
        await new Promise((res) => setTimeout(res, 500));
        continue;
      }

      const startByte = currentChunk * this.chunkSize;
      const endByte = Math.min(startByte + this.chunkSize, file.size);
      const chunkBlob = file.slice(startByte, endByte);
      const chunkFile = new File([chunkBlob], file.name, { type: file.type });

      const formData = new FormData();

      if (parentId) formData.append("pid", parentId);
      if (fileDetailId) formData.append("fileDetailId", fileDetailId);
      formData.append("uid", userId ??AppStorageService.getItem("userId") ?? "");

      // Only include chunk info and use chunked endpoint if totalChunks > 1
      const isChunked = totalChunks > 1;
      let endpoint = `${this.baseUrl}/drive/upload-and-save`;

      if (isChunked) {
        formData.append("chunk", chunkFile);
        formData.append("chunkIndex", (currentChunk).toString());
        formData.append("totalChunks", totalChunks.toString());
        formData.append("fileName", file.name);
        formData.append("length", file.size.toString());
        formData.append("contentType", file.type);
        endpoint = `${this.baseUrl}/drive/upload-large-and-save`;
      } else {
        formData.append("file", chunkFile);
      }

      try {
        await this.http.post(endpoint, formData, { headers }).toPromise();

        currentChunk++;
        realTask.progress = Math.floor((currentChunk / totalChunks) * 100);
        this.uploadSubject.next([...this.tasks]);
      } catch (err) {
        realTask.error = true;
        break;
      }
    }

    if (!realTask.error && currentChunk >= totalChunks) {
      realTask.progress = 100;
      realTask.done = true;
      this.uploadSubject.next([...this.tasks]);
    }
  }

  async uploadFileList(
    files: File[],
    rootParentId: string,
    rootFileId: string,
    emptyFolders: string[] = [],
    userId?: any
  ) {
    const folderMap = new Map<
      string,
      { parentId: string; parentFolderId: string }
    >();
    folderMap.set("", { parentId: rootParentId, parentFolderId: rootFileId });

    const uploadPromises: Promise<void>[] = [];

    for (const file of files) {
      const relPath =
        (file as any).webkitRelativePath ||
        (file as any).relativePath ||
        file.name;

      const pathParts = relPath.split("/");
      const fileName = pathParts.pop()!;
      let currentPath = "";
      let parentId = rootParentId;
      let parentFolderId = rootFileId;

      // Dynamically create folders only when needed
      for (const folderName of pathParts) {
        currentPath += `${folderName}/`;

        if (!folderMap.has(currentPath)) {
          const res: any = await this.createOrUpdateFileAndFolder({
            userId: userId ?? AppStorageService.getItem("userId"),
            itemName: folderName,
            isFolder: true,
            parentId,
            parentFolderId,
          }).toPromise();

          if (!res?.data?.id)
            throw new Error("Failed to create folder: " + folderName);

          parentId = res.data.id;
          parentFolderId = res.data.fileDetailId;
          folderMap.set(currentPath, { parentId, parentFolderId });
        } else {
          const folder = folderMap.get(currentPath)!;
          parentId = folder.parentId;
          parentFolderId = folder.parentFolderId;
        }
      }

      // Upload the file after path is resolved
      const cleanFile = new File([file], fileName, { type: file.type });
      uploadPromises.push(
        this.uploadFiles(cleanFile, parentId, parentFolderId, userId)
      );
    }

    // Optional: process any remaining empty folders (if needed)
    for (const dirPath of emptyFolders) {
      const parts = dirPath.split("/");
      let currentPath = "";
      let parentId = rootParentId;
      let parentFolderId = rootFileId;

      for (const folderName of parts) {
        currentPath += `${folderName}/`;

        if (!folderMap.has(currentPath)) {
          const res: any = await this.createOrUpdateFileAndFolder({
            userId: userId ?? AppStorageService.getItem("userId"),
            itemName: folderName,
            isFolder: true,
            parentId,
            parentFolderId,
          }).toPromise();

          if (!res?.data?.id) break;

          parentId = res.data.id;
          parentFolderId = res.data.fileDetailId;
          folderMap.set(currentPath, { parentId, parentFolderId });
        } else {
          const folder = folderMap.get(currentPath)!;
          parentId = folder.parentId;
          parentFolderId = folder.parentFolderId;
        }
      }
    }

    await Promise.all(uploadPromises);
    return { success: true, uploadedFilesCount: files.length };
  }

  /**
   * Returns download URL for a document by ID.
   * @param docId Document ID
   * @returns Download URL string
   */
  downloadFile(docId: any): string {
    return `${this.baseUrl}/file/download/file?fileId=${docId}`;
  }

  downloadFolder(fileId: any): string {
    return `${this.baseUrl}/file/download/folder?folderId=${fileId}`;
  }

  downloadMultipleFiles(base64: string) : string {
    return `${this.baseUrl}/file/download/multifile?data=${encodeURIComponent(base64)}`;
    // const body = { fileId: fileIds };
    // return this.http.post(url, body, { responseType: 'blob' });
  }

  previewFile(docId: any): string {
    return `${this.baseUrl}/file/preview?dbid=${docId}`;
  }

  /**
   * Loads child folders/files under a parent ID.
   * @param parentId Parent folder ID
   * @param userId User ID
   * @returns Observable of child file/folder list
   */
  loadChilderen(parentId: any, userId: any, isShared: boolean= false): Observable<any> {
    let url = `${this.baseUrl}/drive/children?uid=${userId}`;
    if (parentId) {
      url += `&pid=${parentId}`;
    }
    return this.invoke<any>(
    'get-children',
    () => this.http.get<any>(url),
    { isShared },
    parentId,
  );
    // return this.http.get<any[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Loads FavoriteList by userId.
   * @param parentId Parent folder ID
   * @param userId User ID
   * @returns Observable of child file/folder list
   */
  loadFavorite(parentId: any, userId: any) {
    let url = `${this.baseUrl}/drive/favorites?userId=${userId}`;
    if (parentId) {
      url += `&pid=${parentId}`;
    }
    return this.http.get<any[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Loads Deleted List by userId.
   * @param parentId Parent folder ID
   * @param userId User ID
   * @returns Observable of child file/folder list
   */
  loadDeletedList(parentId: any, userId: any) {
    let url = `${this.baseUrl}/drive/delete/list?userId=${userId}`;
    if (parentId) {
      url += `&pid=${parentId}`;
    }
    return this.http.get<any[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Deletes a folder or file by ID.
   * @param id File/folder ID
   * @returns Observable of delete response
   */
  deleteFolderOrFile(id: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/drive/${id}`;
    return this.http
      .delete(url, { headers })
      .pipe(catchError(this.handleError));
  }

  deleteMultipleFiles(ids: string[]) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/drive/delete-multiple`;
    return this.http
      .delete(url, {
        headers,
        body: ids 
      })
      .pipe(catchError(this.handleError));
  }

  deletePermanentMultiple(ids: string[]) {
  const headers = this.getHeader();
  const url = `${this.baseUrl}/drive/delete/permanent/list`;

  return this.http
    .delete(url, {
      headers,
      body: ids
    })
    .pipe(catchError(this.handleError));
}

  getNotification(userId: any) {
  const headers = this.getHeader();
  const url = `${this.baseUrl}/notifications/all?userId=${userId}`;
  
  return this.http
    .get(url, { headers })
    .pipe(
      catchError(this.handleError)
    );
  }
  getNotificationunread(userId: any) {
  const headers = this.getHeader();
  const url = `${this.baseUrl}/notifications/unread?userId=${userId}`;
  
  return this.http
    .get(url, { headers })
    .pipe(
      catchError(this.handleError)
    );
  }

    getNotificationmark(userId: any) {
    let url = `${this.baseUrl}/notifications/mark-all-read?userId=${userId}`;
    const headers = this.getHeader();
    return this.http
      .post<any>(url, { headers })
      .pipe(catchError(this.handleError));
  }
  getUnreadNotificationCount(userId: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/notifications/unread-count?userId=${userId}`;
    return this.http
      .get(url, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }
  resetCount(userId: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/notifications/reset-count?userId=${userId}`;
    return this.http
      .post(url, { headers })
      .pipe(catchError(this.handleError));
  }

  deletenotification(id: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/notifications/delete?notificationIds=${id}`;
    return this.http
      .get(url, { headers })
      .pipe(catchError(this.handleError));
  }

  getFolderOrFile(id: any) {
  const headers = this.getHeader();
  const url = `${this.baseUrl}/drive/${id}`;
  
  return this.http
    .get(url, { headers })
    .pipe(
      catchError(this.handleError)
    );
  }

  getFolderPath(id: string): Observable<string> {
    return this.http.get(
      `${this.baseUrl}/drive/path?fileId=${id}`,
      { responseType: 'text' }
    ).pipe(
      map((res: string) => res.trim()),
      catchError(this.handleError)
    );
  }

  commentpost(data: any) {
    let url = `${this.baseUrl}/comments/create-comment`;
    const headers = this.getHeader();
    return this.http.post(url, data, { headers }).pipe(catchError(this.handleError));
  }

  /**
   * Make  a folder or file Is Favorite.
   * @param id File/folder ID
   * @returns Observable of delete response
   */
  updateFavoriteStatus(data: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/drive/favorite`;
    return this.http
      .put(url, data, { headers })
      .pipe(catchError(this.handleError));
  }
  updateFavoriteMultiple(data: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/drive/favorite/multiple`;
    return this.http
      .put(url, data, { headers })
      .pipe(catchError(this.handleError));
  }

  /**
   * Update a folder or file name.
   * @param id File/folder ID
   * @returns Observable of delete response
   */
  updateFileName(data: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/drive/rename`;
    return this.http
      .put(url, data, { headers })
      .pipe(catchError(this.handleError));
  }

  updateLastView(data: any) {
        const headers = this.getHeader();
    const url = `${this.baseUrl}/drive/update`;
    return this.http
      .put(url, data, { headers })
      .pipe(catchError(this.handleError));
  }
  
  removeRecent(id: string) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/drive/${id}/clear-last-viewed`;

    return this.http.patch(url, {}, { headers })
      .pipe(catchError(this.handleError));
  }
  
  moveFileOrFolder(movedId: any, targetId: any, userId: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/drive/move?driveItemid=${movedId}&targetFolderid=${targetId}&uid=${userId}`;
    return this.http
      .put(url, {}, { headers })
      .pipe(catchError(this.handleError));
  }

multipleMoveFolderOrFile(movedId: string[], targetId: string, userId: string) {
  const headers = this.getHeader();
  const url = `${this.baseUrl}/drive/move-multiple`;

  const body = {
    driveItemIds: movedId, 
    targetFolderId: targetId,
    userId: userId
  };

  return this.http
    .post(url, body, { headers })
    .pipe(catchError(this.handleError));
}

paste(movedId: string[], targetId: string, userId: string) {
  const headers = this.getHeader();
  const url = `${this.baseUrl}/drive/paste`;

  const body = {
    driveItemIds: movedId, 
    targetFolderId: targetId,
    userId: userId
  };

  return this.http
    .post(url, body, { headers })
    .pipe(catchError(this.handleError));
}

  /**
   * Uploads a file chunk (used for large files).
   * @param formData FormData with chunk
   * @returns Observable of upload response
   */
  uploadChunk(formData: FormData) {
    return this.http
      .post("/upload/chunk", formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Gets upload status for a file by upload ID.
   * @param uploadId Upload identifier
   * @returns Observable of status (as plain text)
   */
  getUploadStatus(uploadId: string) {
    return this.http
      .get(`/upload/status/${uploadId}`, { responseType: "text" })
      .pipe(catchError(this.handleError));
  }

  /**
   * Global error handler for HTTP requests.
   * @param error HttpErrorResponse
   * @returns Throws formatted error
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = "An unknown error occurred!";
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server error ${error.status}: ${error.message}`;
    }
    console.error(errorMessage);
    // return throwError(() => new Error(errorMessage));
    return throwError(() => error);
  }

  /**
   * Update a folder or file name.
   * @param id File/folder ID
   * @returns Observable of delete response
   */
  saveSettings(data: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/users-configuration`;
    return this.http
      .put(url, data, { headers })
      .pipe(catchError(this.handleError));
  }

  getUserDetails(userId: any){
    const url = `${this.baseUrl}/file-sharing/shared/people?uid=${userId}`;
    const headers = this.getHeader();
    return this.http
      .get<any>(url, { headers })
      .pipe(catchError(this.handleError));
  }
  getUserSharedFiles(userId: any, toEmail:any){
    const url = `${this.baseUrl}/file-sharing/shared/between?uid=${userId}&toemail=${toEmail}`;
    const headers = this.getHeader();
    return this.http
      .get<any>(url, { headers })
      .pipe(catchError(this.handleError));
  }



  getSetting(userId: any) {
    const url = `${this.baseUrl}/users-configuration/users-configurations/${userId}`;
    const headers = this.getHeader();

    return this.http
      .get<any>(url, { headers })
      .pipe(catchError(this.handleError));
  }

  //Forgot password
  sendResetLink(email: any) {
    let url = `${this.baseUrl}/users/generate-otp/sendToMail?email=${email}`;
    const headers = this.getHeader();
    return this.http
      .post<any>(url, { headers })
      .pipe(catchError(this.handleError));
  }

  validateOtp(otpValue: any, email: any) {
    const url = `${this.baseUrl}/users/validate-otp/userId?email=${email}&otp=${otpValue}`;
    const headers = this.getHeader();
    return this.http
      .post<any>(url, { headers })
      .pipe(catchError(this.handleError));
  }

  updateForgotPassword(data: any) {
    const url = `${this.baseUrl}/users/forgot-password`;
    const headers = this.getHeader();
    return this.http
      .post(url, data, { headers })
      .pipe(catchError(this.handleError));
  }

  updatChangePassword(data: any) {
    const url = `${this.baseUrl}/users/change-user-password`;
    const headers = this.getHeader();
    return this.http
      .put(url, data, { headers })
      .pipe(catchError(this.handleError));
  }

getStorageUsage(userId: any, folderId?: any) {
  const headers = this.getHeader();
  let url = `${this.baseUrl}/drive/used-bytes?uid=${userId}`;

  if (folderId) {
    url = `${url}&folderid=${folderId}`;
  }

  return this.http.get(url, { headers }).pipe(
    catchError(this.handleError)
  );
}


   getOccupiedSizes(userId: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/drive/usage/${userId}`;
    return this.http.get(url, { headers }).pipe(catchError(this.handleError));
  }

  restoreFileOrFolder(itemId: any, userId: any) {
    const url = `${this.baseUrl}/drive/restore-from-trash?userId=${userId}&itemId=${itemId}`;
    const headers = this.getHeader();
    return this.http
      .put(url, {}, { headers })
      .pipe(catchError(this.handleError));
  }

  multipleFileRestor(userId:any,ids:any) {
    const url = `${this.baseUrl}/drive/restore/multiple?userId=${userId}`;
    const headers = this.getHeader();
    return this.http.put(url, ids, { headers }).pipe(catchError(this.handleError));
  }

  permanentDeleteFolderOrFile(id: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/drive/delete/permanent/${id}`;
    return this.http
      .delete(url, { headers })
      .pipe(catchError(this.handleError));
  }

  emptyTrashByUserId(id: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/drive/delete/permanent/empty?userId=${id}`;
    return this.http
      .delete(url, { headers })
      .pipe(catchError(this.handleError));
  }
  
    updateNotificationSettings(userId: string, data: any) {
    const url = `${this.baseUrl}/settings/notification/${userId}`;
    return this.http.put(url, data).pipe(
      catchError(this.handleError)
    );
  }

  sendOtpToWhatsapp(data: any) {
    let url = `${this.baseUrl}/user-mfa/whatsapp/request-otp`;
    const headers = this.getHeader();
    return this.http
      .post<any>(url, data, { headers })
      .pipe(catchError(this.handleError));
  }

  validateOtpByMobileNumber(data: any) {
    const url = `${this.baseUrl}/user-mfa/whatsapp/validate-otp`;
    const headers = this.getHeader();
    return this.http
      .post<any>(url, data, { headers })
      .pipe(catchError(this.handleError));
  }

  getAllMfaListByUserId(userId: any) {
    const url = `${this.baseUrl}/user-mfa/by-user-id?uid=${userId}`;
    const headers = this.getHeader();
    return this.http
      .get<any>(url, { headers })
      .pipe(catchError(this.handleError));
  }

  deleteMfaConfig(id: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/user-mfa/${id}`;
    return this.http
      .delete(url, { headers })
      .pipe(catchError(this.handleError));
  }

  getUserDetailsFromToken(token: any) {
    const headers = this.getHeader();
    const encodedToken = encodeURIComponent(token);
    const url = `${this.baseUrl}/sso-login/sso-login?token=${encodedToken}`;
    return this.http.get<any>(url, { headers });
  }

  getAllDriveItemsByUserId(data: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/drive/page/list`;
    return this.http.post<any[]>(url, data, { headers }).pipe(catchError(this.handleError));
  }

  getShareLinkByIds(data: any, userId: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/file-sharing/sharelink-by-ids?uid=${userId}`;
    return this.http.post<any[]>(url, data, { headers }).pipe(catchError(this.handleError));
  }

  createSharePermission(data: any, id?: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/file-sharing/update-permission?sharedetailid=${id}`;
    return this.http
      .put(url, data, { headers })
      .pipe(catchError(this.handleError));
  }

  getSharedItem(data: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/file-sharing/shareed-items-links`;
    return this.http.post(url, data, { headers }).pipe(catchError(this.handleError));
  }

  verfyShareAccess(shareLink: any, email: any) {
    const headers = this.getHeader();
    let url = `${this.baseUrl}/file-sharing/access?shareLink=${shareLink}`;
    if (email) {
      url = url + `&userName=${email}`;
    }
    return this.http.get(url, { headers }).pipe(catchError(this.handleError));
  }

   requestAccessToShare(shareLink: any, email: any) {
    const headers = this.getHeader();
    let url = `${this.baseUrl}/file-sharing/access?shareLink=${shareLink}`;
    if (email) {
      url = url + `&userName=${email}`;
    }
    return this.http.post(url, { headers }).pipe(catchError(this.handleError));
  }

  getSharedItemListWithPagination(userId: any, shareByMe: boolean=false) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/file-sharing/shared/page?uid=${userId}&sharebyme=${shareByMe}`;
    return this.http.get(url, { headers }).pipe(catchError(this.handleError));
  }

  updateShareDetails(data: any){
   const headers = this.getHeader();
      const url = `${this.baseUrl}/file-sharing/update`;
      return this.http
        .put(url, data, { headers })
        .pipe(catchError(this.handleError));
  }

  markAsViewed(id: any, isViewed: any) {
      const headers = this.getHeader();
      const url = `${this.baseUrl}/file-sharing/permission/viewed?id=${id}&isViewed=${isViewed}`;
      return this.http
        .post(url, {}, { headers })
        .pipe(catchError(this.handleError));
  }

  requestAccessToSharedFile(data: any) {
      const headers = this.getHeader();
      const url = `${this.baseUrl}/file-sharing/request-access`;
      return this.http
        .post(url, data, { headers })
        .pipe(catchError(this.handleError));
  }

  removeRequest(id: any, email: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/file-sharing/permission/delete/by-username?shareDetailId=${id}&userName=${email}`;
    return this.http
      .delete(url, { headers })
      .pipe(catchError(this.handleError));
  }

    notificationConfigure(data:any){
      const headers = this.getHeader();
      const url =`${this.baseUrl}/settings/share/save`;
      return this.http.post(url, data, { headers }).pipe(catchError(this.handleError));
    }
    
    getSettings(id:any){
      const headers = this.getHeader();
      const url =`${this.baseUrl}/settings/${id}`;
      return this.http.get(url, { headers }).pipe(catchError(this.handleError));
    }

  getUserSuggestions(searchText: any, userId: any) {
    const headers = this.getHeader();
    let url = `${this.baseUrl}/users/all-email?id=${userId}`;
    if (searchText) {
      url += `&s=${searchText}`;
    }
    return this.http.get<any[]>(url, { headers }).pipe(catchError(this.handleError));
  }

  codeExchangeToToken(code: String): Observable<any> {
    return this.http.get(`${this.baseUrl}/auth/exchange?code=${code}`, { withCredentials: true }).pipe(catchError(this.handleError));
  }
 getNotes(userId: any) {
  const headers = this.getHeader();
  const url = `${this.baseUrl}/notes/all/${userId}`;
  return this.http
    .get<any>(url, { headers })
    .pipe(catchError(this.handleError));
}

createNote(data: any) {
  const headers = this.getHeader();
  const url = `${this.baseUrl}/notes/create`;
  return this.http.post(url, data, { headers })
    .pipe(catchError(this.handleError));
}


deleteNote(id: string) {
  const headers = this.getHeader();
  const url = `${this.baseUrl}/notes/delete/${id}`;
  return this.http.delete(url, { headers })
    .pipe(catchError(this.handleError));
}

updatePinned(id: string, pinned: boolean) {
  const headers = this.getHeader();
  const url = `${this.baseUrl}/notes/${id}/pinned?pinned=${pinned}`;
  return this.http.put(url, {}, { headers })
    .pipe(catchError(this.handleError));
}

updateNote(id: string, data: any) {
  const headers = this.getHeader();
  const url = `${this.baseUrl}/notes/update/${id}`;
  return this.http.put(url, data, { headers })
    .pipe(catchError(this.handleError));
}


 getProductsList(userName: any) {
  return this.http.get(
    `${environment.adsSuiteApiUrl}/products/catalog`,
    {
      params: { username: userName }
    }
   );
  }

  getSessions(): Observable<any> {
    return this.http.get(`${environment.service_url}/auth/session`, { withCredentials: true});
  }

  switchSession(sessionId: String, isLogoutCurrent: boolean): Observable<any> {
    return this.http.post(`${environment.service_url}/auth/switch`, { sessionId, isLogoutCurrent }, {withCredentials: true});
  }

  getComment(driveItemId: any) {
    const headers = this.getHeader();
    let url = `${this.baseUrl}/comments/${driveItemId}`;
    return this.http.get<any[]>(url, { headers }).pipe(catchError(this.handleError));
  }

  deleteComment(id: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/comments/delete-reply/${id}`;
    return this.http.delete(url, { headers }).pipe(catchError(this.handleError));
  }

   deleteDirectComment(id: any) {
    const headers = this.getHeader();
    const url = `${this.baseUrl}/comments/delete-comment/${id}`;
    return this.http.delete(url, { headers }).pipe(catchError(this.handleError));
  }
}
