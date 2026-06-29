import { CommonModule } from "@angular/common";
import { Component, EventEmitter, HostListener, ElementRef, Input, Output, ViewChild, } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AppStorageService } from "../../shared/service/app-storage.service";
import { FileService } from "../../shared/service/file.service";
import { SharedService } from "../../shared/shared.service";
import { SharedModule } from "../../shared/shared.module";
import { environment } from "../../../environments/environment";
import { AlertService } from "../../shared/alert-service/alert.service";
import { DriveConfig } from '../../shared/config/drive.config';
import { ElectronFileService } from "../../shared/service/electron.service";
import { MoveComponent } from "../../move/move.component"; 

interface MediaFile {
  id: string;
  file?: File;
  url: string;
  thumbnailUrl?: string;
  thumbnailFailed?: boolean;
  type?: string;
  uploadedAt: Date;
  itemName?: string;
  modifiedDate?: Date;
  isFolder?: boolean;
  fileType?: string;
  color?: string;
  darkenColor?: string;

}

@Component({
  selector: 'app-media',
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    SharedModule,
    MoveComponent // Add this
  ],
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.scss'],
})
export class MediaComponent {
  isModalOpen = false;
  @Input() showClose: boolean = false;
  @Output() media = new EventEmitter<any>();
  @ViewChild('sliderInput') sliderInput!: ElementRef<HTMLInputElement>;
  allFiles: any[] = [];
  dialogOpen: boolean = false; // Add this property
  activeTab: 'all' | 'photos' | 'videos' = 'all';
  groupBy: 'days' | 'months' | 'years' | 'Show file names' = 'days';
  showFileNames = false;
  thumbnailSize = 153;
  min = 75;
  max = 220;
  showDropdown = false;
  userId: any
  selectedIds = new Set<string>();
  noMoreData: boolean = false;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  searchQuery: string = "";
  filteredFolders: any[] = [];
  folders: any[] = [];
  private cachedGroupedFiles: { date: string; items: MediaFile[] }[] = [];
  private lastGroupBy: string = "";
  private lastFilesLength: number = 0;
  selectedFile: any;
  fileType: any = ["IMAGES", "VIDEOS"];
  size: number = 50;
  page: number = 0;
  allMediaFiles: any[] = [];
  @Input() loading: boolean = true;
  sharedDetails: any;
  sharedItemList: any[] = [];
  shareDialog: boolean = false;
  shareAction: any;
  copyDialogOpen: boolean = false;
  moveSourceNode: any;
  folderPath: any[] = [];
  currentFolderChildren: any;
  moveTargetFolder: any;
  isFolderLoading:boolean = false;
  folderMeta: { [id: string]: any } = {};
  folderId: any;
  loadingFolders:boolean = false;
  isLoadingMore = false;

  constructor(private fileService:FileService,private alertService: AlertService,private sharedService:SharedService,private electrionFileService: ElectronFileService){

  }

    ngOnInit() {
    this.userId = AppStorageService.getItem("userId");
    if (window.innerWidth <= 640) {
      this.min = 40
      this.max = 160
      this.thumbnailSize = 100
    }
  setTimeout(() => {
    this.updateTrack();
  }, 100);
    this.getAllFilesOnly();
  }

  ngAfterViewInit() {
    this.updateTrack();
  }

  getSelectedNodeIdsArray(): string[] {
    return Array.from(this.selectedIds);
  }

  handleAction(event: { target: any; mode: 'move' | 'copy'; success: boolean }) {    
    if (event.success) {
      this.page = 0;
      this.noMoreData = false;
      this.allFiles = [];
      this.getAllFilesOnly();
            this.selectedIds.clear();
      this.moveSourceNode = null;
    }
    
    this.closeBothDialogs();
  }

  closeBothDialogs() {
    this.dialogOpen = false;
    this.copyDialogOpen = false;
    this.moveTargetFolder = null;
    this.currentFolderChildren = [];
    this.folderPath = [];
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  @HostListener("document:click", ["$event"])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;

    if (!target.closest(".dropdown-wrapper")) {
      this.showDropdown = false;
    }
  }

