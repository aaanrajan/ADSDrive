import { Injectable } from "@angular/core";

@Injectable()
export class DriveConfig {
  static VARIANTS = {
    PRIMARY: "primary",
    SECONDARY: "secondary",
    SUCCESS: "success",
    WARNING: "warning",
    DANGER: "danger",
    INFO: "info",
    LIGHT: "light",
    DARK: "dark",
    MUTED: "muted",
    WHITE: "white",
    BLACK: "black",
    TRANSPARENT: "transparent",
  } as const;

  static ACCESS_MENU_ITEMS = {
    ALL : [
    { key: "SHARE", isFolder: null, isElectron: true, isMultiSelect: true, isSowBar: false,isHalfScreen :false },
    { key: "MOVE", isFolder: null, isElectron: false, isMultiSelect: true, isSowBar: false,isHalfScreen :false },
    { key: "DOWNLOAD", isFolder: null, isElectron: true, isMultiSelect: true, isSowBar: false,isHalfScreen :false },
    { key: "DELETE", isFolder: null, isElectron: true, isMultiSelect: true, isSowBar: false,isHalfScreen :false }
    ],
 MY_FILES: [
    // -------- File specific (single select only) --------
    { key: "OPEN", isFolder: false, isElectron: true, isMultiSelect: false, isSowBar: false, isHalfScreen :false },
    { key: "PREVIEW", isFolder: false, isElectron: true, isMultiSelect: false, isSowBar: true, isHalfScreen :false },

    // -------- Common (file + folder, single select) --------
    { key: "SHARE", isFolder: null, isElectron: true, isMultiSelect: true, isSowBar: true,isHalfScreen :true },
    { key: "COPY_LINK", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :true },
    { key: "MANAGEACCESS", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: false,isHalfScreen :false },
    { key: "MOVE", isFolder: null, isElectron: false, isMultiSelect: true, isSowBar: true,isHalfScreen :false },
    { key: "DOWNLOAD", isFolder: null, isElectron: true, isMultiSelect: true, isSowBar: true,isHalfScreen :false },
    { key: "DELETE", isFolder: null, isElectron: true, isMultiSelect: true, isSowBar: true,isHalfScreen :false },
    // { key: "COPY", isFolder: null, isElectron: true, isMultiSelect: true, isSowBar: true,isHalfScreen :false },
    { key: "RENAME", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :false },
    { key: "FAVORITE", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: false, isHalfScreen :false },

    { key: "DETAILS", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :false },

    // -------- Folder-only (single select) --------
    { key: "FOLDERCOLOR", isFolder: true, isElectron: true, isMultiSelect: false, isSowBar: false,isHalfScreen :false },
  ],
    RECENT: [
     { key:"OPEN", isFolder: null , isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :false },
     { key:"OPEN_LOCATION", isFolder: null , isElectron: true, isMultiSelect: false, isSowBar: false,isHalfScreen :false },
     { key: "SHARE", isFolder: null, isElectron: true, isMultiSelect: true, isSowBar: true, isHalfScreen: false },
     { key: "FAVORITE", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: false, isHalfScreen :false },
     { key:"COPY_LINK", isFolder: null , isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen : true },
     { key: "REMOVE", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true, isHalfScreen: true },
          ],
    FAVORITE:
     [{ key:"OPEN", isFolder: null , isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :false },
      { key:"OPEN_LOCATION", isFolder: null , isElectron: true, isMultiSelect: false, isSowBar: false,isHalfScreen :false },
      { key:"SHARE", isFolder: null , isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :true },
      { key:"COPY_LINK", isFolder: null , isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen : true },
      { key:"UNFAVORITE", isFolder: null , isElectron: true, isMultiSelect: true, isSowBar: true,isHalfScreen :false },
      ],
    TRASH: [
       { key:"DELETE", isFolder: null , isElectron: true,  isMultiSelect: true, isSowBar: true  },
       { key:"RESTORE", isFolder: null , isElectron: true,  isMultiSelect: true, isSowBar: true  }
      ],
    SHARED_WITH_YOU: [
      // { key: "OPEN", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :true },
      // { key: "OPEN_LOCATION", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :true },
      // { key: "SHARE", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :false },
      // { key: "COPY_LINK", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :false },
      { key: "DOWNLOAD", isFolder: null, isElectron: true, isMultiSelect: true, isSowBar: true,isHalfScreen :false },
      // { key: "COPY", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :false },
      { key: "RENAME", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :false },
      { key: "REQUEST_ACCESS", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :false },
      { key: "COMMAND", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :false }
    ],
    SHARED_BY_YOU: [
      { key: "OPEN", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :true },
      { key: "OPEN_LOCATION", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :true },
      { key: "SHARE", isFolder: null, isElectron: true, isMultiSelect: true, isSowBar: true,isHalfScreen :false },
      { key: "COPY_LINK", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :false },
      { key: "DOWNLOAD", isFolder: null, isElectron: true, isMultiSelect: true, isSowBar: true,isHalfScreen :false },
      // { key: "MANAGEACCESS", isFolder: null, isElectron: true, isMultiSelect: false, isSowBar: true,isHalfScreen :false },
    ],
  };

