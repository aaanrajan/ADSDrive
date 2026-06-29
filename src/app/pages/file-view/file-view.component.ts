import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";

interface AllMenu {
  OPEN: boolean;
  PREVIEW: boolean;
  SHARE: boolean;
  COPY_LINK: boolean;
  MANAGEACCESS: boolean;
  MOVE: boolean;
  DOWNLOAD: boolean;
  DELETE: boolean;
  COPY: boolean;
  RENAME: boolean;
  DETAILS: boolean;
  FOLDERCOLOR: boolean;
  DELETE_FOREVER: boolean;
  UNFAVORITE: boolean;
  RESTORE: boolean;
  OPEN_LOCATION: boolean;
  REMOVE: boolean;
  REQUEST_ACCESS: boolean;
  COMMAND: boolean;
  UPLOAD: boolean;
  CREATE: boolean;
  REFRESH: boolean;
}

import { FileNode } from "../../model/drive-item";
import { FileService } from "../../shared/service/file.service";
import { SharedService } from "../../shared/shared.service";
import { AlertService } from "../../shared/alert-service/alert.service";
import { DriveConfig } from "../../shared/config/drive.config";
import { AppStorageService } from "../../shared/service/app-storage.service";
import { ElectronFileService } from "../../shared/service/electron.service";
import { environment } from "../../../environments/environment";
import { Router } from "@angular/router";
import { ConfirmationModelComponent } from "../../shared/confirmation-model/confirmation-model.component";

interface LazyFileTreeNode extends FileNode {
  children?: LazyFileTreeNode[];
  expanded?: boolean;
  loading?: boolean;
  depth?: number;
}

@Component({
  standalone: false,
  selector: "app-file-view",
  templateUrl: "./file-view.component.html",
  styleUrls: ["./file-view.component.scss"],
  encapsulation: ViewEncapsulation.None
})
export class FileViewComponent implements OnInit {

  @Input() access: 'CAN_VIEW' | 'CAN_EDIT' | 'VIEW_DOWNLOAD' | 'CANT_DOWNLOAD' | null = null;
  @Input() headerHeightPx: number = 225;
  @Input() loading: boolean = true;
  @Input() nodes: any[] = [];
  @Input() page: any = "HOME";
  @Input() parentFolder: any = null;
  @Input() parentId: string | null = null;
  @Output() favoriteToggled = new EventEmitter<FileNode>();
  @Output() FileRestore = new EventEmitter<any>();
  @Output() fileTypeSelected = new EventEmitter<any>();
  @Output() folderClicked = new EventEmitter<any>();
  @Output() folderCopied = new EventEmitter<any>();
  @Output() folderCreated = new EventEmitter<any>();
  @Output() folderDeleted = new EventEmitter<any>();
  @Output() folderMoved = new EventEmitter<any>();
  @Output() folderRenamed = new EventEmitter<any>();
  @Output() refreshFolder = new EventEmitter<any>();
  @Output() scrolled = new EventEmitter<boolean>();

  @ViewChild("container") containerRef!: ElementRef;
  @ViewChild("folderInput") folderInput!: ElementRef<HTMLInputElement>;
  @ViewChild('menu') menuContainer!: ElementRef<HTMLElement>;
  @ViewChild('rename') reNameContainer!: ElementRef;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('uploadMenu', { static: false }) uploadMenuRef!: ElementRef;
  @ViewChild('view') viewContainer!: ElementRef<HTMLElement>;

  contextMenuVisible: boolean = false;
  copyDialogOpen: boolean = false;
  flipSubmenu: boolean = false;
  hasMoreData: boolean = true;
  hideSort: boolean = false;
  homeIcon: boolean = false;
  isDialogOpen: boolean = false;
  isElectron: boolean = false;
  isLoadingMore: boolean = false;
  isMenuOpen: boolean = false;
  isMiniScreen: boolean = false;
  isModalOpen: boolean = false;
  isMoreOpen: boolean = false;
  isShowMenu: boolean = false;
  isSmallScreen = false;
  loadingFolders: boolean = false;
  moveDialogOpen: boolean = false;
  open: boolean = true;
  shareDialog: boolean = false;
  showColorPicker: boolean = false;
  showMoreMenu: boolean = false;
  showPanel: boolean = false;
  showViewDropdown = false;
  sortAsc: boolean = true;
  toggleUploadMenu: boolean = false;
  accessOptions = [
    { label: 'Can View', value: 'CAN_VIEW', subLabel: "can't make changes" },
    { label: 'Can Edit', value: 'CAN_EDIT', subLabel: 'make any changes' },
    { label: 'Can View & Download', value: 'VIEW_DOWNLOAD', subLabel: 'can view & download' },
    { label: "View Only (No Download)", value: 'CANT_DOWNLOAD', subLabel: 'can view but not download' }
  ];
  contextMenuX: number = 0;
  contextMenuY: number = 0;
  lastScrollHeight: number = 0;

  activeTab: 'details' | 'activity' | 'comments' = 'details';
  groupBy: keyof FileNode | null = null;
  sortKey: keyof FileNode = "itemName";
  viewMode: "list" | "grid" = "list";

  dynamicHeight: string = 'auto';
  folderName: string = '';
  renameInput: string = "";
  renameInputExt: string = '';
  selectedColor: string = '#FBBF24';
  showRequestDialog: boolean = false;
  emailInput: string = '';
  selectedAccess: string = 'CAN_EDIT';
  selectedData: any = {};
  contextMenuTarget: any | null = null;
  draggedNode: any = null;
  fileType: any = null;
  folders: any;
  scrollArea: any;
  scrollDebounceTimer: any;
  selectedItem: any = null;
  selectedNodes: any[] = [];
  selectedFile: any;
  sharedDetails: any;
  sharedItemList: any[] = [];
  renamingNode: any = null;
  folderParentId: string = '';

  allFolders: FileNode[] = [];
  currentFolderChildren: LazyFileTreeNode[] = [];
  folderPath: LazyFileTreeNode[] = [];
  menuNode: FileNode | null = null;
  moveSourceNode: FileNode | null = null;
  moveTargetFolder: LazyFileTreeNode | null = null;
  modelTitle: string = '';
  modelMessage: string = '';
  actionBtnText: string = '';
  revertBtnText: string = '';
  isShowConfirmationModel: boolean = false;
  targetvalye: any = null;
  isHardDelete: boolean = false;
  isEmptyTrash: boolean = false;

  batchColors: string[] = DriveConfig.BATCH_COLORS;
  colors: string[] = DriveConfig.FOLDER_COLORS;
  filterList = DriveConfig.FILTER_LIST;
  gridColsMap: any = DriveConfig.GRID_COLS_MAP;
  menuList: any = DriveConfig.ACCESS_MENU_ITEMS;
  showColumn = DriveConfig.SHOW_COLS;
  groupedNodes: { label: string; items: any[] }[] = [];
  headerConfig: {
    label: string;
    field?: any;
    getValue?: (v: any, node?: any) => any;
    type?: 'text' | 'custom' | 'checkbox' | 'avatar'
  }[] = [];
  headerLabels: any = {
    ALL: ['File name', 'Date uploaded', 'Modified', 'File size', 'Location'],
    MY_FILES: ['File name', 'Date uploaded', 'Modified', 'File size', 'Shared'],
    FAVORITE: ['File name', 'Favorited', 'Modified', 'Modified by'],
    TRASH: ['File name', 'Deleted Date', 'Deleted by', 'Created by', 'Original location'],
    SHARED_WITH_YOU: ['File name', 'Date shared', 'File size', 'File Owner'],
    SHARED_BY_YOU: ['File name', 'Modified', 'File size', 'shared by'],
    RECENT: ['File name', 'Date uploaded', 'Modified', 'File size', 'Location']
  };
  homeNode: LazyFileTreeNode = {
    id: null,
    itemName: "Home",
    isFolder: true,
  };
  selectedNodeIds: Set<string> = new Set();
  sortLabels: Record<string, string> = {
    "itemName": "Name",
    "modifiedDate": "Date Modified",
    "fileType": "Type",
    "size": "Size"
  };

