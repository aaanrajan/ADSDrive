import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FileService } from "../../shared/service/file.service";
import { CommonModule } from "@angular/common";
import { SharedService } from "../../shared/shared.service";
import { AppStorageService } from "../../shared/service/app-storage.service";
import { AlertService } from "../../shared/alert-service/alert.service";
import { DriveConfig } from "../../shared/config/drive.config";
import { SharedModule } from "../../shared/shared.module";
import { environment } from "../../../environments/environment";

interface MenuItem {
  key: string;
  label: string;
  icon: string;
  isMultiSelect: boolean;
  showForOwnerOnly: boolean,
  action: () => void;
}

@Component({
  selector: "app-people-view",
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: "./people-view.component.html",
  styleUrls: ["./people-view.component.scss"],
})
export class PeopleViewComponent implements OnInit {
  person: any = null;
  files: any[] = [];
  personFiles: any[] = [];
  selectedNodeIds = new Set<string>();
  selectedFiles: any[] = [];
  contextMenuVisible: boolean = false;
  contextMenuX: number = 0;
  contextMenuY: number = 0;
  contextMenuTarget: any = null;
  private clickListener: any;
  name: any;
  user: any;
  loggedInEmail: string = '';
  userId: string = '';
  loading: boolean = false;
  activeMenu: string | null = null;
  headerMenuItems: MenuItem[] = [];
  shareDialog: boolean = false;
  sharedItemList: any[] = [];
  selectedFilter = 'all';
  showMobileOptions: boolean = false;
  selectedMobileFile: any = null;

  // Sorting properties
  sortKey: keyof any = "fileName";
  sortAsc: boolean = true;
  sortDirection: string = 'desc';

  // Filter properties
  selectedFileTypeFilter: string = 'all';

  // Mobile specific options
  mobileSortType: string = '';
  selectedMobileFilter: string = 'all';

  // Menu items
  menuItems: MenuItem[] = [
    {
      key: 'DOWNLOAD',
      label: 'Download',
      icon: 'fas fa-download',
      isMultiSelect: true,
      showForOwnerOnly: false,
      action: () => this.downloadFile()
    },
    {
      key: 'COPY_LINK',
      label: 'Copy link',
      icon: 'fas fa-link',
      isMultiSelect: false,
      showForOwnerOnly: false,
      action: () => this.copyLink()
    },
    {
      key: 'REMOVE',
      label: 'Remove',
      icon: 'fas fa-trash',
      isMultiSelect: false,
      showForOwnerOnly: true,
      action: () => this.removeFile()
    }
  ];

  mobileSortLabelMap: any = {
    fileName: 'Name',
    sharedDate: 'Date Modified',
    fileType: 'Type',
    size: 'Size'
  };

  mobileFilterOptions = [
    { id: 'all', label: 'All files' },
    { id: 'folder', label: 'Folders' },
    { id: 'document', label: 'Documents' },
    { id: 'image', label: 'Images' },
    { id: 'video', label: 'Videos' },
    { id: 'audio', label: 'Audio' },
  ];

  // ViewChild references for dropdowns
  @ViewChild('sortDropdownContainer') sortDropdownContainer!: ElementRef;
  @ViewChild('filterDropdownContainer') filterDropdownContainer!: ElementRef;
  @ViewChild('mobileSortDropdownContainer') mobileSortDropdownContainer!: ElementRef;
  @ViewChild('mobileFilterDropdownContainer') mobileFilterDropdownContainer!: ElementRef;