  static MFA_PURPOSE = {
    LOGIN: "LOGIN",
    CONFIGURE: "CONFIGURE",
  } as const;
  static FOLDER_COLORS = [
      '#FBBF24', '#DC2626', '#EA580C', '#16A34A', '#0D9488', '#2563EB', '#7C3AED', '#9333EA',
      '#9CA3AF', '#D6BFA6', '#F0C987', '#5FC1B8', '#A3D3A1', '#7FB2D6', '#C2B0E2', '#D2A9D8'
    ]; 

  static STATUS_ICONS =  {
    "SYNCING": { icon: "fas fa-sync-alt fa-spin", color: "text-blue-500", tooltip: "Syncing..." },
    "AVAILABLE_OFFLINE": { icon: "fas fa-hdd", color: "text-green-500", tooltip: "Available Offline" },
    "ALWAYS_AVAILABLE_OFFLINE": { icon: "fas fa-download", color: "text-green-600", tooltip: "Always Available Offline" },
    "SYNC_ERROR": { icon: "fas fa-exclamation-circle", color: "text-red-500", tooltip: "Sync Error" },
    "AVAILABLE_ONLINE_ONLY": { icon: "fas fa-cloud", color: "text-gray-500", tooltip: "Available Online Only" },
    "READ_ONLY_FILE": { icon: "fas fa-lock", color: "text-yellow-500", tooltip: "Read-Only File" },
    "ALWAYS_KEEP_ON_THIS_DEVICE": { icon: "fas fa-thumbtack", color: "text-indigo-500", tooltip: "Always Keep on This Device" },
    "RE_NAME": { icon: "fas fa-edit", color: "text-blue-400", tooltip: "Renaming..." },
    "CONFLICT": { icon: "fas fa-exclamation-triangle", color: "text-orange-500", tooltip: "Conflict Detected" },
    "RE_NAME_CONFLICT": { icon: "fas fa-bolt", color: "text-purple-500", tooltip: "Rename Conflict" },
    "RE_NAME_FAILED": { icon: "fas fa-times-circle", color: "text-red-600", tooltip: "Rename Failed" },
    "PARTIALLY_AVAILABLE": { icon: "fas fa-adjust", color: "text-teal-500", tooltip: "Partially Available" },
    "PARTIAL_OFFLINE": { icon: "fas fa-adjust", color: "text-teal-500", tooltip: "Partially Offline" },
    "FAILED_CLOUD_DELETE": { icon: "fas fa-times-circle", color: "text-red-600", tooltip: "Failed cloud delete" },
    "PENDING": { icon: "fas fa-clock", color: "text-yellow-500", tooltip: "Pending" },
    "CHANGED_REMOTELY": { icon: "fas fa-cloud-upload-alt", color: "text-blue-500", tooltip: "Changed Remotely" },
    "DELETED_REMOTELY": { icon: "fas fa-trash-alt", color: "text-red-500", tooltip: "Deleted Remotely" },
    "CHANGE_PENDING": { icon: "fas fa-hourglass-half", color: "text-yellow-600", tooltip: "Change Pending" },
    "VERSION_UPDATE_PENDING": { icon: "fas fa-hourglass", color: "text-yellow-700", tooltip: "Version Update Pending" },
    "OFFLINE": { icon: "fas fa-cloud-off", color: "text-gray-400", tooltip: "Offline" },
    "ONLINE": { icon: "fas fa-cloud", color: "text-gray-500", tooltip: "Online" },
    "ERROR": { icon: "fas fa-exclamation-circle", color: "text-red-500", tooltip: "Error" },
    "SYNCED": { icon: "fas fa-check-circle", color: "text-green-500", tooltip: "Synced" },
  };