  statusBarMenu: AllMenu = {
    OPEN: false,
    PREVIEW: false,
    SHARE: false,
    COPY_LINK: false,
    MANAGEACCESS: false,
    MOVE: false,
    DOWNLOAD: false,
    DELETE: false,
    COPY: false,
    RENAME: false,
    DETAILS: false,
    FOLDERCOLOR: false,
    DELETE_FOREVER: false,
    UNFAVORITE: false,
    RESTORE: false,
    OPEN_LOCATION: false,
    REMOVE: false,
    REQUEST_ACCESS: false,
    COMMAND: false,
    UPLOAD: false,
    CREATE: false,
    REFRESH: false
  };
  statusIcons: Record<string, { icon: string, color: string, tooltip: string }> = DriveConfig.STATUS_ICONS;
  contextMenu: AllMenu = { ...this.statusBarMenu };
  dialogMode: 'move' | 'copy' = 'move';
  email: any = '';
  userId = AppStorageService.getItem("userId");
  dialogOpen: boolean = false;
  multiMoveSourceIds: string[] = [];
  driveId: string = '';
  shareAction: "SHARE" | "LINK_ACCESS" | "MANAGE_ACCESS" | "MANAGE_PEOPLE_ACCESS" | "GRANT_ACCESS" = 'LINK_ACCESS';

  constructor(
    private alertService: AlertService,
    private cd: ChangeDetectorRef,
    private elRef: ElementRef,
    private electrionFileService: ElectronFileService,
    private service: FileService,
    private sharedService: SharedService,
    private router: Router
  ) {
    this.isElectron = this.sharedService.isElectron();
    this.email = AppStorageService.getItem('email');
  }