  getAllFilesOnly() {
    this.isFolderLoading = true;
    const data = {
      userId: this.userId,
      page: this.page,
      size: 20,
      onlyFiles: true,
      fileType: this.fileType || ["IMAGES", "VIDEOS"],
    };

    this.fileService.getAllDriveItemsByUserId(data).subscribe(
      (res: any) => {
        this.isFolderLoading = false;
        const newFiles = res?.success ? res.data?.content || [] : [];

        if (newFiles.length < data.size) {
          this.noMoreData = true;
        }

        if (this.page === 0) {
          this.allFiles = newFiles;
        } else {
          this.allFiles = [...this.allFiles, ...newFiles];
        }

        this.regenerateGroupedFiles();
        this.isLoadingMore = false; 
      },
      (error: any) => {
        console.error("Error loading files:", error);
        this.isLoadingMore = false;
      }
    );
  }

  ontabChange(tab: 'all' | 'photos' | 'videos') {
    if (this.activeTab === tab) return;

    this.activeTab = tab;
    this.page = 0;
    this.noMoreData = false;
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = 0;
    }
    if (tab === 'all') {
      this.fileType = ["IMAGES", "VIDEOS"];
    } else if (tab === 'photos') {
      this.fileType = ["IMAGES"];
    } else if (tab === 'videos') {
      this.fileType = ["VIDEOS"];
    }

