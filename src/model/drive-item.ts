export interface FileNode {
  id?: any;
  itemName?: string;
  isFolder?: boolean;
  size?: number;
  modifiedDate?: string;
  color?: string;
  darkenColor?: string;
  thumbnailUrl?: string;
  isFavorite?: boolean;
  createdDate?: string;
  deletedAt?: string;
  favoritedAt?: string;
  updatedBy?: string;
  createdBy?: string;
  originalLocation?: string;
  permissions?: {
    userName: string;
    firstName?: string;
  }[];
  firstName?: string;
  syncStatus?: string;
  fileType?: string;   // ✅ Add this
}