  checkScreenWidth() {
    this.isMiniScreen = window.innerWidth <= 950;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  useCalculateAgo(date: any): string {
    return this.sharedService.calculateAgo(new Date(date));
  }

  isToday(dateStr: any): boolean {
    const date = new Date(dateStr);
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  showCommandDialog: boolean = false;
  commandText: string = "";

  openCommandDialog(user: any) {
    this.driveId = user?.id;
    this.folderParentId = user?.parentId;
    this.contextMenuVisible = false;
    this.selectedData = user;
    this.emailInput = this.email || "";
    this.commandText = "";
    this.showCommandDialog = true;
  }

  closeCommandDialog() {
    this.showCommandDialog = false;
  }

  submitCommand() {
    const data = {
      userId: this.userId,
      userName: this.email,
      message: this.commandText,
      driveItemId: this.driveId,
      // parentId: this.folderParentId
      shareDetailId:this.selectedData?.shareDetailId,
      itemName: this.selectedData?.itemName
    }
    this.service.commentpost(data).subscribe({
      next: (res: any) => {
        this.alertService.show("Comment added successfully!", DriveConfig.VARIANTS.SUCCESS);
      },
    });
    this.showCommandDialog = false;
  }

  closeRenameDialog() {
    this.renamingNode = null;
    this.renameInput = '';
    this.renameInputExt = '';
    this.selectedNodeIds.clear()
  }

  formatSize(size?: number): string {
    return this.sharedService.formatSize(size);
  }

  handleFileSelection(target: any, event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const files = Array.from(input.files);
    const payload = {
      type: "FILE",
      record: files,
      emptyFolders: [],
      parentId: (target && target.id) || this.parentId,
    };
    this.createFolder(payload);
  }

  async handleFolderSelection(target: any, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const fileList = input.files;
    if (!fileList) return;
    const files: File[] = Array.from(fileList);
    const nonEmptyDirs = new Set<string>();
    for (const file of files) {
      const path = (file as any).webkitRelativePath;
      if (!path) continue;
      const parts = path.split("/");
      const fileParent = parts.slice(0, -1).join("/");
      if (fileParent) {
        nonEmptyDirs.add(fileParent);
      }
    }
    const emptyDirs = Array.from(nonEmptyDirs);
    const payload = {
      type: "FILE",
      record: files,
      emptyFolders: emptyDirs,
      parentId: (target && target.id) || this.parentId,
    };
    this.createFolder(payload);
  }

  isMenuOpens() {
    this.isMenuOpen = true;
  }

  isMobile(): boolean {
    return window.innerWidth < 640;
  }

  onBackClicked() {
    this.showPanel = false;
    this.hideSort = false;
  }

  onMobileOpen(node: any) {
    if (node.isFolder) {
      this.folderClicked.emit(node);
      return;
    } else {
      this.selectedFile = node;
      this.isModalOpen = true;
    }
  }

  onDoubleClick(node: any) {
    this.loading = true;
    const data = {
      id: node?.id,
      lastViewedAt: new Date().toISOString()
    };
    if (this.isElectron) {
      // this.electrionFileService.performFileAction(node.id, 'LASTOPENED').then(() => { });
    } else {
      this.service.updateLastView(data).subscribe((res: any) => { });
    }
    if (!this.parentId) {
      this.homeIcon = false;
    }
    this.selectedItem = node
    this.homeIcon = false;
    this.contextMenuVisible = false;
    if (this.page === 'SHARED_WITH_YOU' && this.getIsViewed(node)) {
      const permission = node.permissions.find((p: any) => p.userName === this.email);
      permission.isViewed = true;
      this.service.markAsViewed(permission.id, true).subscribe();
    }
    if (node.isFolder) {
      this.folderClicked.emit(node);
      return;
    }
    if (node.isLocal && node.syncStatus == 'AVAILABLE_ONLINE_ONLY') {
      this.electrionFileService.performFileAction(node.id, 'DOWNLOAD').then(() => { })
      return;
    }
    if (!node.fileDetailId) return;
    this.selectedFile = node;
    this.isModalOpen = true;
    this.loading = false;
    this.selectedNodeIds.clear();
  }

  @HostListener("document:click", ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.contextMenuVisible = false;
    const target = event.target as HTMLElement;
    if (this.uploadMenuRef && !this.uploadMenuRef.nativeElement.contains(target)) {
      this.toggleUploadMenu = false;
    }
    if (this.menuContainer && !this.menuContainer.nativeElement.contains(target)) {
      this.isMenuOpen = false;
    }
    if (this.renamingNode) {
      const renameDialog = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-30');
      if (renameDialog && !renameDialog.contains(target)) {
        this.closeRenameDialog();
      }
    }
    if (this.showMoreMenu && !target.closest('.overflow-menu-container')) {
      this.showMoreMenu = false;
    }
    if (this.viewContainer && !this.viewContainer.nativeElement.contains(target)) {
      this.showViewDropdown = false;
    }
  }

  onDragStart(event: DragEvent, node: any) {
    this.draggedNode = node;
    event.dataTransfer?.setData("text/plain", node.id);
  }

  uploadFromEmptyArea() {
    this.uploadFile();
    this.contextMenuVisible = false;
  }

  createFromEmptyArea() {
    this.isDialogOpen = true;
    this.contextMenuVisible = false;
  }

  refreshFromEmptyArea() {
    this.refreshFolder.emit('REFRESH');
    this.contextMenuVisible = false;
  }

  onEmptyAreaRightClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.selectedNodeIds.clear();
    this.selectedNodes = [];
    this.selectedItem = null;
    this.contextMenuTarget = null;
    this.updateMenuVisibility();
    if (!this.isMobile()) {
      const headerEl = document.querySelector('.context-menu') as HTMLElement | null;
      const h1 = headerEl ? headerEl.clientHeight : 330;
      const hostElement = this.elRef.nativeElement as HTMLElement;
      const { x, y } = this.sharedService.calculateMenuPosition(event, hostElement, h1);
      this.contextMenuX = x;
      this.contextMenuY = y;
      this.contextMenuVisible = true;
    }
  }

  onRightClick(event: MouseEvent, node: any | null) {
    if (this.sharedService.handleMobileMenuCheck(event)) {
      return;
    }
    this.contextMenuTarget = node;
    this.selectedItem = node;
    if (node && !this.selectedNodeIds.has(node.id)) {
      this.selectedNodeIds.clear();
      this.selectedNodeIds.add(node.id);
      this.selectedNodes = [node];
    }
    if (!this.isMobile()) {
      const headerEl = document.querySelector('.context-menu') as HTMLElement | null;
      const h1 = headerEl ? headerEl.clientHeight : 330;
      const hostElement = this.elRef.nativeElement as HTMLElement;
      const { x, y } = this.sharedService.calculateMenuPosition(event, hostElement, h1);
      this.updateMenuVisibility();
      this.contextMenuX = x;
      this.contextMenuY = y;
      this.contextMenuVisible = true;
    }
  }

  onNodeRightClick(event: MouseEvent, node: FileNode) {
    event.preventDefault();
    event.stopPropagation();
    this.onRightClick(event, node);
  }

  @HostListener('window:resize')
  onResize() {
    if (this.page != 'ALL') {
      this.isSmallScreen = window.innerWidth < 640;
      this.headerHeightPx = this.isSmallScreen ? 80 : this.headerHeightPx;
      this.setDynamicHeight();
    }
  }

  moveFolder(event: DragEvent, targetNode: any) {
    if (this.sharedService.handleMobileMenuCheck(event)) {
      return;
    }
    if (!targetNode.isFolder || this.draggedNode?.id === targetNode.id) return;
    const movedNode = { ...this.draggedNode, parentId: targetNode.id };
    this.folderMoved.emit({
      movedNodeId: movedNode.id,
      targetNodeId: targetNode.id,
    });
    this.draggedNode = null;
  }

  ngOnInit() {
    this.onResize()
    setTimeout(() => {
      this.setDynamicHeight();
    }, 50);
    window.addEventListener('resize', () => {
      this.setDynamicHeight();
    });
    this.checkScreenWidth();
    window.addEventListener('resize', this.checkScreenWidth.bind(this));
  }

  ngOnChanges(changes: SimpleChanges) {
    this.updateMenuVisibility();
    const scrollArea = this.scrollArea?.nativeElement;
    let currentScrollTop = 0;
    if (scrollArea) {
      currentScrollTop = scrollArea.scrollTop;
    }
    if (changes["headerHeightPx"]) {
      this.setDynamicHeight();
    }
    if (changes["nodes"]) {
      this.groupedNodes = changes["nodes"].currentValue || [];
      this.groupedNodes.forEach(group => {
        if (Array.isArray(group.items)) {
          group.items.forEach((item: any) => {
            item.isToday = this.isToday(item.modifiedDate);
          });
        }
      });
      this.selectedNodeIds.clear();
      this.nodes.forEach((node) => {
        if (!node.isFolder && !this.isElectron) {
          if (node.fileType?.startsWith('image/')) {
            node.thumbnailUrl = this.service.downloadFile(node.fileDetailId)
          } else {
            node.thumbnailUrl = `${environment.service_url}/file/thumbnail/${node.fileDetailId}?width=720&height=720`;
          }
        }
        node.color = node.color || '#FBBF24';
        node.darkenColor = this.sharedService.darkenColor(node.color || '#FBBF24', 20);
      });
      this.applySortingAndGrouping();
      if (this.showPanel && this.parentId) {
        this.togglePanel()
      }
      this.homeIcon = !this.parentId && this.selectedNodeIds.size === 0;
    }
    this.isLoadingMore = false;
    setTimeout(() => {
      const scrollEl = this.scrollArea?.nativeElement;
      if (scrollEl) {
        if (changes['parentId'] && changes['parentId'].previousValue !== changes['parentId'].currentValue) {
          scrollEl.scrollTop = 0;
        } else {
          scrollEl.scrollTop = currentScrollTop;
        }
        this.lastScrollHeight = scrollEl.scrollHeight;
      }
    }, 100);
  }

  ngOnDestroy() {
    const scrollArea = this.scrollArea?.nativeElement;
    if (scrollArea) {
      scrollArea.removeEventListener('scroll', this.onScroll.bind(this));
    }
    window.removeEventListener('resize', this.checkScreenWidth.bind(this));
    document.removeEventListener("click", this.handleClickOutside);
  }

  renameFolder(node: any) {
    this.contextMenuVisible = false;
    if (this.page === 'SHARED_WITH_YOU') {
      const parentFolder = this.parentFolder || node;
      const permission = parentFolder?.permissions?.find((p: any) => p.userName === this.email);
      const permissionType = permission ? permission.permissionType : node.permissionType;
      if (permissionType !== 'CAN_EDIT') {
        this.alertService.show("You do not have permission to rename this folder.", DriveConfig.VARIANTS.DANGER);
        return;
      }
    }
    this.renamingNode = node || this.selectedItem;
    if (!this.renamingNode) return;
    if (!this.renamingNode.isFolder) {
      const { nameWithoutExt, extension } = this.sharedService.getNameAndExt(this.renamingNode.itemName, this.renamingNode.fileType);
      this.renameInput = nameWithoutExt;
      this.renameInputExt = extension;
    } else {
      this.renameInput = this.renamingNode.itemName;
      this.renameInputExt = '';
    }
    this.isMoreOpen = false;
  }

  scrollToTop() {
    setTimeout(() => {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop = 0;
      }
    }, 0);
  }

  setDynamicHeight() {
    const vh = window.innerHeight;
    let calculatedHeight = vh - this.headerHeightPx;
    if (this.isMobile()) {
      calculatedHeight = calculatedHeight - 76;
    }
    this.dynamicHeight = `${Math.max(calculatedHeight, 220)}px`;
  }

  toggleShowMenu() {
    this.isShowMenu = !this.isShowMenu;
  }

  toggleView(mode: "list" | "grid") {
    this.viewMode = mode;
    this.scrollToTop();
  }

  toggleViewDropdown() {
    this.showViewDropdown = !this.showViewDropdown;
  }

  updateRename() {
    if (!this.renamingNode) return;
    let newName = this.renameInput?.trim();
    if (!newName) return;
    newName = this.renameInputExt ? `${newName}.${this.renameInputExt}` : newName;
    const payload = {
      id: this.renamingNode.id,
      newName,
      userId: this.userId
    };
    this.folderRenamed.emit(payload);
    this.selectedNodeIds.clear();
    this.closeRenameDialog();
  }

  uploadFile(target?: any) {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "*/*";
    input.style.display = "none";
    input.onchange = (ev: Event) => this.handleFileSelection(target, ev);
    document.body.appendChild(input);
    input.click();
    input.addEventListener("change", () => {
      document.body.removeChild(input);
    }, { once: true });
  }

