import { Component, ElementRef, EventEmitter, HostListener, OnInit, Output, ViewChild } from '@angular/core';
import { FileService } from '../../shared/service/file.service';
import { AppStorageService } from '../../shared/service/app-storage.service';
import { SharedService } from '../../shared/shared.service';
import { AlertService } from '../../shared/alert-service/alert.service';
import { DriveConfig } from '../../shared/config/drive.config';
import { FileNode } from '../../model/drive-item';
import { ElectronFileService } from '../../shared/service/electron.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';


interface FileItem {
  itemName: string;
  size: number;
  fileType: string; // pdf, xls, etc.
  uploaded: string;
  modified: string;
  owner: string;
}

@Component({
  standalone: false,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  isLoading: boolean = false;
  folderClicked: any;


  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('folderInput') folderInput!: ElementRef<HTMLInputElement>;
  @ViewChild('menu') menuContainer!: ElementRef<HTMLElement>;
  @ViewChild('contextMenu') contextMenuRef!: ElementRef;
  @HostListener('document:click', ['$event'])
  @HostListener('document:touchstart', ['$event'])

  totalStorage = '5 GB'; // in GB
  usedStorage = '0 B'; // in GB
  userId: any;
  storageBreakdown = {
    documents: 0,
    videos: 0,
    images: 0,
    audio: 0,
    zip: 0,
    others: 0
  };
  dataOccupied: any = {
    documents: 0,
    videos: 0,
    images: 0,
    audio: 0,
    zip: 0,
    others: 0
  };

  isDialogOpen = false;
  folderName = '';
  selectedColor: string = '#FBBF24';
  isMenuOpen = false;
  totalSpaceBytes: number = 0;
  totalOccupiedBytes: number = 0;
  freePercentage: number = 0;
  usedPercentage: number = 0;
  colors: string[] = DriveConfig.FOLDER_COLORS;
  contextMenuVisible: boolean = false;
  contextMenuTarget: any;
  contextMenuX: number = 0;
  contextMenuY: number = 0;
  parentId: any;
  folderCreated: any;
  isModalOpen: any;
  selectedFile: any;
  sharedItemList: any;
  selectedNodeIds: any;
  sharedDetails: any;
  shareDialog: boolean = false;
  menuNode: any;
  headerHeightPx = 490;
  pageSize = 20;
  currentPage = 0;
  isLoadingMore = false;
  hasMoreData = true;
  fileType: string = '';
  userName: string = '';
  totalElemnts:number = 0
  constructor(private fileService: FileService, private sharedService: SharedService, private alertService: AlertService, private ellRef: ElementRef, private electrionFileService: ElectronFileService,
    private router: Router, private elRef: ElementRef
  ) {
    this.userId = AppStorageService.getItem("userId");
    this.getTotalOccupiedSpace();
     this.userName = AppStorageService.getItem('userName') || '';
  this.getRecentFiles();
  }
   goAllRecent(): void {
    this.router.navigate(['/drive/recent']);
  }

  recentFiles: FileItem[] = [];
  @Output() favoriteToggled = new EventEmitter<FileNode>();
  allFiles: any = [];

  ngOnInit() {
      //  if(window.innerWidth <= 640) {
      //     this.headerHeightPx = 590
      //   }
      
    this.getAllFilesOnly();
  }

  onFileViewScrolled(scrolled: boolean) {
 
    if (this.isLoadingMore || !this.hasMoreData) return;
    this.isLoadingMore = true;
    this.currentPage++;
    this.loadMoreFiles(this.currentPage);
  }

  loadMoreFiles(page: number) {
    let data = {
      userId: this.userId,
      page: page,
      size: this.pageSize,
      onlyFiles: true,
      fileType: this.fileType ? [this.fileType] : []
    };

    this.fileService.getAllDriveItemsByUserId(data)
      .subscribe((res: any) => {
        const newFiles = res?.success ? res.data?.content || [] : [];

        if (newFiles.length > 0) {
          this.allFiles = [...this.allFiles, ...newFiles];
          this.hasMoreData = newFiles.length === this.pageSize;
        } else {
          this.hasMoreData = false;
        }
        this.isLoadingMore = false;
      }, (error: any) => {
        console.error('❌ Error loading more files:', error);
        this.isLoadingMore = false;
      });
  }

  selectedFileType(type: any) {
    this.fileType = type;
    this.currentPage = 0;
    this.hasMoreData = true;
    this.allFiles = [];
    this.getAllFilesOnly();
  }

  getRecentFiles() {
    let data = {
      userId: this.userId,
      page: 0,
      size: 4,
      desc: true,
      onlyFiles: true,
      isRecent: true
    };
    this.fileService.getAllDriveItemsByUserId(data)
      .subscribe((res: any) => {
          this.recentFiles = res?.success ? res.data?.content || [] : [];
        this.totalElemnts = res?.success ? res.data?.totalElements || 0 : 0;

        if (!this.totalElemnts) {
          this.headerHeightPx = this.sharedService.isMobile() ? 210 : 390;
        } else {
          this.headerHeightPx = this.sharedService.isMobile() ? 425 : 510;
        }


      }, (error: any) => {
        this.headerHeightPx = this.sharedService.isMobile() ? 210 : 390;     
        console.error('Error loading files:', error);
      });
  }

    getTargetIds(path: string): string[] {
    return path.split('/').filter(Boolean);
  }
    openLocation(node: any) {
    if (!node?.parentId) return;

    this.fileService.getFolderPath(node?.id).subscribe((res: string) => {
      const ids = this.getTargetIds(res);
      let url = '/drive/my-files';

      if (ids.length > 2) {
        const intermediateIds = ids.slice(1, ids.length - 1);
         const encoded = btoa(intermediateIds.join("/"));
      url += "/" + encoded;
      }
      this.router.navigateByUrl(url);
    });
  }
  onDoubleClick(node: any) {
    const data = {
      id: node?.id,
      lastViewedAt: new Date().toISOString()
    };
    this.fileService.updateLastView(data).subscribe((res: any) => {
    });
    if (!node.size) {
      this.fileService
        .getStorageUsage(node.userId, node.fileDetailId)
        .subscribe({
          next: (res: any) => {
            node.size = res?.data?.occupiedSpace;
          },
          error: (err) => console.error(err),
        });
    }

    this.contextMenuVisible = false;
    if (node.isFolder) {
      this.handleClickOutside;
      this.folderClicked.emit(node);
      return;
    }
    if (node.isLocal && node.syncStatus == 'AVAILABLE_ONLINE_ONLY') {
      this.electrionFileService.performFileAction(node.id, 'DOWNLOAD').then(() => {
      })
      return;
    }
    if (!node.fileDetailId) return;
    this.selectedFile = node;
    // Once Drive move to live need to chnage Endpoint
    this.isModalOpen = true;
  }
  
  handleClickOutside = (event: MouseEvent) => {
    if (!this.ellRef?.nativeElement.contains(event.target)) {
    }
  };

  closeModal() {
    this.isModalOpen = false;
    this.shareDialog = false;
  }
  share(node: FileNode | null): void {
    const ids = [node?.id];
    this.sharedItemList = node;
    this.fileService.getShareLinkByIds(ids, this.userId).subscribe((res: any) => {

      if (res && res.success) {
        this.sharedDetails = res.data;
        this.shareDialog = true;
        this.contextMenuVisible = false;
        this.menuNode = null;
      } else {
        this.sharedDetails = [];
      }


    });
  }

  getAllFilesOnly() {
    let data = {
      userId: this.userId,
      page: 0,
      size: this.pageSize,
      onlyFiles: true,
      fileType: this.fileType ? [this.fileType] : []
    };
    this.isLoading = true;
    this.fileService.getAllDriveItemsByUserId(data)
      .subscribe((res: any) => {
        this.allFiles = res?.success ? res.data?.content || [] : [];
        this.isLoading = false;
        this.hasMoreData = this.allFiles.length === this.pageSize;
        
      }, (error: any) => {
        console.error('❌ Error loading files:', error);
        this.isLoading = false;
      });
  }

  copyLink(node: FileNode | null): void {
    const ids = [node?.id];
    this.sharedItemList = node?.id
    this.fileService.getShareLinkByIds(ids, this.userId).subscribe((res: any) => {
      if (res && res.success) {
        const data = res.data;
        const shareLink = data?.length ? data[0].shareDetails.shareLink : null;
        if (!shareLink) return;
        navigator.clipboard.writeText(`${environment.web_url}/share/${encodeURIComponent(shareLink)}`);
        this.alertService.show("Shareable link copied to clipboard!", DriveConfig.VARIANTS.SUCCESS);

      } else {

      }
      this.contextMenuVisible = false;
    });
  }
  makeFavorite(target: any) {
    this.contextMenuVisible = false;
    let obj = {
      id: target.id,
      isFavorite: !target.isFavorite,
    };
    this.fileService.updateFavoriteStatus(obj).subscribe((res: any) => {
      if (res && res.success) {
        target.isFavorite = !target.isFavorite;
        this.favoriteToggled.emit(target); // 🔔 Notify parent component
      }
    });
  }

  getTotalOccupiedSpace() {
    this.fileService.getStorageUsage(this.userId).subscribe((res: any) => {
      const data = res.data;
      if (data) {
        this.usedStorage = this.sharedService.formatSize(data.occupiedSpace);
        this.totalStorage = this.sharedService.formatSize(data.totalSpace);
        this.totalSpaceBytes = data.totalSpace;

        // Real percentage
        const realUsedPercentage = (data.occupiedSpace / data.totalSpace) * 100;

        // Apply minimum 50% rule for display
        this.usedPercentage = realUsedPercentage < 50 ? 50 : realUsedPercentage;
        this.freePercentage = 100 - this.usedPercentage;
        this.getOccupiedsizes();
      }
    }, (err) => {
      console.error("Error fetching storage usage:", err);
    });
  }

  getOccupiedsizes() {
    this.fileService.getOccupiedSizes(this.userId).subscribe((res: any) => {
      const data = res.data;
      if (data) {
        this.dataOccupied = {
          documents: data.DOCUMENTS,
          videos: data.VIDEOS,
          images: data.IMAGES,
          audio: data.AUDIOS,
          zip: data.ZIP,
          others: data.OTHERS || 0,
        };

        this.totalOccupiedBytes =
          data.DOCUMENTS + data.VIDEOS + data.IMAGES + data.AUDIOS + data.ZIP + (data.OTHERS || 0);

        const realUsedPercentage =
          (this.totalOccupiedBytes / this.totalSpaceBytes) * 100;

        if (realUsedPercentage < 50) {
          this.usedPercentage = 50;
          this.freePercentage = 50;
        } else {
          this.usedPercentage = realUsedPercentage;
          this.freePercentage = 100 - this.usedPercentage;
        }

        // Calculate all except the last one
        const documentsPercent = (data.DOCUMENTS / this.totalOccupiedBytes) * 100;
        const videosPercent = (data.VIDEOS / this.totalOccupiedBytes) * 100;
        const imagesPercent = (data.IMAGES / this.totalOccupiedBytes) * 100;
        const audioPercent = (data.AUDIOS / this.totalOccupiedBytes) * 100;
        const zipPercent = (data.ZIP / this.totalOccupiedBytes) * 100;

        // Others will take the remainder to sum exactly to usedPercentage
        const sumSoFar = documentsPercent + videosPercent + imagesPercent + audioPercent + zipPercent;
        const othersPercent = this.usedPercentage - sumSoFar;

        this.storageBreakdown = {
          documents: documentsPercent,
          videos: videosPercent,
          images: imagesPercent,
          audio: audioPercent,
          zip: zipPercent,
          others: othersPercent >= 0 ? othersPercent : 0,
        };

      }
    });
  }

  getStoragePercentage(size: number, totalSize: number): number {
    return (size / totalSize) * 100;
  }


  getIconForNode(node: any): string {
    return this.sharedService.getIconForNode(
      node.fileType,
      false,
      node.itemName
    );
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  closeMenu(event: MouseEvent | TouchEvent) {
    const target = event.target as HTMLElement;
    if (
      this.menuContainer &&
      !this.menuContainer.nativeElement.contains(target)
    ) {
      this.isMenuOpen = false;
    }

    if (this.contextMenuRef && !this.contextMenuRef.nativeElement.contains(target)) {
      this.contextMenuVisible = false;
    }
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

    input.addEventListener(
      "change",
      () => {
        document.body.removeChild(input);
      },
      { once: true }
    );
  }

  async handleFileSelection(target: any, event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);

    try {
      const response = await this.fileService.uploadFileList(
        files,
        '',
        '',
        [],
        this.userId
      );
    } catch (err) {
      console.error("Upload failed", err);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      alert(`File selected: ${input.files[0].name}`);
    }
  }

  async onFolderSelected(data: any) {
   if (data.type === "FILE") {
      try {        
        const response = await this.fileService.uploadFileList(
          data.record,
          data.parentId,
          "",
          data.emptyFolders,
          this.userId
        );
        // this.refreshFileList();
        // this.mainLayout?.loadStorageUsage();
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
  }

  onFolderDeleted(data: any) {
    if (!data) return;
    this.isLoading = true;
    let fileIds: string[] = [];
   
    if (Array.isArray(data)) {
      fileIds = data;
    } else if (data.record) {
      const files = Array.isArray(data.record) ? data.record : [data.record];
      fileIds = files.map((file: any) => file.id);
    } else if (data.id) {
      fileIds = [data.id];
    } else if (Array.isArray(data.ids)) {
      fileIds = data.ids;
    }

    if (fileIds.length === 0) {
      this.isLoading = false;
      return;
    }

    // Choose correct API
    const delete$ = fileIds.length === 1
      ? this.fileService.deleteFolderOrFile(fileIds[0])
      : this.fileService.deleteMultipleFiles(fileIds);

    delete$.subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res?.success) {
          //  DELETE USING SPLICE METHOD
          if (fileIds.length === 1) {
            // Single file deletion
            const index = this.allFiles.findIndex((f: any) => f.id === fileIds[0]);
            if (index !== -1) {
              this.allFiles.splice(index, 1);
            }
          } else {
            // Multiple file deletion
            // Find all indexes that need to be removed
            const indexesToRemove = fileIds
              .map(id => this.allFiles.findIndex((f: any) => f.id === id))
              .filter(i => i !== -1)
              .sort((a, b) => b - a);

            indexesToRemove.forEach(i => this.allFiles.splice(i, 1));
          }
          this.allFiles = [...this.allFiles];
          this.alertService.show(
            `${fileIds.length} item${fileIds.length > 1 ? 's' : ''} deleted successfully`,
            DriveConfig.VARIANTS.SUCCESS
          );
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  openDialog() {
    this.isDialogOpen = true;
  }
  showPanel(event: MouseEvent, file: any) {
    if (this.sharedService.handleMobileMenuCheck(event)) {
      return; // element not found, already prevented
    }
    const h1 = 200;

    const hostElement = this.elRef?.nativeElement as HTMLElement;
    const { x, y } = this.sharedService.calculateMenuPosition(
      event,
      hostElement,
      h1
    );

    this.contextMenuTarget = file;
    this.contextMenuX = x;
    this.contextMenuY = y;
    this.contextMenuVisible = true;
  }

  closeDialog() {
    this.isDialogOpen = false;
  }

  onFolderMoved(folder: any) {
    if (!folder?.movedNodeId || !folder?.targetNodeId) return;

    const movedIds = Array.isArray(folder.movedNodeId)
      ? folder.movedNodeId
      : [folder.movedNodeId];

    const isMultiple = movedIds.length > 1;
    const moveApi = isMultiple
      ? this.fileService.multipleMoveFolderOrFile(movedIds, folder.targetNodeId, this.userId)
      : this.fileService.moveFileOrFolder(movedIds[0], folder.targetNodeId, this.userId);

    moveApi.subscribe({
      next: (res: any) => {
        this.alertService.show(
          isMultiple ? "Items moved successfully" : "Item moved successfully",
          DriveConfig.VARIANTS.SUCCESS
        );
      },
      error: (err) => {
        console.error("❌ Move Error:", err);

        this.alertService.show(
          isMultiple ? "Failed to move items" : "Failed to move item",
          DriveConfig.VARIANTS.DANGER
        );
      }
    });
  }

  selectColor(color: string) {
    this.selectedColor = color;
  }

  createFolder() {
    if (!this.folderName) return this.alertService.show('Folder name is required.', DriveConfig.VARIANTS.WARNING);
    const obj = {
      userId: AppStorageService.getItem("userId"),
      itemName: this.folderName,
      isFolder: true,
      parentId: null,
      color: this.selectedColor || '#FBBF24'
    }
    this.fileService.createOrUpdateFileAndFolder(obj).subscribe((res: any) => {
      if (res.success) {
        this.alertService.show('Folder created successfully!', DriveConfig.VARIANTS.SUCCESS);
        this.folderName = '';
        this.selectedColor = '#FBBF24';
        this.closeDialog();
        this.getAllFilesOnly();
      } else {
        this.alertService.show(res.message || 'Error creating folder.', DriveConfig.VARIANTS.DANGER);
      }
    }, (err: any) => {
      if (err.status === 409) {
        this.alertService.show('Folder already exists. Please use a different name.', DriveConfig.VARIANTS.WARNING);
      } else {
        this.alertService.show(err?.error?.errorMessage || 'Error creating folder.', DriveConfig.VARIANTS.DANGER);
      }
    }
    );
  }

  formatSize(sizeInBytes: number): string {
    return this.sharedService.formatSize(sizeInBytes);
  }

  removeFromRecentFile(recentFile: any): void {
    if (!recentFile?.id) return;

    this.fileService.removeRecent(recentFile?.id).subscribe({
      next: (res: any) => {
        this.getRecentFiles();
        this.contextMenuVisible = false;
      },
      error: (err) => {
        console.error('Error updating recent file:', err);
      }
    });
  }

}