  static GRID_COLS_MAP = {
  ALL: `
    grid-cols-1
    sm:grid-cols-[40px_1fr_1fr_1fr]
    lg:!grid-cols-[40px_1.5fr_1fr_1fr_1fr_1fr_40px_40px]
  `,
  MY_FILES: `
    grid-cols-1
    sm:grid-cols-[40px_1fr_1fr_1fr]
    lg:!grid-cols-[40px_1.5fr_1fr_1fr_1fr_1fr_40px_40px]
  `,
  FAVORITE: `
    grid-cols-1
    sm:grid-cols-[40px_1fr_1fr_1fr]
    lg:!grid-cols-[40px_1.5fr_1fr_1fr_1fr_40px_40px]
  `,
  TRASH: `
    grid-cols-1
    sm:grid-cols-[40px_1fr_1fr_1fr]
    lg:!grid-cols-[40px_1.5fr_1fr_1fr_1fr_1fr_40px_40px]
  `,
  SHARED_WITH_YOU: `
    grid-cols-1
    sm:grid-cols-[40px_1fr_1fr_1fr]
    lg:!grid-cols-[40px_1.5fr_1fr_1fr_1fr_40px_40px]
  `,
  SHARED_BY_YOU: `
    grid-cols-1
    sm:grid-cols-[40px_1fr_1fr_1fr]
    lg:!grid-cols-[40px_1.5fr_1fr_1fr_1fr_40px_40px]
  `,
  RECENT: `
    grid-cols-1
    sm:grid-cols-[40px_1fr_1fr_1fr]
    lg:!grid-cols-[40px_1.5fr_1fr_1fr_1fr_1fr_40px_40px]
  `
};

static FILTER_LIST = [
    { id: null, name: 'All File Types' },
    { id: 'WORD', name: 'Word ' },
    { id: 'EXCEL', name: 'Excel ' },
    { id: 'PDF', name: 'PDF ' },
    { id: 'PPT', name: 'PowerPoint ' },
    { id: 'IMAGES', name: 'Image ' },
    { id: 'VIDEOS', name: 'Video ' },
    { id: 'AUDIOS', name: 'Audio ' },
    { id: 'TEXT', name: 'Text ' },
    { id: 'ZIP', name: 'Zip ' },
  ];

  static SHOW_COLS = {
  fileName: ['ALL','MY_FILES','FAVORITE','TRASH','SHARED_WITH_YOU','SHARED_BY_YOU', 'RECENT'],
  createdDate: ['ALL','MY_FILES', 'RECENT'],
  modifiedDate: ['ALL','MY_FILES','FAVORITE','SHARED_BY_YOU', 'RECENT'],
  fileSize: ['ALL','MY_FILES','SHARED_WITH_YOU','SHARED_BY_YOU', 'RECENT'],
  fileOwner: ['MY_FILES','SHARED_WITH_YOU','SHARED_BY_YOU'],
  shared: ['MY_FILES'],
  favorited: ['FAVORITE'],
  modifiedBy: ['FAVORITE', 'TRASH'],
  deletedDate: ['TRASH'],
  deletedBy: ['TRASH'],
  sharedDate: ['SHARED_WITH_YOU'],
  createdBy: ['TRASH'],
  originalLocation: ['TRASH'],
  sharedBy: [],
  location: ['ALL', 'RECENT']
};

static BATCH_COLORS = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500'
  ];

}

export type Variant =
  (typeof DriveConfig.VARIANTS)[keyof typeof DriveConfig.VARIANTS];