  async uploadFolder(target?: any) {
    if ("showDirectoryPicker" in window && !this.sharedService.isMobile()) {
      await this.uploadViaDirectoryPickerMultiple(target);
    } else {
      const input = this.folderInput.nativeElement;
      input.onchange = (ev: Event) => this.handleFolderSelection(target, ev);
      input.click();
      input.multiple = true;
      input.accept = "*/*";
    }
  }

  async uploadViaDirectoryPickerMultiple(target?: any) {
    const result = await this.sharedService.pickAndReadDirectory();
    if (result) {
      const payload = {
        type: "FILE",
        record: result.files,
        emptyFolders: result.emptyDirs,
        parentId: target?.id || this.parentId,
      };
      this.createFolder(payload);
    }
  }

  @HostListener("document:dragover", ["$event"])
  @HostListener("document:drop", ["$event"])
  preventDefaultDragAndDrop(event: DragEvent) {
    if (this.sharedService.handleMobileMenuCheck(event)) {
      return;
    }
  }

  onDragOver(event: DragEvent) {
    if (this.sharedService.handleMobileMenuCheck(event)) {
      return;
    }
  }

  async onDrop(event: DragEvent) {
    if (this.sharedService.handleMobileMenuCheck(event)) {
      return;
    }
    const result = await this.sharedService.extractFilesAndDirsFromEvent(event);
    const payload = {
      type: "FILE",
      record: result.files,
      emptyFolders: result.emptyDirs,
      parentId: this.parentId,
    };
    this.createFolder(payload);
  }

  newFolder() {
    this.loading = true;
    const baseName = "untitled";
    let name = baseName;
    let count = 1;
    const existingNames = this.nodes.filter((n) => n.isFolder).map((n) => n.itemName.toLowerCase());
    while (existingNames.includes(name.toLowerCase())) {
      name = `${baseName} (${count++})`;
    }
    const userId = this.parentFolder?.userId || this.userId;
    const newFolder = {
      type: "NEW",
      record: {
        userId: userId,
        itemName: this.folderName,
        isFolder: true,
        parentId: this.parentId,
        color: this.selectedColor || '#FBBF24'
      },
      parentId: this.parentId,
    };
    this.createFolder(newFolder);
    this.loading = false;
  }

  openConfirmationModel(target?: any, isHard: boolean = false) {
    const isTrashPage = this.page === 'TRASH';
    const itemName = target?.itemName;
    const isFolder = target?.isFolder;

    this.targetvalye = target;
    this.isHardDelete = isHard;

    this.revertBtnText = isHard || isTrashPage || this.isEmptyTrash ? 'Cancel' : 'Keep';
    this.actionBtnText = isHard || isTrashPage ? 'Delete Forever' : 'Move to Trash';
    this.modelTitle = isHard || isTrashPage ? 'Delete Forever' : 'Delete';

    if (this.isEmptyTrash) {
      this.modelTitle = 'Empty Trash';
      this.actionBtnText = 'Empty';
      this.revertBtnText = 'Cancel';
      this.modelMessage =
        'Are you sure you want to permanently delete all items in the Trash? This action cannot be undone.';
    } else if (!target && isTrashPage) {
      this.modelTitle = 'Delete Forever';
      this.actionBtnText = 'Delete Forever';
      this.revertBtnText = 'Cancel';
      this.modelMessage =
        'Are you sure you want to permanently delete all items in the Trash? This action cannot be undone.';
    } else if (!target) {
      this.modelMessage = isHard
        ? 'Are you sure you want to permanently delete these items? This action cannot be undone.'
        : 'Are you sure you want to move these items to trash?';
    } else if (isTrashPage) {
      this.modelMessage = isFolder
        ? `Are you sure you want to permanently delete the folder "${itemName}" and all of its contents from the Trash? This action cannot be undone.`
        : `Are you sure you want to permanently delete "${itemName}" from the Trash? This action cannot be undone.`;
    } else if (isFolder) {
      this.modelMessage = isHard
        ? `Are you sure you want to permanently delete the folder "${itemName}" and all of its contents? This action cannot be undone.`
        : `Are you sure you want to move the folder "${itemName}" and all of its contents to the Trash?`;
    } else {
      this.modelMessage = isHard
        ? `Are you sure you want to permanently delete "${itemName}"? This action cannot be undone.`
        : `Are you sure you want to move "${itemName}" to the Trash?`;
    }

    this.isShowConfirmationModel = true;
  }

  confirmModelResponce(res: boolean) {

    if (res) {
      this.isEmptyTrash
        ? this.emptyTrash()
        : this.delete(this.targetvalye, this.isHardDelete);
    }

    this.isEmptyTrash = false;
    this.isShowConfirmationModel = false;
    this.modelTitle = '';
    this.actionBtnText = '';
    this.revertBtnText = '';
  }

  delete(target: any, isHard: boolean = false) {
    this.targetvalye = null;
    this.isHardDelete = false;
    this.contextMenuVisible = false;
    if (this.selectedNodeIds.size > 1) {
      target = null;
    }
    const targetsToDelete = target || (this.selectedNodeIds.size > 0 ? this.nodes.filter(n => this.selectedNodeIds.has(n.id)) : null);
    if (!targetsToDelete || (Array.isArray(targetsToDelete) && targetsToDelete.length === 0)) return;
    const localFiles = Array.isArray(targetsToDelete) ? targetsToDelete.filter(t => t.isLocal) : targetsToDelete.isLocal ? [targetsToDelete] : [];
    if (localFiles.length > 0) {
      localFiles.forEach(file => {
        this.loading = true;
        this.electrionFileService.performFileAction(file.id, 'REMOVE').then(() => {
          this.nodes = this.nodes.filter(n => n.id !== file.id);
          this.loading = false;
          this.selectedNodeIds.delete(file.id);
        });
      });
      if (Array.isArray(targetsToDelete) && localFiles.length === targetsToDelete.length) {
        return;
      }
    }
    const cloudFiles = Array.isArray(targetsToDelete) ? targetsToDelete.filter(t => !t.isLocal) : !targetsToDelete.isLocal ? [targetsToDelete] : [];
    if (cloudFiles.length === 0) return;
    const fileIds = cloudFiles.map(file => file.id);
    if (isHard) {
      this.folderDeleted.emit({ ids: fileIds, items: cloudFiles, isHard: true });
    } else {
      this.folderDeleted.emit({ ids: fileIds, items: cloudFiles });
    }
    this.selectedNodeIds = new Set<string>();
    this.isMoreOpen = false;
  }

  openLocation(node: any) {
    this.service.getFolderPath(node?.id).subscribe((res: string) => {
      const ids = this.getTargetIds(res);
      let url = '/drive/my-files';
      if (ids.length > 2) {
        const intermediateIds = ids.slice(1, ids.length - 1);
        intermediateIds.forEach(id => {
          const encoded = btoa(id);
          url += `/${encoded}`;
        });
      }
      this.router.navigateByUrl(url);
      this.isMoreOpen = false;
    });
  }

  getTargetIds(path: string): string[] {
    return path.split('/').filter(Boolean);
  }

  emptyTrash() {
    this.folderDeleted.emit("EMPTY");
  }

  togglePanel() {
    this.openDetails();
    this.contextMenuTarget = null;
    this.activeTab = 'details';
    if (this.parentId && !this.selectedItem) {
      this.service.getFolderOrFile(this.parentId).subscribe({
        next: (res: any) => {
          const item = res.data;
          if (res.data.isFolder) item.fileType = 'Folder';
          if (!item.size) {
            this.service.getStorageUsage(item?.userId, item?.fileDetailId).subscribe({
              next: (usageRes: any) => {
                item.size = usageRes?.data?.occupiedSpace;
                this.selectedItem = { ...item };
              },
              error: (err) => console.error(err),
            });
          }
          this.selectedItem = item;
        },
        error: (err) => console.error('Error fetching folder/file:', err),
      });
    }
    this.homeIcon = !this.parentId && this.selectedNodeIds.size === 0;
  }

