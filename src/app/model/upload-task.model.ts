export interface UploadTask {
  id: string;
  fileName: string;
  progress: number;
  done: boolean;
  error: boolean;
  cancelled?: boolean;
}

export interface InternalUploadTask extends UploadTask {
  file: File;
  parentId: string;
  fileDetailId: string;
  userId: any;
}
