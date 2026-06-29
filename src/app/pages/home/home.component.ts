import { ChangeDetectorRef, Component, Optional, SkipSelf, ViewChild } from "@angular/core";
import { FileService } from "../../shared/service/file.service";
import { ActivatedRoute, Router } from "@angular/router";
import { Location } from "@angular/common";
import { NgZone } from "@angular/core";
import { AppStorageService } from "../../shared/service/app-storage.service";
import { MainLayoutComponent } from "../../layouts/main-layout/main-layout.component";
import { ElectronFileService } from "../../shared/service/electron.service";
import { SharedService } from "../../shared/shared.service";
import { FsEventService } from "../../shared/service/fs-event.service";
import { filter } from "rxjs";
import { environment } from "../../../environments/environment";
import { FileViewComponent } from "../file-view/file-view.component";
import { AlertService } from "../../shared/alert-service/alert.service";
import { DriveConfig } from "../../shared/config/drive.config";
import { ViewportService } from "../../shared/service/viewport.service";
@Component({
  standalone: false,
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.scss",
})
export class HomeComponent {
  breadcrums: { name: string; id: string | null, isLocal: boolean }[] = [
    { name: "My files", id: null, isLocal: false },
  ];
  folders: any[] = [];
  folderCache: { [key: string]: any[] } = {};
  folderMeta: { [id: string]: any } = {}; // Stores single folder metadata
  private ignoreNextParamChange = false;
  searchQuery: string = "";
  filteredFolders: any[] = [];
  selectedFolderId: any = null;
  userId: any;
  isElectron: boolean = false;
  @ViewChild('fileViewComp') fileViewComp!: FileViewComponent;
  isLoading: boolean = false;
  isMoving: boolean = false;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fileService: FileService,
    private location: Location,
    private ngZone: NgZone,
    private electronService: ElectronFileService,
    private sharedService: SharedService,
    private fsEventSvc: FsEventService,
    private alertService: AlertService,
    private viewportService: ViewportService,
    @Optional() @SkipSelf() private mainLayout: MainLayoutComponent,
    private cdr: ChangeDetectorRef
  ) {
    this.userId = AppStorageService.getItem("userId");
    this.isElectron = this.sharedService.isElectron();

  }

  async ngOnInit(): Promise<void> {
  this.isElectron = this.sharedService.isElectron();
    this.fsEventSvc.events$
      .pipe(filter(e => e !== null))
      .subscribe(e => {
        if (!!e) {
          this.loadFolders(this.selectedFolderId);
        }
        // trigger any UI refresh logic here, e.g., refresh file tree
      });
    this.route.paramMap.subscribe(async (params) => {
      if (this.ignoreNextParamChange) {
        this.ignoreNextParamChange = false; // reset flag
        return; // ignore this param change triggered by updateRoute
      }


      const encoded = params.get("rootPath");
      if (encoded) {
        const decoded = atob(encoded);
        const idSegments = decoded.split("/");
        await this.rebuildBreadcrumbsByIds(idSegments);
      } else {
        this.resetToRoot();
      }
      this.filteredFolders = this.folders;
    });
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

  resetToRoot() {
    this.breadcrums = [{ name: "My files", id: null, isLocal: false }];
    this.loadFolders(null);
  }

  async rebuildBreadcrumbsByIds(ids: string[]) {
    const tempCrumbs = [{ name: "Home", id: null, isLocal: false }];
    let currentParentId: string | null = null;

    for (const id of ids) {
      const key = currentParentId ?? "";

      // Use cached children or load them
      let children: any = this.folderCache[key];
      if (!children) {
        const res: any = await this.fileService
          .loadChilderen(currentParentId, this.userId)
          .toPromise();
        if (!res?.success) return;
        children = res.data;
        this.folderCache[key] = children;
      }

      // Find current folder in children
      const currentFolder = children.find((f: any) => f.id === id);
      if (!currentFolder) return;

      // Store metadata separately
      this.folderMeta[currentFolder.id] = currentFolder;

      tempCrumbs.push({ name: currentFolder.itemName, id: currentFolder.id, isLocal: currentFolder.isLocal });
      currentParentId = currentFolder.id;
    }

    this.breadcrums = tempCrumbs;

    const lastId = ids[ids.length - 1] ?? null;
    this.loadFolders(lastId);
  }


  loadFolders(parentId: string | null): void {
    console.log('called');

    this.isLoading = true;
    const key = parentId ?? "";
    this.fileService.loadChilderen(parentId, this.userId)
      .subscribe((res: any) => {
        const cloudData = res?.success ? res.data || [] : [];
        if (this.isElectron) {
        cloudData.forEach((x: any) => {
          
            x.isLocal = true;
          });
        }
          console.log('API response', cloudData);

        if (key === "") {

          this.folderCache[key] = cloudData;
          this.folders = cloudData;
          this.filteredFolders = cloudData;
        } else {
          // Just cloud
          this.folderCache[key] = cloudData;
          this.folders = cloudData;
          this.filteredFolders = cloudData;
        }
        this.isLoading = false;
      }, (error) => {
        console.error("🌩️ Cloud fetch failed:", error);
        this.folderCache[key] = [];
        this.folders = [];
        this.filteredFolders = [];
        this.isLoading = false;
      });
  }

  loadLocalChildren(parentId: string | null): void {
    const key = parentId ?? "";
    this.electronService.getChildrenByParentId(parentId)
      .then((data) => {
        data = data || [];
        data.forEach(x => x.isLocal = true);

        if (key === "") {
          // Combine with cloud if already loaded
          const cloud = this.folderCache[key] || [];
          const cloudIds = new Set(cloud.map(x => x.id));
          const combined = data
          //  [
          //   ...data,
          //   ...cloud.filter(x => !cloudIds.has(x.id))
          // ];

          this.folderCache[key] = combined;
          this.folders = combined;
          this.filteredFolders = combined;
        } else {
          // Only local
          this.folderCache[key] = data;
          this.folders = data;
          this.filteredFolders = data;
        }

      })
      .catch((err) => {
        console.error("🖥️ Local load failed:", err);
        this.folderCache[key] = [];
        this.folders = [];
        this.filteredFolders = [];
      });
  }


  onFolderClick(folder: any) {
    const index = this.breadcrums.findIndex((b) => b.id === folder.id);

    if (index >= 0) {
      // Folder already in breadcrumbs — trim to that level
      this.breadcrums = this.breadcrums.slice(0, index + 1);
    } else {
      // Folder not in breadcrumbs — add new entry
      this.breadcrums.push({ name: folder.itemName, id: folder.id, isLocal: folder.isLocal });
    }
    this.selectedFolderId = folder?.id || null;
    this.folderMeta[folder.id] = folder;
    this.searchQuery = "";
    if (!folder) return;
    this.loadFolders(folder.id);
    this.updateRoute();
  }

  updateRoute() {
    const pathIds = this.breadcrums.slice(1).map((b) => b.id);
    let url = "/drive/my-files";

    if (pathIds.length > 0) {
      console.log('pathIds.join("/")', pathIds.join("/"))
      const encoded = btoa(pathIds.join("/"));
      url += "/" + encoded;
    }

    this.ngZone.runOutsideAngular(() => {
      this.location.replaceState(url);
    });
  }

  onFolderCreated(folder: any) {
    const id = String(folder.id);

    const newParentId = this.getCurrentFolderId() ?? "";

    // Remove from all old parents
    Object.keys(this.folderCache).forEach(key => {
      this.folderCache[key] = (this.folderCache[key] || [])
        .filter(f => String(f.id) !== id);
    });

    // Add to current folder
    if (!this.folderCache[newParentId]) {
      this.folderCache[newParentId] = [];
    }

    this.folderCache[newParentId].push(folder);

    this.refreshCurrentFileView();
  }


  private refreshCurrentFileView() {
    const current = this.getCurrentFolderId() ?? "";
    const cached = this.folderCache[current] || [];
    this.filteredFolders = [...cached];
    this.cdr.detectChanges();
  }

  async createFolder(data: any) {
    this.onFolderCreated(data);
    // let parentFileDetailId = data.parentId
    //   ? this.folderMeta[data.parentId]?.fileDetailId
    //   : "";
    // if (["EDIT", "NEW"].includes(data.type)) {
    //   let record = data.record;
    //   record.parentFolderId = parentFileDetailId;
    //   this.fileService
    //     .createOrUpdateFileAndFolder(record)
    //     .subscribe((res: any) => {
    //       if (res?.success && res.data) {
    //         this.alertService.show('Folder created successfully!', DriveConfig.VARIANTS.SUCCESS);
    //         this.onFolderCreated(res.data);
    //         this.refreshFileList();
    //         this.mainLayout?.loadStorageUsage();
    //         this.fileViewComp?.closeDialog();
    //       }
    //     }, (err: any) => {
    //       if (err.status === 409) {
    //         this.alertService.show('Folder already exists. Please use a different name.', DriveConfig.VARIANTS.WARNING);
    //       } else {
    //         this.alertService.show(err?.error?.errorMessage || 'Error creating folder.', DriveConfig.VARIANTS.DANGER);
    //       }
    //     });
    // } else if (data.type === "FILE") {
    //   try {
    //     const response = await this.fileService.uploadFileList(
    //       data.record,
    //       data.parentId,
    //       parentFileDetailId,
    //       data.emptyFolders
    //     );
    //     this.refreshFileList();
    //     this.mainLayout?.loadStorageUsage();
    //   } catch (err) {
    //     console.error("Upload failed", err);
    //   }
    // }
  }

  refreshFileList() {
    let parentId = this.getCurrentFolderId();
    this.loadFolders(parentId);
  }

  onFolderDeleted(data: any) {
    this.isLoading = true;
    if (!data) return;

    // Extract IDs from the data
    let fileIds: string[] = [];

    if (Array.isArray(data)) {
      // If data is already an array of IDs
      fileIds = data;
    } else if (data.record) {
      // If data contains record objects, extract their IDs
      const files = data.record;
      const fileArray = Array.isArray(files) ? files : [files];
      fileIds = fileArray.map(file => file.id);
    } else if (data.id) {
      // If data is a single object with id
      fileIds = [data.id];
    } else if (Array.isArray(data.ids)) {
      // If data contains an array of IDs directly
      fileIds = data.ids;
    }

    if (fileIds.length === 0) return;

    if (fileIds.length === 1) {
      // Single file deletion
      this.fileService.deleteFolderOrFile(fileIds[0]).subscribe((res: any) => {
        this.isLoading = false;
        if (res?.success) {
          this.folders = this.folders.filter(f => f.id !== fileIds[0]);
          if (this.folderCache[this.selectedFolderId]) {
            this.folderCache[this.selectedFolderId] = this.folderCache[this.selectedFolderId].filter(f => f.id !== fileIds[0]);
          }
          delete this.folderMeta[fileIds[0]];
          this.onSearchChange();
        }
      });
    } else {
      // Multiple files deletion - use batch API
      this.fileService.deleteMultipleFiles(fileIds).subscribe((res: any) => {
        this.isLoading = false;
        if (res?.success) {
          // Remove all deleted files from UI
          this.folders = this.folders.filter(f => !fileIds.includes(f.id));

          // Update folder cache
          if (this.folderCache[this.selectedFolderId]) {
            this.folderCache[this.selectedFolderId] = this.folderCache[this.selectedFolderId]
              .filter(f => !fileIds.includes(f.id));
          }

          // Remove from folder meta
          fileIds.forEach(id => delete this.folderMeta[id]);

          this.onSearchChange();

          // Show success message
          this.alertService.show(
            `${fileIds.length} items deleted successfully`,
            DriveConfig.VARIANTS.SUCCESS
          );
        }
      });
    }
  }

  onFolderRenamed(folder: any) {
    if (!folder) return;

    if (this.isElectron) {
      this.electronService.renameItemById(folder.id, folder.newName)
        .then(() => this.refreshFileList())
        .catch(err => console.error("🖥️ Local rename failed:", err));
    } else {
      this.fileService.updateFileName(folder).subscribe((res: any) => {
        if (res?.success && res.data) {
          this.updateRenamedFolder(res.data);
        }
      });
    }
  }

  private updateRenamedFolder(updatedFolder: any) {
    const id = updatedFolder.id;

    const normalized = {
      ...updatedFolder,
      name: updatedFolder.itemName
    };

    Object.keys(this.folderCache).forEach(key => {
      this.folderCache[key] = this.folderCache[key].map(f => {
        if (String(f.id) === String(id)) {
          return { ...f, itemName: normalized.itemName };
        }
        return f;
      });
    });

    this.filteredFolders = this.filteredFolders.map(f => {
      if (String(f.id) === String(id)) {
        return { ...f, itemName: normalized.itemName };
      }
      return f;
    });

    this.cdr.detectChanges();
  }

  getCurrentFolderId(): string | null {
    return this.breadcrums[this.breadcrums.length - 1]?.id ?? "";
  }

  getCurrentFolder(): any {
    let id = this.getCurrentFolderId();
    if (!id) return null;
    return this.folderMeta[id] || null;
  }

  onFolderMoved(folder: any) {
    const movedIds = Array.isArray(folder) ? folder : [folder];

    this.filteredFolders = this.filteredFolders
      .filter((item: any) => !movedIds.includes(item.id));
  }

  OnFolderCopied(folder: any) {
    this.refreshCurrentFolder();
  }

  refreshCurrentFolder(data?: any) {
    const parentId = this.getCurrentFolderId();
    this.loadFolders(parentId);
  }
}