  setActiveTab(tab: 'details' | 'activity' | 'comments') {
    this.activeTab = tab;
  }

  makeFavorite(target: any) {
    this.contextMenuVisible = false;
    if (!target) return;
    if (this.isElectron) {
      this.electrionFileService.performFileAction(target.id, 'PIN').then((res) => {
      this.contextMenuVisible = false;
      this.contextMenuTarget = null;
      target.syncStatus = 'ALWAYS_KEEP_ON_THIS_DEVICE';
      this.alertService.show("This item is now available online only", DriveConfig.VARIANTS.SUCCESS);
    }).catch((err) => {     
       this.alertService.show("Failed to change favorite status", DriveConfig.VARIANTS.DANGER);
    });
      return;
    }
    const hasMultiple = this.selectedNodeIds.size > 1;
    const isTargetInside = this.selectedNodeIds.has(target.id);
    if (hasMultiple && !isTargetInside) {
      const obj = { id: target.id, isFavorite: !target.isFavorite };
      this.service.updateFavoriteStatus(obj).subscribe((res: any) => {
        if (res?.success) {
          target.isFavorite = !target.isFavorite;
          this.favoriteToggled.emit(target);
        }
      });
      return;
    }
    if (hasMultiple && this.page !== "MY_FILES" && this.page !== "RECENT" && this.page !== "ALL") {
      const ids = Array.from(this.selectedNodeIds);
      const obj = { ids: ids, isFavorite: !target.isFavorite };
      this.service.updateFavoriteMultiple(obj).subscribe((res: any) => {
        if (res?.success) {
          const updatedItems = res.data;
          updatedItems.forEach((updated: any) => {
            const file = this.nodes.find(n => n.id === updated.id);
            if (file) {
              file.isFavorite = updated.isFavorite;
              if (!updated.isFavorite) {
                const index = this.nodes.findIndex(n => n.id === updated.id);
                if (index !== -1) this.nodes.splice(index, 1);
              }
            }
          });
          this.favoriteToggled.emit(obj);
        }
      });
      return;
    }
    const obj = { id: target.id, isFavorite: !target.isFavorite };
    this.service.updateFavoriteStatus(obj).subscribe((res: any) => {
      if (res?.success) {
        target.isFavorite = !target.isFavorite;
        this.favoriteToggled.emit(target);
      }
    });
  }

  share(node: FileNode | null, action: any = 'LINK_ACCESS'): void {
    if (!node && this.selectedNodeIds.size === 0) return;
    const ids = node ? [node.id] : Array.from(this.selectedNodeIds);
    this.sharedItemList = this.nodes.filter(n => ids.includes(n.id));
    this.service.getShareLinkByIds(ids, this.userId).subscribe((res: any) => {
      if (res && res.success) {
        this.sharedDetails = res.data;
        this.shareDialog = true;
        this.menuNode = null;
        this.shareAction = action;
      } else {
        this.sharedDetails = null;
      }
    });
    this.isMoreOpen = false;
    this.contextMenuVisible = false;
  }

  applySortingAndGrouping() {
    const sortFn = (a: any, b: any) => {
      const aVal = a[this.sortKey];
      const bVal = b[this.sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (this.sortKey === 'modifiedDate') {
        const aTime = new Date(aVal).getTime();
        const bTime = new Date(bVal).getTime();
        if (aTime === bTime) {
          return a.itemName.localeCompare(b.itemName);
        }
        return this.sortAsc ? aTime - bTime : bTime - aTime;
      }
      return this.sortAsc ? aVal.localeCompare?.(bVal) || aVal - bVal : bVal.localeCompare?.(aVal) || bVal - aVal;
    };
    const folders = this.nodes.filter((n) => n.isFolder).sort(sortFn);
    const files = this.nodes.filter((n) => !n.isFolder).sort(sortFn);
    const sortedNodes = this.sortAsc ? [...folders, ...files] : [...files, ...folders];
    if (this.sortKey === "modifiedDate" && this.isMobile() && (this.page === 'SHARED_WITH_YOU' || this.page === 'TRASH')) {
      this.groupedNodes = this.groupNodesByDate(sortedNodes);
    } else {
      this.groupedNodes = [{ label: "", items: sortedNodes }];
    }
  }

  checkSubmenuFlip(event: MouseEvent) {
    const buffer = 10;
    const submenuWidth = 160;
    const { innerWidth } = window;
    const targetRect = (event.target as HTMLElement).getBoundingClientRect();
    this.flipSubmenu = targetRect.right + submenuWidth + buffer > innerWidth;
  }

  clearSelection() {
    this.selectedNodeIds.clear();
    this.showPanel = false;
    this.selectedItem = null;
    this.updateMenuVisibility();
  }

  closeDialog() {
    this.isDialogOpen = false;
    this.folderName = '';
    this.selectedColor = '#FBBF24';
  }

  closeShareDialog(event: any) {
    if (!!event) {
      this.shareDialog = false
      this.selectedNodeIds.clear()
    }
  }

  copyLink(node: FileNode | null): void {
    this.contextMenuVisible = false;
    if (!node && this.selectedNodeIds.size === 0) return;
    const ids = node ? [node.id] : Array.from(this.selectedNodeIds);
    this.sharedItemList = this.nodes.filter(n => ids.includes(n.id));
    this.service.getShareLinkByIds(ids, this.userId).subscribe((res: any) => {
      if (res && res.success) {
        const data = res.data;
        const shareLink = data?.length ? data[0].shareDetails.shareLink : null;
        if (!shareLink) return;
        navigator.clipboard.writeText(`${environment.web_url}/share/${btoa(shareLink)}`);
        this.alertService.show("Shareable link copied to clipboard!", DriveConfig.VARIANTS.SUCCESS);
      }
    });
    this.isMoreOpen = false;
    this.selectedNodeIds.clear();
  }

  downloadFile(node?: any) {
    this.contextMenuVisible = false;
     if (this.isElectron) {
      this.electrionFileService.performFileAction(node.id, 'DOWNLOAD').then((res) => {
      this.contextMenuVisible = false;
      this.contextMenuTarget = null;
      node.syncStatus = 'AVAILABLE_OFFLINE';
      this.alertService.show("This item is now available offline", DriveConfig.VARIANTS.SUCCESS);
    }).catch((err) => {     
       this.alertService.show("Failed to download file", DriveConfig.VARIANTS.DANGER);
    });
      return;
    }
    // if (node.isLocal && node.syncStatus == 'AVAILABLE_ONLINE_ONLY') {
    //   this.electrionFileService.performFileAction(node.id, 'DOWNLOAD').then(() => {
    //     this.alertService.show("Download started", DriveConfig.VARIANTS.SUCCESS);
    //     node
    //   });
    //   this.selectedNodeIds.clear();
    //   return;
    // }
    node = node ?? (this.selectedNodeIds.size === 1 ? this.nodes.find(n => n.id === Array.from(this.selectedNodeIds)[0]) || null : null);
    if (this.page === 'SHARED_WITH_YOU') {
      const parentFolder = this.parentFolder || node;
      const permission = parentFolder?.permissions?.find((p: any) => p.userName === this.email);
      const permissionType = permission ? permission.permissionType : node.permissionType;
      if (!['CAN_EDIT', 'VIEW_DOWNLOAD'].includes(permissionType)) {
        this.alertService.show("You do not have permission to download.", DriveConfig.VARIANTS.DANGER);
        this.selectedNodeIds.clear();
        return;
      }
    }
    if (this.selectedNodeIds.size > 1) {
      const fileIds = this.nodes.filter(node => this.selectedNodeIds.has(node.id)).map(node => node.fileDetailId);
      const json = JSON.stringify(fileIds);
      const base64 = btoa(json);
      const downloadUrl = this.service.downloadMultipleFiles(base64);
      if (downloadUrl) {
        window.open(downloadUrl, "_blank");
      } else {
        console.error("Invalid download URL");
        this.alertService.show("Download failed", DriveConfig.VARIANTS.DANGER);
      }
      this.selectedNodeIds.clear();
      return;
    }
    if (!node?.fileDetailId) return;
  
    let downloadUrl;
    if (node.isFolder) {
      downloadUrl = this.service.downloadFolder(node.fileDetailId);
    } else {
      downloadUrl = this.service.downloadFile(node.fileDetailId);
    }
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    } else {
      this.alertService.show("Download failed", DriveConfig.VARIANTS.DANGER);
    }
    this.selectedNodeIds.clear();
  }