  constructor(
    private router: Router,
    private fileService: FileService,
    private sharedService: SharedService,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {
    this.userId = AppStorageService.getItem("userId") || '';
    this.loggedInEmail = AppStorageService.getItem('email') || '';
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['user']) {
        this.user = JSON.parse(atob(params['user']))
        this.name = this.user?.name;
        this.getUserSharedFiles(this.userId, this.user.email);
      }

      this.showMobileOptions = false;
      this.activeMenu = null;
    });

    this.updateMenuVisibility();
  }

  @HostListener('document:contextmenu', ['$event'])
  onDocumentContextMenu(event: MouseEvent) {
    this.contextMenuVisible = false;
  }

  @ViewChild('menuContainer') menuContainer!: ElementRef;

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // CLOSE CONTEXT MENU
    if (
      this.contextMenuVisible &&
      this.menuContainer &&
      !this.menuContainer.nativeElement.contains(target)
    ) {
      this.contextMenuVisible = false;
    }

    // CLOSE DROPDOWNS
    if (
      this.activeMenu &&
      !this.sortDropdownContainer?.nativeElement.contains(target) &&
      !this.filterDropdownContainer?.nativeElement.contains(target) &&
      !this.mobileSortDropdownContainer?.nativeElement.contains(target) &&
      !this.mobileFilterDropdownContainer?.nativeElement.contains(target)
    ) {
      this.activeMenu = null;
    }
  }
  
  @HostListener('document:touchstart', ['$event'])