    this.allMediaFiles = [];
    this.getAllFilesOnly();
  }

  loadMore() {
    if (this.isLoadingMore || this.noMoreData) return;

    this.isLoadingMore = true;

    this.page += 1;
    this.fileType =
      this.activeTab === "photos"
        ? ["IMAGES"]
        : this.activeTab === "videos"
          ? ["VIDEOS"]
          : ["IMAGES", "VIDEOS"];

    this.getAllFilesOnly();
  }

  onScroll(event: any) {

    const element = event.target;
    const nearBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;

    if (nearBottom && !this.noMoreData && !this.isLoadingMore) {
      this.loadMore();
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }

  delete(fileId?: string) {
    this.isFolderLoading = true;
    const fileIds: string[] = [];

    if (fileId) {
      fileIds.push(fileId);
    } else if (this.selectedIds.size > 0) {
      fileIds.push(...Array.from(this.selectedIds));
    }

    if (fileIds.length === 0) {
      this.alertService.show(
        "Please select at least one file to delete",
        DriveConfig.VARIANTS.WARNING
      );
      return;
    }

    // 🔹 Single delete
    if (fileIds.length === 1) {
      this.fileService.deleteFolderOrFile(fileIds[0]).subscribe({
        next: (res: any) => {
          this.alertService.show(
            "Deleted successfully",
            DriveConfig.VARIANTS.SUCCESS
          );
          this.updateFilesAfterDelete(fileIds);
          this.selectedIds.clear();
        },
        error: (err: any) => {
          this.alertService.show("Failed to delete", DriveConfig.VARIANTS.DANGER);
        },
      });
      return;
    }

    // 🔹 Multiple delete
    this.fileService.deleteMultipleFiles(fileIds).subscribe({
      next: (res: any) => {
        this.alertService.show(
          "Deleted successfully",
          DriveConfig.VARIANTS.SUCCESS
        );
        this.updateFilesAfterDelete(fileIds);
        this.selectedIds.clear();
      },
      error: (err: any) => {
        this.isFolderLoading = false;
        this.alertService.show("Failed to delete", DriveConfig.VARIANTS.DANGER);
      },
    });
  }

  private updateFilesAfterDelete(deletedIds: string[]) {
    this.allFiles = this.allFiles.filter(f => !deletedIds.includes(f.id));
    this.regenerateGroupedFiles();
    if (this.selectedFile && deletedIds.includes(this.selectedFile.id)) {
      this.selectedFile = null;
      this.isModalOpen = false;
    }
      this.isFolderLoading = false;
  }


  private regenerateGroupedFiles() {
    this.lastGroupBy = this.groupBy;
    this.lastFilesLength = this.allFiles.length;
    this.cachedGroupedFiles = this.generateGroupedFiles();
  }

  updateTrack(event?: any) {

    setTimeout(() => {
      const percent = ((this.thumbnailSize - this.min) / (this.max - this.min)) * 100;

      let slider: HTMLElement | null = null;

      if (this.sliderInput && this.sliderInput.nativeElement) {
        slider = this.sliderInput.nativeElement;
      } else {
        slider = document.querySelector(".custom-slider") as HTMLElement;
      }

      if (slider) {
        slider.style.setProperty("--value", percent + "%");
        console.log('Updated slider track to:', percent + '%'); // Debug log
      } else {
        console.warn('Slider element not found');
      }
    }, 0);
  }

  share(node?: any, action: string = 'LINK_ACCESS'): void {
    const ids: string[] = node ? [node.id] : Array.from(this.selectedIds);

    if (ids.length === 0) {
      console.warn('No nodes selected to share');
      return;
    }

    this.sharedItemList = this.allFiles.filter(n => ids.includes(n.id));

    this.fileService.getShareLinkByIds(ids, this.userId).subscribe(
      (res: any) => {
        if (res && res.success) {
          this.sharedDetails = res.data;
          this.shareDialog = true;
          this.shareAction = action;
        } else {
          this.sharedDetails = null;
          console.error('Failed to get share links:', res);
        }
      },
      (error: any) => {
        this.sharedDetails = null;
        console.error('Error fetching share links:', error);
      }
    );
  }

  shareClose() {
    this.shareDialog = false;
    this.selectedIds.clear();
  }

  openCopyDialog(node: any = null) {
    this.copyDialogOpen = true;
    this.loadingFolders = true;

    this.moveSourceNode = node ?? (
      this.selectedIds.size === 1
        ? this.allFiles.find(f => f.id === Array.from(this.selectedIds)[0]) || null
        : null
    );

    this.folderPath = [];
    this.moveTargetFolder = null; // reset target

    this.fileService.loadChilderen(null, this.userId).subscribe(
      (res: any) => {
        this.loadingFolders = false;
        if (res?.success && Array.isArray(res.data)) {
          this.currentFolderChildren = res.data
            .filter((c: any) => c.isFolder && this.moveSourceNode?.id !== c.id)
            .map((f: any) => ({ ...f }))
            .sort((a: any, b: any) =>
              a.itemName.localeCompare(b.itemName, undefined, { sensitivity: 'base' })
            );
        } else {
          this.currentFolderChildren = [];
        }
      },
      (err) => {
        this.loadingFolders = false;
        console.error('Failed to load folders', err);
        this.currentFolderChildren = [];
      }
    );

  }


  // Convert API files to MediaFile format
  get groupedFiles() {
    // Only regenerate if groupBy changed or files length changed
    if (
      this.lastGroupBy !== this.groupBy ||
      this.lastFilesLength !== this.allFiles.length
    ) {
      this.regenerateGroupedFiles();
    }
    return this.cachedGroupedFiles;
  }

  private generateGroupedFiles(): { date: string; items: MediaFile[] }[] {
    // Map API files to MediaFile format
    const mediaFiles: MediaFile[] = this.allFiles.map((f: any) => {
      const fileUrl = `assets/icons/${this.getIconForNode(f)}`;
      const thumbnailUrl = `${environment.service_url}/file/thumbnail/${f.fileDetailId}?width=720&height=720`;
      const fileType = this.sharedService.getViewTypeFromUrl(f.itemName);
      return {
        id: f.id || f.itemId,
        url: fileUrl,
        thumbnailUrl: thumbnailUrl,

        fileDetailId: f.fileDetailId,
        type: fileType,
        uploadedAt: new Date(
          f.createdAt ||
          f.uploadedAt ||
          f.modifiedDate ||
          f.createdDate ||
          new Date()
        ),
        itemName: f.itemName || f.fileName || f.name || "Unknown",
        modifiedDate: f.modifiedDate ? new Date(f.modifiedDate) : new Date(),
        isFolder: f.isFolder || f.type === "folder" || false,
        fileType: f.fileType || f.mimeType || f.contentType,
        color: f.color,
        darkenColor: f.darkenColor,
      };
    });

    // If "Show file names" is selected, return all files without grouping
    if (this.groupBy === "Show file names") {
      this.showFileNames = true;
      return [{ date: "All Files", items: mediaFiles }];
    } else {
      this.showFileNames = false;
    }

    // Group files by date
    const groups: { date: string; items: MediaFile[] }[] = [];
    const sorted = [...mediaFiles].sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );

    sorted.forEach((file) => {
      let dateKey = "";
      if (this.groupBy === "days") {
        dateKey = file.uploadedAt.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } else if (this.groupBy === "months") {
        dateKey = file.uploadedAt.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      } else if (this.groupBy === "years") {
        dateKey = file.uploadedAt.getFullYear().toString();
      }

      let group = groups.find((g) => g.date === dateKey);
      if (!group) {
        group = { date: dateKey, items: [] };
        groups.push(group);
      }
      group.items.push(file);
      this.allMediaFiles = group.items;
    });

    return groups;
  }

  downloadFile(node?: any) {
    node = node ?? (
      this.selectedIds.size === 1
        ? this.allFiles.find(f => f.id === Array.from(this.selectedIds)[0]) || null
        : null
    );

    if (this.selectedIds.size > 1) {
      const fileIds = this.allFiles
        .filter(node => this.selectedIds.has(node.id))
        .map(node => node.fileDetailId);
      const json = JSON.stringify(fileIds);       // Convert array → JSON string
      const base64 = btoa(json);
      const downloadUrl = this.fileService.downloadMultipleFiles(base64);
      if (downloadUrl) {
        window.open(downloadUrl, "_blank");
      } else {
        console.error("Invalid download URL");
        this.alertService.show("Download failed", DriveConfig.VARIANTS.DANGER);
      }

      return;
    }

    if (!node) {
      this.alertService.show(
        "Please select a file to download",
        DriveConfig.VARIANTS.WARNING
      );
      return;
    }

    if (!node.fileDetailId) {
      this.alertService.show(
        "Invalid file, cannot download",
        DriveConfig.VARIANTS.DANGER
      );
      return;
    }

    if (node.isLocal) {
      this.electrionFileService.performFileAction(node.id, "DOWNLOAD").then(() => {
        this.alertService.show("Download started", DriveConfig.VARIANTS.SUCCESS);
      });
      return;
    }

    let downloadUrl;
    if (node.isFolder) {
      downloadUrl = this.fileService.downloadFolder(node.fileDetailId);
    } else {
      downloadUrl = this.fileService.downloadFile(node.fileDetailId);
    }

    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
      this.alertService.show("Download started", DriveConfig.VARIANTS.SUCCESS);
    } else {
      this.alertService.show("Download failed", DriveConfig.VARIANTS.DANGER);
    }
    this.selectedIds.clear();
  }

  isMobile(): boolean {
    return window.innerWidth < 640;
  }

  onSingleClick(event: MouseEvent, file: MediaFile) {
    if (!this.isMobile()) return;

    event.preventDefault();
    event.stopPropagation();

    this.selectedFile = file;
    this.isModalOpen = true;
  }

  onDoubleClick(event: MouseEvent, file: MediaFile) {
    event.preventDefault();
    event.stopPropagation();

    this.selectedFile = file;
    this.isModalOpen = true;
  }


  toggleSelected(file: any, event?: MouseEvent) {
    if (event) event.stopPropagation(); // prevent parent click events

    const id = file.id;
    if (!id) {
      console.warn("No ID found for file:", file);
      return;
    }

    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  isSelected(file: any): boolean {
    return this.selectedIds.has(file.id);
  }

  clearSelection() {
    this.selectedIds.clear();
    this.selectedFile = null;
  }


  selectGroupBy(value: "days" | "months" | "years" | "Show file names") {
    this.groupBy = value;
    this.showDropdown = false;
    this.regenerateGroupedFiles();
  }

  getIconForNode(node: any): string {
    return this.sharedService.getIconForNode(
      node.fileType,
      false,
      node.itemName
    );
  }

  onImageError(event: Event, node: any): void {
    const img = event.target as HTMLImageElement;
    img.src = node.url || "assets/icons/" + this.getIconForNode(node);
    node.thumbnailFailed = true;
  }

  decreaseSize() {
    if (this.thumbnailSize > this.min) {
      this.thumbnailSize = Math.max(this.min, this.thumbnailSize - 20);
      this.updateTrack();
    }
  }

  increaseSize() {
    if (this.thumbnailSize < this.max) {
      this.thumbnailSize = Math.min(this.max, this.thumbnailSize + 20);
      this.updateTrack();
    }
  }

  onSearchChange() {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredFolders = this.folders;
    } else {
      this.filteredFolders = this.folders.filter((folder) =>
        folder.itemName?.toLowerCase().includes(query)
      );
    }
  }
}