  executeMenuAction(menuKey: string) {
    const target = this.contextMenuTarget || (this.selectedNodeIds.size > 0 ? this.nodes.find(n => this.selectedNodeIds.has(n.id)) : null);
    switch (menuKey) {
      case 'OPEN': this.onDoubleClick(target); break;
      case 'SHARE': this.share(target); break;
      case 'DOWNLOAD': this.downloadFile(target); break;
      case 'DELETE': this.delete(target); break;
      case 'MOVE': this.openActionDialog('move', target); break;
      case 'RENAME': this.renameFolder(target); break;
      case 'COPY_LINK': this.copyLink(target); break;
      case 'RESTORE': this.restore(target); break;
      case 'UNFAVORITE': this.makeFavorite(target); break;
      case 'DELETE_FOREVER': this.delete(target, true); break;
      case 'OPEN_LOCATION': this.openLocation(target); break;
      default: console.warn('Unknown menu action:', menuKey);
    }
    this.showMoreMenu = false;
  }

  freeUpSpace(file: any) {
    if (!['AVAILABLE_OFFLINE', 'ALWAYS_KEEP_ON_THIS_DEVICE'].includes(file.syncStatus)) return;
    this.electrionFileService.performFileAction(file.id, 'UNPIN').then((res) => {
      this.contextMenuVisible = false;
      this.contextMenuTarget = null;
      file.syncStatus = 'AVAILABLE_ONLINE_ONLY';
      this.alertService.show("This item is now available online only", DriveConfig.VARIANTS.SUCCESS);
    }).catch((error) => {
      this.alertService.show("Failed to free up space", DriveConfig.VARIANTS.DANGER);
    });
  }

  getColor(user: { firstName?: string, userName: string }): string {
    let userName;
    if (user.firstName && user.firstName.length > 0) {
      userName = user.firstName
    } else {
      userName = user.userName
    }
    if (!userName) return 'bg-gray-400';
    const index = userName.charCodeAt(0) % this.batchColors.length;
    return this.batchColors[index];
  }

  getHeaderMenus(): any[] {
    const allVisible = this.getVisibleMenuItems(true);
    const headerMenus = allVisible.slice(0, 2);
    return headerMenus.map(menu => ({ ...menu, action: () => this.executeMenuAction(menu.key) }));
  }

  getIconForNode(node: any): string {
    return this.sharedService.getIconForNode(node?.fileType, node?.isFolder, node?.itemName);
  }

  getInitial(user: { firstName?: string, userName: string }): string {
    if (!user.firstName && !user.userName) return '';
    if (user.firstName && user.firstName.length > 0) {
      return user.firstName.charAt(0).toUpperCase();
    }
    return user.userName.charAt(0).toUpperCase();
  }

  getIsViewed(node: any): boolean {
    if (!node?.permissions) return false;
    return node.permissions.some((p: any) => p.userName === this.email && !p.isViewed);
  }

  getLocationPath(node: any): string {
    if (!node?.location) return '';
    const ids = this.getTargetIds(node.location);
    const pathParts = ids.slice(1, ids.length - 1);
    let path = pathParts.join('/');
    path = path ? path.replace('MyFiles', 'My Files') : '-';
    return path;
  }

  getOverflowMenus(): any[] {
    const allVisible = this.getVisibleMenuItems(true);
    const overflowMenus = allVisible.slice(2);
    return overflowMenus.map(menu => ({ ...menu, action: () => this.executeMenuAction(menu.key) }));
  }

  getSharedDate(node: any): string {
    if (!node?.permissions) return '';
    const permission = node.permissions.find((p: any) => p.userName === this.email);
    return permission ? permission.createdDate : '';
  }

  getUserTooltip(user: { firstName?: string, lastName?: string, userName: string }): string {
    let tooltip = ''
    if (user.firstName || user.lastName) {
      tooltip = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    tooltip = user.userName
    return tooltip;
  }

  getVisibleMenuItems(isForHeader: boolean = false): any[] {
    const isFolder = this.contextMenuTarget?.isFolder ?? false;
    const isMultiSelect = this.selectedNodeIds?.size > 1;
    const currentMenuConfig = this.menuList[this.page] || [];
    return currentMenuConfig.filter((item: any) => {
      if (isMultiSelect && !item.isMultiSelect) return false;
      if (item.isFolder !== null && item.isFolder !== isFolder) return false;
      if (isForHeader && !item.isShowBar) return false;
      return true;
    });
  }

  groupNodesByDate(nodes: FileNode[]) {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    const groups: { label: string; items: FileNode[] }[] = [];
    const today: FileNode[] = [];
    const lastWeek: FileNode[] = [];
    const thisMonth: FileNode[] = [];
    const older: Record<string, FileNode[]> = {};
    for (const node of nodes) {
      if (!node.modifiedDate) continue;
      const modified = new Date(node.modifiedDate);
      const diff = now.getTime() - modified.getTime();
      if (diff < oneDay) {
        today.push(node);
      } else if (diff < sevenDays) {
        lastWeek.push(node);
      } else if (modified.getMonth() === now.getMonth() && modified.getFullYear() === now.getFullYear()) {
        thisMonth.push(node);
      } else {
        const monthLabel = modified.toLocaleString("default", { month: "long", year: "numeric" });
        if (!older[monthLabel]) older[monthLabel] = [];
        older[monthLabel].push(node);
      }
    }
    if (today.length) groups.push({ label: "Today", items: today });
    if (lastWeek.length) groups.push({ label: "Last Week", items: lastWeek });
    if (thisMonth.length) {
      const monthName = now.toLocaleString("default", { month: "long" });
      groups.push({ label: monthName, items: thisMonth });
    }
    for (const [label, items] of Object.entries(older)) {
      groups.push({ label, items });
    }
    return groups;
  }

  handleClickOutside = (event: MouseEvent) => {
    if (!this.containerRef?.nativeElement.contains(event.target)) {
      this.selectedNodeIds.clear();
    }
  };

  hasOverflowMenus(): boolean {
    const allVisible = this.getVisibleMenuItems(true);
    return allVisible.length > 2;
  }

  navigateBackTo(level: number) {
    this.folderPath = this.folderPath.slice(0, level + 1);
    const folder = this.folderPath[level];
    this.moveTargetFolder = folder;
    this.service.loadChilderen(folder.id, this.userId).subscribe((res: any) => {
      if (res?.success) {
        this.currentFolderChildren = res.data.filter((c: any) => c.isFolder && this.moveSourceNode?.id !== c.id).map((c: any) => ({ ...c }));
      }
    });
  }

  onDataLoaded(newData: any[]) {
    this.isLoadingMore = false;
    if (!newData || newData.length === 0) {
      this.hasMoreData = false;
    }
    setTimeout(() => {
      const scrollArea = this.scrollArea?.nativeElement;
      if (scrollArea && scrollArea.scrollHeight > scrollArea.clientHeight) {
        scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.clientHeight - 50;
      }
    }, 100);
  }

  onImageError(event: Event, node: any) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/icons/' + this.getIconForNode(node);
  }