onTouchOutside(event: TouchEvent) {
  const target = event.target as HTMLElement;
  if (
    this.contextMenuVisible &&
    this.menuContainer &&
    !this.menuContainer.nativeElement.contains(target)
  ) {
    this.contextMenuVisible = false;
  }
}

  // Main sort method
  setSort(key: keyof any) {
    this.sortKey = key;
    this.applySorting();
    this.activeMenu = null;
  }

  toggleSortOrder() {
    this.sortAsc = !this.sortAsc;
    this.sortDirection = this.sortAsc ? 'asc' : 'desc';
    this.applySorting();
    this.activeMenu = null;
  }

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortAsc = this.sortDirection === 'asc';
    this.applySorting();
  }

  applySorting() {
    let result = [...this.files];

    // Apply filter first
    const activeFilter = this.isMobile() ? this.selectedMobileFilter : this.selectedFileTypeFilter;

    switch (activeFilter) {
      case 'folder':
        result = result.filter(item => item.isFolder || !item.fileType);
        break;

      case 'image':
        result = result.filter(item => {
          if (item.isFolder) return false;
          const cleanName = (item.fileName || '').split('?')[0].toLowerCase();
          return (
            item.fileType?.startsWith('image/') ||
            cleanName.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)
          );
        });
        break;

      case 'video':
        result = result.filter(item =>
          item.fileType?.startsWith('video/') ||
          /\.(mp4|mkv|avi|mov|wmv|flv)$/i.test(item.fileName)
        );
        break;

      case 'audio':
        result = result.filter(item =>
          item.fileType?.startsWith('audio/') ||
          /\.(mp3|wav|ogg|aac|m4a)$/i.test(item.fileName)
        );
        break;

      case 'document':
        result = result.filter(item =>
          /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|html|csv)$/i.test(item.fileName) ||
          [
            'application/pdf',
            'text/html',
            'application/msword',
            'application/vnd.ms-excel'
          ].includes(item.fileType)
        );
        break;

      default:
        break;
    }

    // Apply sorting
    const sortFn = (a: any, b: any) => {
      const aVal = a[this.sortKey];
      const bVal = b[this.sortKey];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Handle date sorting
      if (this.sortKey === 'sharedDate' || this.sortKey === 'createdDate') {
        const aDate = new Date(aVal).getTime();
        const bDate = new Date(bVal).getTime();
        return this.sortAsc ? aDate - bDate : bDate - aDate;
      }

      // Handle size sorting
      if (this.sortKey === 'size') {
        return this.sortAsc ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
      }

      // Handle file type sorting
      if (this.sortKey === 'fileType') {
        const aType = this.getFileCategoryForSort(a);
        const bType = this.getFileCategoryForSort(b);
        const typeOrder = ['folder', 'document', 'image', 'video', 'audio', 'other'];
        const aIndex = typeOrder.indexOf(aType);
        const bIndex = typeOrder.indexOf(bType);
        return this.sortAsc ? aIndex - bIndex : bIndex - aIndex;
      }

      // Handle string sorting (for name)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return this.sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      // Default numeric/other sorting
      return this.sortAsc ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
    };

    const folders = result.filter((n) => n.isFolder).sort(sortFn);
    const files = result.filter((n) => !n.isFolder).sort(sortFn);
    const sortedNodes = this.sortAsc ? [...folders, ...files] : [...files, ...folders];

    this.personFiles = sortedNodes;
  }

  getFileCategoryForSort(file: any): string {
    if (file.isFolder) return 'folder';
    if (!file.fileType && !file.fileName) return 'other';

    const fileName = (file.fileName || '').toLowerCase();
    const fileType = (file.fileType || '').toLowerCase();

    if (fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/.test(fileName)) {
      return 'image';
    } else if (fileType.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|mkv|webm)$/.test(fileName)) {
      return 'video';
    } else if (fileType.startsWith('audio/') || /\.(mp3|wav|ogg|aac|m4a)$/.test(fileName)) {
      return 'audio';
    } else if (fileType.includes('pdf') || fileType.includes('word') || fileType.includes('excel') ||
      fileType.includes('powerpoint') || fileType.includes('text') ||
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/.test(fileName)) {
      return 'document';
    }

    return 'other';
  }

  // Mobile specific methods
  getMobileSortLabel() {
    return this.mobileSortLabelMap[this.sortKey] || 'Sort';
  }


  onMobileSortSelected(sortType: string): void {
    this.mobileSortType = this.mobileSortType === sortType ? '' : sortType;

    // Map mobile sort to regular sort
    if (sortType === 'az') {
      this.sortKey = 'fileName';
      this.sortAsc = true;
    } else if (sortType === 'za') {
      this.sortKey = 'fileName';
      this.sortAsc = false;
    } else if (sortType === 'newest') {
      this.sortKey = 'sharedDate';
      this.sortAsc = false;
    } else if (sortType === 'oldest') {
      this.sortKey = 'sharedDate';
      this.sortAsc = true;
    } else if (sortType === 'largest') {
      this.sortKey = 'size';
      this.sortAsc = false;
    } else if (sortType === 'smallest') {
      this.sortKey = 'size';
      this.sortAsc = true;
    }

    this.activeMenu = null;
    this.applySorting();
  }

  onMobileFilterSelected(filterType: string): void {
    this.selectedMobileFilter = filterType;
    this.selectedFileTypeFilter = filterType; // Sync with desktop filter
    this.activeMenu = null;
    this.applySorting();
  }

  onFileTypeFilterSelected(filterType: string): void {
    this.selectedFileTypeFilter = filterType;
    this.selectedMobileFilter = filterType; // Sync with mobile filter
    this.activeMenu = null;
    this.applySorting();
  }

  toggleMenu(menuType: 'sort' | 'filter' | 'mobileSort' | 'mobileFilter'): void {
    if (this.activeMenu === menuType) {
      this.activeMenu = null;
    } else {
      this.activeMenu = menuType;
    }
    this.contextMenuVisible = false;
    this.showMobileOptions = false;
  }

  // Date formatting method
  formatDate(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If within 7 days, show relative time
    if (diffDays <= 7) {
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else {
        return `${diffDays} days ago`;
      }
    }

    // Otherwise show full date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // The rest of your methods remain the same...
  getVisibleMenuItems(): MenuItem[] {
    const targetFile = this.selectedThreeDotsFile || this.contextMenuTarget || this.selectedFiles[0];
    const isMultiSelect = this.selectedNodeIds.size > 1;
    const isOwner = targetFile && this.loggedInEmail === targetFile.sharedByEmail;

    return this.menuItems.filter(item => {
      if (isMultiSelect && !item.isMultiSelect) return false;
      if (item.showForOwnerOnly && !isOwner) return false;
      return true;
    });
  }

  onMobileFileClick(event: MouseEvent, file: any): void {
    event.stopPropagation();
  }

  getHeaderMenuItems(): MenuItem[] {
    const isMultiSelect = this.selectedNodeIds.size > 1;
    const targetFile = this.selectedFiles[0];
    const isOwner = targetFile && this.loggedInEmail === targetFile.sharedByEmail;

    return this.menuItems.filter(item => {
      if (isMultiSelect && !item.isMultiSelect) return false;
      if (item.showForOwnerOnly && !isOwner) return false;
      return ['DOWNLOAD', 'COPY_LINK', 'REMOVE'].includes(item.key);
    });
  }

  updateMenuVisibility(): void {
    this.headerMenuItems = this.getHeaderMenuItems();
  }

  onRightClick(event: MouseEvent, file: any): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.isMobile()) {
      this.onThreeDotsClick(event, file);
      return;
    }

    this.contextMenuTarget = file;

    if (!this.selectedNodeIds.has(file.id)) {
      this.clearSelection();
      this.toggleSelection(file, { stopPropagation: () => { } });
    }

    this.updateMenuVisibility();

    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuVisible = true;
  }

  toggleSelection(file: any, event: any): void {
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }

    if (this.selectedNodeIds.has(file.id)) {
      this.selectedNodeIds.delete(file.id);
      this.selectedFiles = this.selectedFiles.filter(f => f.id !== file.id);
    } else {
      this.selectedNodeIds.add(file.id);
      this.selectedFiles.push(file);
    }
    this.updateMenuVisibility();
  }

  clearSelection(): void {
    this.selectedNodeIds.clear();
    this.selectedFiles = [];
    this.selectedMobileFile = null;
    this.showMobileOptions = false;
    this.contextMenuVisible = false;
    this.updateMenuVisibility();
  }

  selectAll(): void {
    this.selectedNodeIds.clear();
    this.selectedFiles = [];

    this.personFiles.forEach(file => {
      this.selectedNodeIds.add(file.id);
      this.selectedFiles.push(file);
    });

    this.updateMenuVisibility();
  }

  downloadFile(): void {
    this.contextMenuVisible = false;
    const file = this.selectedFiles[0] || this.selectedMobileFile;
    const permission = file?.permissionType || file?.shareAction;
    const permissionType = permission ?? file?.permissionType ?? null;

    if (!['CAN_EDIT', 'VIEW_DOWNLOAD'].includes(permissionType)) {
      this.alertService.show("You do not have permission to download.", DriveConfig.VARIANTS.DANGER);
      return;
    }

    if (this.selectedNodeIds.size > 1 && !this.isMobile()) {
      this.downloadMultipleFiles();
    } else if (this.selectedNodeIds.size === 1 || this.selectedMobileFile) {
      this.downloadSingleFile();
    } else {
      this.alertService.show("No files selected", DriveConfig.VARIANTS.DANGER);
    }
  }

  isMobile(): boolean {
    return window.innerWidth < 768;
  }

  selectedThreeDotsFile: any = null;

  private downloadMultipleFiles(): void {
    const selectedFiles = this.personFiles.filter(file => this.selectedNodeIds.has(file.id));
    const fileDetailIds = selectedFiles
      .filter(file => file.fileDetailId)
      .map(file => file.fileDetailId);

    if (fileDetailIds.length === 0) {
      this.alertService.show("No downloadable files selected", DriveConfig.VARIANTS.DANGER);
      return;
    }

    const json = JSON.stringify(fileDetailIds);
    const base64 = btoa(json);

    const downloadUrl = this.fileService.downloadMultipleFiles(base64);
    if (downloadUrl) {
      this.triggerDownload(downloadUrl);
      this.alertService.show(`Downloading ${fileDetailIds.length} files`, DriveConfig.VARIANTS.SUCCESS);
    } else {
      this.alertService.show("Download failed", DriveConfig.VARIANTS.DANGER);
    }

    this.selectedNodeIds.clear();
  }

  private downloadSingleFile(): void {
    const fileId = Array.from(this.selectedNodeIds)[0];
    const file = this.personFiles.find(f => f.id === fileId) || this.selectedMobileFile;

    if (!file?.fileDetailId) {
      this.alertService.show("File not available for download", DriveConfig.VARIANTS.DANGER);
      return;
    }

    let downloadUrl: string;
    if (file.isFolder) {
      downloadUrl = this.fileService.downloadFolder(file.fileDetailId);
    } else {
      downloadUrl = this.fileService.downloadFile(file.fileDetailId);
    }

    if (downloadUrl) {
      this.triggerDownload(downloadUrl);
      this.alertService.show("Download started", DriveConfig.VARIANTS.SUCCESS);
    } else {
      this.alertService.show("Download failed", DriveConfig.VARIANTS.DANGER);
    }

    this.clearSelection();
  }

  private triggerDownload(url: string): void {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.style.display = 'none';

    if (url.includes('downloadMultiple') || url.includes('downloadFolder')) {
      anchor.download = 'download.zip';
    }

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  copyLink(): void {
    if (this.selectedNodeIds.size === 0 && !this.selectedMobileFile) return;

    const ids = this.selectedMobileFile
      ? [this.selectedMobileFile.id]
      : Array.from(this.selectedNodeIds);

    this.fileService.getShareLinkByIds(ids, this.userId).subscribe((res: any) => {
      if (res && res.success) {
        const data = res.data;
        const shareLink = data?.length ? data[0].shareDetails.shareLink : null;
        if (!shareLink) {
          this.alertService.show("No shareable link available", DriveConfig.VARIANTS.WARNING);
          return;
        }

        navigator.clipboard.writeText(`${environment.web_url}/share/${btoa(shareLink)}`);
        this.alertService.show("Shareable link copied to clipboard!", DriveConfig.VARIANTS.SUCCESS);
      }
    });

    this.contextMenuVisible = false;
    this.showMobileOptions = false;
  }

  removeFile(target?: any): void {
    this.contextMenuVisible = false;
    this.showMobileOptions = false;

    let itemsToDelete: any[] = [];

    if (this.selectedMobileFile) {
      itemsToDelete = [this.selectedMobileFile];
    } else if (this.selectedNodeIds.size > 0) {
      itemsToDelete = this.personFiles.filter(file => this.selectedNodeIds.has(file.id));
    } else if (target) {
      itemsToDelete = [target];
    }

    if (itemsToDelete.length === 0) {
      this.alertService.show("No files selected", DriveConfig.VARIANTS.WARNING);
      return;
    }

    const confirmMessage = this.isMobile()
      ? `Remove access to "${itemsToDelete[0].fileName}"?`
      : `Remove access to ${itemsToDelete.length} item(s)?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    this.loading = true;
    let completed = 0;
    const totalItems = itemsToDelete.length;

    itemsToDelete.forEach(item => {
      this.fileService.removeRequest(item.shareDetailId, item.sharedToEmail)
        .subscribe({
          next: (res: any) => {
            completed++;

            if (res?.success) {
              this.personFiles = this.personFiles.filter(f => f.id !== item.id);
              this.selectedNodeIds.delete(item.id);
            }

            if (completed === totalItems) {
              this.loading = false;
              this.clearSelection();
              this.alertService.show(
                `${totalItems} access removed successfully`,
                DriveConfig.VARIANTS.SUCCESS
              );
            }
          },
          error: () => {
            this.loading = false;
            this.alertService.show("Failed to remove access", DriveConfig.VARIANTS.DANGER);
          }
        });
    });
  }

  executeMenuAction(menuItem: MenuItem): void {
    menuItem.action();
  }

  onThreeDotsClick(event: MouseEvent, file: any): void {
    event.stopPropagation();
    event.preventDefault();

    this.selectedThreeDotsFile = file;

    if (!this.selectedNodeIds.has(file.id)) {
      this.clearSelection();
      this.toggleSelection(file, { stopPropagation: () => { } });
    }

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    if (this.isMobile()) {
      this.contextMenuX = rect.left - 150 > 0 ? rect.left - 150 : 10;
      this.contextMenuY = rect.bottom + 8;
    } else {
      this.contextMenuX = rect.right - 200;
      this.contextMenuY = rect.bottom + 5;
    }

    this.contextMenuVisible = true;
    this.activeMenu = null;
    this.showMobileOptions = false;
  }

  makeFavorite(file: any): void {
    if (!file) return;

    const obj = {
      id: file.id,
      isFavorite: !file.isFavorite,
    };

    this.fileService.updateFavoriteStatus(obj).subscribe((res: any) => {
      if (res?.success) {
        file.isFavorite = !file.isFavorite;
        this.alertService.show(
          file.isFavorite ? "Added to favorites" : "Removed from favorites",
          DriveConfig.VARIANTS.SUCCESS
        );
      }
    });
  }

  getUserSharedFiles(userId: any, toEmail: any): void {
    this.loading = true;
    this.fileService.getUserSharedFiles(userId, toEmail).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.data && response.data.length > 0) {
          const firstFile = response.data[0];
          this.person = {
            firstName: firstFile.sharedByFirstName || "Unknown",
            lastName: firstFile.sharedByLastName || "",
            email: firstFile.sharedByEmail || firstFile.sharedToEmail || "",
            id: userId,
          };

          this.files = response.data.map((item: any) => {
            const baseColor = item.color || "#FBBF24";
            const darkColor = this.sharedService.darkenColor(baseColor, 20);

            return {
              isFolder: item.isfolder || item.isFolder || false,
              color: baseColor,
              darkenColor: darkColor,
              id: item.id,
              sharedToId: item.sharedToId,
              itemName: item.itemName,
              fileName: item.itemName,
              fileType: item.fileType,
              size: item.size,
              // Make sure dates are properly set
              sharedDate: item.sharedDate || item.createdDate || item.dateShared || item.modifiedDate,
              createdDate: item.createdDate || item.sharedDate || item.dateShared || item.modifiedDate,
              shareAction: item.shareAction,
              shareEveryone: item.shareEveryone,
              fileLocation: item.fileLocation,
              fileDetailId: item.fileDetailId,
              sharedDetailId: item.sharedDetailId,
              sharedById: item.sharedById,
              sharedByFirstName: item.sharedByFirstName,
              sharedByLastName: item.sharedByLastName,
              sharedByEmail: item.sharedByEmail,
              sharedToEmail: item.sharedToEmail,
              isFavorite: item.isFavorite || false,
              url: item.fileLocation,
              downloadUrl: item.fileLocation,
            };
          });

        } else {
          this.person = response.userDetails || response.user || {};
          this.files = response.files || response.fileDetails || [];
        }

        // Apply filter and sort immediately when data is loaded
        this.personFiles = [...this.files];
        this.applySorting();
      },
      error: (err: any) => {
        this.loading = false;
        this.alertService.show("Failed to load shared files", DriveConfig.VARIANTS.DANGER);
      },
    });
  }

  getIconForNode(node: any): string {
    return this.sharedService.getIconForNode(
      node?.fileType,
      node?.isFolder,
      node?.itemName
    );
  }

  goBackToPeople(): void {
    this.router.navigate(["/drive/people"]);
  }

  getFileCategory(fileName: string): string {
    if (!fileName) return "unknown";

    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext)) {
      return "images";
    } else if (
      ["mp4", "avi", "mov", "wmv", "flv", "mkv", "webm"].includes(ext)
    ) {
      return "videos";
    } else if (
      [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "txt",
        "csv",
      ].includes(ext)
    ) {
      return "documents";
    }
    return "all";
  }

  isAllSelected(): boolean {
    return (
      this.personFiles.length > 0 &&
      this.personFiles.every((file) => this.selectedNodeIds.has(file.id))
    );
  }

  formatSize(bytes: number): string {
    return this.sharedService.formatSize(bytes);
  }

  getColor(person: any): string {
    if (!person) return "bg-gray-400";
    const colors = ["bg-yellow-400"];
    const name = person.firstName || person.name || person.email || "";
    const charCode = name.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  }

  getAvatarColor(name: string): string {
    const colors = ["#FBBF24"];
    const charCode = name.charCodeAt(0);
    return colors[charCode % colors.length];
  }
}