  onScroll(e: Event) {
    if (this.isLoadingMore || !this.hasMoreData || this.loading) {
      return;
    }
    clearTimeout(this.scrollDebounceTimer);
    this.scrollDebounceTimer = setTimeout(() => {
      const el = e.target as HTMLElement;
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      const scrollThreshold = 50;
      if (distanceFromBottom <= scrollThreshold && el.scrollHeight > this.lastScrollHeight) {
        this.isLoadingMore = true;
        this.lastScrollHeight = el.scrollHeight;
        this.scrolled.emit(true);
      }
    }, 150);
  }

  onSelectNode(event: MouseEvent, node: any): void {
    this.updateMenuVisibility();
    if (this.sharedService.handleMobileMenuCheck(event)) {
      return;
    }
    const index = this.selectedNodes.findIndex(n => n.id === node.id);
    if (index > -1) {
      this.selectedNodes.splice(index, 1);
      this.selectedNodeIds.delete(node.id);
    } else {
      this.selectedNodes.push(node);
      this.selectedNodeIds.add(node.id);
      if (!node.size) {
        this.service.getStorageUsage(node.userId, node.fileDetailId).subscribe({
          next: (res: any) => {
            node.size = res?.data?.occupiedSpace;
          },
          error: (err) => console.error(err),
        });
      }
    }
    if (this.selectedNodes.length > 0) {
      this.selectedItem = this.selectedNodes[0];
    } else if (this.parentId) {
      this.service.getFolderOrFile(this.parentId).subscribe({
        next: (res: any) => {
          const item = res.data;
          if (item.isFolder) {
            item.fileType = "Folder";
          }
          if (!item.size) {
            this.service.getStorageUsage(item?.userId, item?.fileDetailId).subscribe({
              next: (usageRes: any) => {
                item.size = usageRes?.data?.occupiedSpace;
                this.selectedItem = { ...item };
              },
              error: (err) => console.error(err),
            });
          }
          this.selectedItem = item;
        },
        error: (err) => console.error("Error fetching parent folder:", err),
      });
    } else {
      this.selectedItem = null;
    }
    this.homeIcon = this.selectedNodes.length === 0 && !this.parentId;
    this.selectedNodeIds = new Set(this.selectedNodeIds);
    this.selectedNodes = [...this.selectedNodes];
  }

  closeBothDialogs() {
    this.dialogOpen = false;
    this.copyDialogOpen = false;
    this.moveDialogOpen = false;
    this.moveTargetFolder = null;
    this.currentFolderChildren = [];
    this.folderPath = [];
    this.moveSourceNode = null;
    this.selectedNodeIds.clear();
    this.cd.detectChanges();
  }

  handleAction(event: any) {
    if (event.success && event.mode == 'move') {
      if (this.moveSourceNode) {
        this.nodes = this.nodes.filter(node => node.id !== this.moveSourceNode?.id);
      } else if (this.selectedNodeIds.size > 0) {
        this.nodes = this.nodes.filter(node => !this.selectedNodeIds.has(node.id));
      }
      this.selectedNodeIds.clear();
      this.selectedNodes = [];
      this.folderMoved.emit(this.moveSourceNode ? this.moveSourceNode?.id : this.multiMoveSourceIds);
    }
    this.closeBothDialogs();
    this.moveSourceNode = null;
  }

  openActionDialog(mode: 'move' | 'copy', node: FileNode | null) {
    this.dialogMode = mode;
    this.dialogOpen = true;
    this.moveSourceNode = null;
    this.multiMoveSourceIds = [];
    this.moveTargetFolder = this.parentFolder?.id;
    if (node) {
      this.moveSourceNode = node;
    } else if (this.selectedNodeIds.size > 0) {
      const selected = [...this.selectedNodeIds];
      if (selected.length === 1) {
        this.moveSourceNode = this.nodes.find(n => n.id === selected[0]) || null;
      } else {
        this.multiMoveSourceIds = selected;
      }
    }
    this.moveDialogOpen = (mode === 'move');
    this.copyDialogOpen = (mode === 'copy');
  }

  openDetails() {
    this.contextMenuVisible = false;
    this.showPanel = !this.showPanel;
    this.homeIcon = false;
    if (this.isMobile() && this.showPanel) {
      this.hideSort = true;
    }
  }

  get openState() {
    return this.dialogOpen;
  }

  getSelectedNodeIdsArray(): string[] {
    return Array.from(this.selectedNodeIds);
  }

  set openState(value: boolean) {
    this.dialogOpen = value;
    if (!value) this.closeBothDialogs();
  }

  private getExcludedIds(node: FileNode | null): number[] {
    let exclude: number[] = [];
    if (node) {
      exclude = [Number(node.id)];
    } else if (this.selectedNodeIds.size > 0) {
      const selectedFolders = this.nodes.filter(n => this.selectedNodeIds.has(n.id));
      exclude = selectedFolders.map(folder => Number(folder.id)).filter(id => !isNaN(id));
    }
    return exclude;
  }

  refreshCurrentFolder() {
    if (this.parentId) {
      this.folderClicked.emit({ id: this.parentId });
    } else {
      this.refreshFolder.emit('REFRESH_AFTER_MOVE');
    }
  }

  removeFromRecentFile(recentFile: any, menu?: any): void {
    if (!recentFile?.id) return;
    this.service.removeRecent(recentFile.id).subscribe({
      next: (res: any) => {
        this.contextMenuVisible = false;
        this.removeFromGroupedNodes(recentFile.id);
      },
      error: (err) => {
        console.error('Error updating recent file:', err);
      }
    });
    this.selectedNodeIds.clear();
  }

  removeFromGroupedNodes(id: string) {
    this.groupedNodes = this.groupedNodes.map(group => ({ ...group, items: group.items.filter((item: any) => item.id !== id) })).filter(group => group.items.length > 0);
  }

  restore(item: any) {
    this.loading = true;
    this.FileRestore.emit(item ? item : this.selectedNodeIds);
    this.selectedNodeIds.clear();
    this.isMoreOpen = false;
    this.loading = false;
    this.contextMenuVisible = false;
  }

  selectColor(color: string) {
    this.selectedColor = color;
  }

  selectedFileType(id: any) {
    this.fileType = id;
    this.fileTypeSelected.emit(id);
  }

  setFolderColor(node: any, color: string) {
    if (!node) return;
    const payload = { id: node.id, color: color, lastViewedAt: new Date().toISOString() };
    if (!this.isElectron) {
      this.service.updateLastView(payload).subscribe({
        next: (res) => {
          node.color = color;
          node.darkenColor = this.sharedService.darkenColor(node.color || '#FBBF24', 20);
        },
        error: (err) => { console.error("Error updating color:", err); }
      });
    } else {
      this.electrionFileService.updateColor(node.id, color).then(() => {
        node.color = color;
        node.darkenColor = this.sharedService.darkenColor(node.color || '#FBBF24', 20);
      });
    }
  }

  setGroupBy(key: keyof FileNode | null) {
    this.groupBy = key;
    this.applySortingAndGrouping();
  }

  setSort(key: keyof FileNode) {
    this.sortKey = key;
    this.applySortingAndGrouping();
  }

  shareClose($event: any) {
    this.shareDialog = false;
    this.selectedNodeIds.clear();
    if ($event === 'CHANGED') {
      this.refreshFolder.emit('SHARE_CHANGED');
    }
  }

  showMenu(key: any, isFolder: boolean = false, isShowBar: boolean = false, inPopup: boolean = false): boolean {
    const isMultiSelect = this.selectedNodeIds?.size > 1;
    const showItem = this.menuList[this.page]?.find((item: any) => item.key === key);
    if (!showItem) return false;
    if (isShowBar && !showItem.isSowBar) return false;
    if (isMultiSelect) return !!showItem.isMultiSelect;
    if (showItem.isFolder === null) return true;
    if (this.isMiniScreen) {
      if (inPopup) return !showItem.isHalfScreen;
      return showItem.isHalfScreen;
    }
    return showItem.isFolder === isFolder;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleMoreMenu() {
    this.isMoreOpen = !this.isMoreOpen;
  }

  toggleSelection(node: any, event: any) {
    this.contextMenuVisible = false;
    event.stopPropagation();
    if (this.selectedNodeIds.has(node.id)) {
      this.selectedNodeIds.delete(node.id);
    } else {
      this.selectedNodeIds.add(node.id);
      if (!node.size && this.selectedNodeIds.size == 1) {
        this.service.getStorageUsage(node.userId, node.fileDetailId).subscribe({
          next: (res: any) => { node.size = res?.data?.occupiedSpace; },
          error: (err) => console.error(err),
        });
      }
    }
    if (this.selectedNodeIds.size > 0) {
      const firstSelected = this.nodes.find(n => this.selectedNodeIds.has(n.id));
      this.selectedItem = firstSelected || null;
      this.contextMenuTarget = firstSelected;
    } else if (this.parentId) {
      this.service.getFolderOrFile(this.parentId).subscribe({
        next: (res: any) => {
          const item = res.data;
          if (item.isFolder) item.fileType = "Folder";
          if (!item.size) {
            this.service.getStorageUsage(item?.userId, item?.fileDetailId).subscribe({
              next: (usageRes: any) => {
                item.size = usageRes?.data?.occupiedSpace;
                this.selectedItem = { ...item };
              },
              error: (err) => console.error(err),
            });
          }
          this.selectedItem = item;
        },
        error: (err) => console.error("Error fetching parent folder:", err),
      });
    } else {
      this.selectedItem = null;
      this.contextMenuTarget = null;
    }
    this.updateMenuVisibility();
    this.homeIcon = this.selectedNodeIds.size === 0 && !this.parentId;
    this.selectedNodeIds = new Set(this.selectedNodeIds);
  }

  toggleSortOrder() {
    this.sortAsc = !this.sortAsc;
    this.applySortingAndGrouping();
  }

  updateMenuVisibility() {
    if (!this.contextMenuTarget && this.selectedNodeIds.size === 0) {
      Object.keys(this.contextMenu).forEach(key => {
        const emptyAreaActions = ['UPLOAD', 'CREATE', 'REFRESH'];
        this.contextMenu[key as keyof AllMenu] = emptyAreaActions.includes(key);
      });
      Object.keys(this.statusBarMenu).forEach(key => {
        const emptyAreaActions = ['UPLOAD', 'CREATE', 'REFRESH'];
        this.statusBarMenu[key as keyof AllMenu] = emptyAreaActions.includes(key);
      });
      return;
    }
    const isFolder = this.contextMenuTarget?.isFolder ?? false;
    Object.keys(this.contextMenu).forEach(key => {
      this.contextMenu[key as keyof AllMenu] = this.showMenu(key, isFolder, false, false);
    });
    Object.keys(this.statusBarMenu).forEach(key => {
      this.statusBarMenu[key as keyof AllMenu] = this.showMenu(key, isFolder, false, false);
    });
  }

  openRequestDialog(user: any, type?: any) {
    this.contextMenuVisible = false;
    this.selectedData = user;
    this.emailInput = this.email || '';
    this.selectedAccess = 'CAN_EDIT';
    this.showRequestDialog = true;
  }

  submitRequestAccess() {
    const payload = {
      userName: this.emailInput,
      permissionType: this.selectedAccess,
      shareDetailId: this.selectedData.shareDetailId,
    };
    this.service.requestAccessToSharedFile(payload).subscribe({
      next: (res: any) => {
        this.alertService.show("Request Sent Successfully!", DriveConfig.VARIANTS.SUCCESS);
        this.showRequestDialog = false;
      },
      error: (err: any) => {
        console.error("Request access error:", err);
        const backendMsg = err?.error?.message || "Something went wrong.";
        switch (err.status) {
          case 409: this.alertService.show(backendMsg, DriveConfig.VARIANTS.WARNING); break;
          case 400: this.alertService.show(backendMsg, DriveConfig.VARIANTS.DANGER); break;
          case 404: this.alertService.show("File or share details not found.", DriveConfig.VARIANTS.DANGER); break;
          default: this.alertService.show(backendMsg, DriveConfig.VARIANTS.DANGER); break;
        }
      }
    });
  }

  closeRequestDialog() {
    this.showRequestDialog = false;
    this.selectedNodeIds.clear();
  }

  async createFolder(data: any) {
    let parentFileDetailId = data.parentId ? this.parentFolder?.fileDetailId : "";
    if (["EDIT", "NEW"].includes(data.type)) {
      let record = data.record;
      record.parentFolderId = parentFileDetailId;
      this.service.createOrUpdateFileAndFolder(record).subscribe((res: any) => {
        if (res?.success && res.data) {
          this.alertService.show('Folder created successfully!', DriveConfig.VARIANTS.SUCCESS);
          this.folderCreated.emit(res.data);
          this.closeDialog();
        }
      }, (err: any) => {
        if (err.status === 409) {
          this.alertService.show('Folder already exists. Please use a different name.', DriveConfig.VARIANTS.WARNING);
        } else {
          this.alertService.show(err?.error?.errorMessage || 'Error creating folder.', DriveConfig.VARIANTS.DANGER);
        }
      });
    } else if (data.type === "FILE") {
      const userId = this.parentFolder?.userId || this.userId;
      try {
        const response = await this.service.uploadFileList(data.record, data.parentId, parentFileDetailId, data.emptyFolders, userId);
        this.refreshFolder.emit('FILE_UPLOADED');
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
  }

showConflictDialog = false;
selectedConflictNode: any = null;

openConflictDialog(node: any) {
  this.showConflictDialog = true;
  this.selectedConflictNode = node;
}
  
  replacecloudOrLocalFile(node: any, action: any) {  
    console.log("Replacing file with action:", action, "Node:", node);
    if (node.isLocal &&  ['VERSION_UPDATE_PENDING', 'CHANGE_PENDING'].includes(node.syncStatus)) {
      const id = this.page === 'SHARED_WITH_YOU' ? node.fileId : node.id;
      this.electrionFileService.performFileAction(id, action).then(() => { 
        node.syncStatus = 'AVAILABLE_OFFLINE';
        this.alertService.show("File replaced with local version", DriveConfig.VARIANTS.SUCCESS);
        this.showConflictDialog = false;
        this.selectedConflictNode = null;
      })
      return;
    }
  } 
}