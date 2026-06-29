import { Component, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppStorageService } from '../../shared/service/app-storage.service';
import { FileService } from '../../shared/service/file.service';
import { Location } from "@angular/common";
import { NetworkService } from '../../services/network.service';
import { ElectronFileService } from '../../shared/service/electron.service';
import { SharedService } from '../../shared/shared.service';

@Component({
  standalone: false,
  selector: 'app-shared-file',
  templateUrl: './shared-file.component.html',
  styleUrl: './shared-file.component.scss'
})
export class SharedFileComponent {

  breadcrums: any = [];
  tabs = [
    { label: 'With You' },
    { label: 'By You' }
  ];
  selectedTab = 0;
  folders: any[] = [];
  folderCache: { [key: string]: any[] } = {};
  folderMeta: { [id: string]: any } = {}; // Stores single folder metadata
  private ignoreNextParamChange = false;
  type: any = "SHARED";
  action: any = 'SHARED_WITH_YOU'
  userId: any;
  isElectron: boolean = false;
  searchQuery: string = "";
  filteredFolders: any[] = [];
  sharedWithMe: boolean = false; // true for "With You", false for "By You"
  online: boolean = true;
  access: 'CAN_VIEW' | 'CAN_EDIT' | 'VIEW_DOWNLOAD' | 'CANT_DOWNLOAD' | null = null;
  isLoading: boolean = false;
  email: any;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fileService: FileService,
    private location: Location,
    private ngZone: NgZone,
    private networkService: NetworkService,
    private electronFileService: ElectronFileService,
    private shared: SharedService

  ) {
    this.userId = AppStorageService.getItem("userId");
    this.breadcrums = [
      // { name: 'Home' },
      { name: 'Shared', id: null, userId: this.userId }
    ];
    this.email = AppStorageService.getItem("email");
    this.isElectron = this.shared.isElectron();
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((query) => {
      if (query.get("type")) {
        this.action = query.get("type");
        this.sharedWithMe = this.action === 'SHARED_BY_YOU';
        this.selectedTab = this.sharedWithMe ? 1 : 0;
      }
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
        this.loadShared(null);
      }
      this.filteredFolders = this.folders;
    });
    this.networkService.online$.subscribe((status) => {
      this.online = status;
    });
  }
  selectTab(index: number) {
    if (this.selectedTab === index) return;
    this.access = null;
    this.selectedTab = index;
    this.sharedWithMe = index !== 0; // true for "With You", false for "By You"
    this.folderCache = {}; // Clear cache to avoid mixing data
    this.folderMeta = {};
    this.folders = [];
    this.filteredFolders = [];
    this.action = this.sharedWithMe ? 'SHARED_BY_YOU' : 'SHARED_WITH_YOU'
    this.loadShared(null);
    this.searchQuery = "";
    this.onFolderClick({ name: 'shared', id: null });
    // this.resetToRoot();
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
    this.selectedUserId = null;
    this.breadcrums = [
      { name: "Shared", id: null, userId: this.userId },
    ];
    this.loadFolders(null);
  }

  async rebuildBreadcrumbsByIds(ids: string[]) {
    const tempCrumbs = [
      // { name: "Home", id: null },
      { name: "Shared", id: null, userId: this.userId },
    ];
    let currentParentId: string | null = null;

    let uId;
    for (const id of ids) {
      const key = currentParentId ?? "";
      // Use cached children or load them
      let children: any = this.folderCache[key];
      if (!children) {
        let res: any;
        if (!key) {
          res = await this.fileService
            .getSharedItemListWithPagination(this.userId, this.sharedWithMe)
            .toPromise();
        } else {
          uId = uId ?? this.userId;
          res = await this.fileService
            .loadChilderen(currentParentId, uId, true)
            .toPromise();
        }
        if (!res?.success) return;
        if (res.data.content) {
          children = res.data.content;
        } else {
          children = res.data;
        }
        const folder = children.find((f: any) => f.id === id);
        if (folder) {
          uId = folder.userId;
          const permission = folder.permissions.find(
            (p: any) => p.userName === this.email
          );

          // get the permission type
          this.access = permission ? permission.permissionType : this.access;
        }
        this.folderCache[key] = children;
      }
      // Find current folder in children
      const currentFolder = children.find((f: any) => f.id === id);
      if (!currentFolder) return;

      // Store metadata separately
      this.folderMeta[currentFolder.id] = currentFolder;

      tempCrumbs.push({ name: currentFolder.itemName, id: currentFolder.id, userId: currentFolder.userId });
      currentParentId = currentFolder.id;
      this.selectedUserId = currentFolder.userId;
    }

    this.breadcrums = tempCrumbs;

    const lastId = ids[ids.length - 1] ?? null;
    this.loadFolders(lastId);
  }

  loadFolders(parentId: string | null) {
    const key = parentId ?? "";
    this.isLoading = true;
    const uId = this.selectedUserId ?? this.userId;

    this.fileService
      .loadChilderen(parentId, uId, true)
      .subscribe((res: any) => {
        if (res?.success && res.data.length) {
          let data = res.data;
          if (this.isElectron) {
            this.electronFileService.performSupportAction(key, "FIND_CHILDREN_BY_CLOUD_ID").then((result) => {
              console.log("🔍 Electron support action result:", result);
              if (result.success) {
                console.log("✅ Fetched shared items from Electron support action");
                console.log(result.data);
                data.forEach((item: any) => {
                  const localItem = result.data?.find((l: any) => l.cloudItemId === item.id);
                  if (localItem) {
                    item.localPath = localItem.fullPath;
                    item.syncStatus = localItem.syncStatus;
                    item.fileId = localItem.fileId;
                    item.isLocal = true;
                  }
                });
              } else {
                console.error("Failed to fetch shared items from Electron:", result.error);
              }
            }).catch((err) => {
              console.error("Error during Electron support action:", err);
            });
          }
          this.folderCache[key] = data;
          this.folders = data;
          this.filteredFolders = data;

        } else {
          this.folderCache[key] = []; // cache empty result to avoid repeated calls
          this.folders = [];
          this.filteredFolders = [];
        }
        this.isLoading = false;
      }, error => {
        this.isLoading = false;
      }
      );
  }

  loadShared(parentId: any | null) {
    this.isLoading = true;
    const key = parentId ?? "";
    this.fileService
      .getSharedItemListWithPagination(this.userId, this.sharedWithMe)
      .subscribe((res: any) => {
        if (res?.success && res.data?.content.length) {
          let data = res.data?.content || [];
          if (this.isElectron ) {
          this.electronFileService.performSupportAction("", "FIND_ALL_SHARED").then((result) => {
            console.log("🔍 Electron support action result:", result);
            if (result.success) {
              console.log("✅ Fetched shared items from Electron support action");
              console.log(result.data);
              data.forEach((item: any) => {
                const localItem = result.data?.find((l: any) => l.cloudItemId === item.id);
                if (localItem) {
                  item.localPath = localItem.fullPath;
                  item.syncStatus = localItem.syncStatus;
                  item.fileId = localItem.fileId;
                  item.isLocal = true;
                }
              });
            } else {
              console.error("Failed to fetch shared items from Electron:", result.error);
            }
          }).catch((err) => {
            console.error("Error during Electron support action:", err);
          });
        }
          this.folderCache[key] =  data;
          this.folders = data;
          this.filteredFolders = data;
        } else {
          this.folderCache[key] = []; // cache empty result to avoid repeated calls
          this.folders = [];
          this.filteredFolders = [];
        }
        this.isLoading = false;
      },
        (error) => {
          console.error("🌩️ Cloud fetch failed:", error);
          this.isLoading = false;
        });
  }
  selectedUserId: any
  onFolderClick(folder: any) {
    const permission = folder?.permissions?.find(
      (p: any) => p.userName === this.email
    );

    // get the permission type
    this.access = permission ? permission.permissionType : this.access;
    let index = -1;
    if (folder.name === "Shared") {
      this.access = null;
      index = 0;
      let url = "/drive/shared";
      this.ngZone.runOutsideAngular(() => {
        this.location.replaceState(url);
      });
      // this.router.navigate(["/drive/shared"]);
    } else {
      for (let i = this.breadcrums.length - 1; i >= 0; i--) {
        if (this.breadcrums[i].id === folder.id) {
          index = i;
          break;
        }
      }
    }

    if (index >= 0) {
      // Folder already in breadcrumbs — trim to that level
      this.breadcrums = this.breadcrums.slice(0, index + 1);
    } else {
      // Folder not in breadcrumbs — add new entry
      this.breadcrums.push({ name: folder.itemName, id: folder.id, userId: folder?.userId });
    }
    this.selectedUserId = folder?.userId ?? this.userId;
    this.searchQuery = "";
    if (folder.id === null) {
      this.loadShared(null);
    } else {
      this.loadFolders(folder.id);
    }

    this.updateRoute();
  }

  updateRoute() {

    const pathIds = this.breadcrums
      .slice(1)
      .map((b: any) => b.id)
      .filter(Boolean);
    const baseId = pathIds[0];
    let url = "/drive/shared";

    if (pathIds.length > 0) {
      const encoded = encodeURIComponent(btoa(pathIds.join("/")));
      url += "/" + encoded;
    }
    url += `?type=${this.action}`;
    if (baseId !== "1") {
      this.ngZone.runOutsideAngular(() => {
        this.location.replaceState(url);
      });
    }

  }

  refreshFileList(data:any) {
    let parentId = this.getCurrentFolderId();
    this.loadFolders(parentId);
  }

  onFolderRenamed(folder: any) {
    if (!folder) return;
    this.fileService.updateFileName(folder).subscribe((res: any) => {
      if (res?.success && res.data) {
        const f = this.folders.find(f => f.id === res.data.id);
        if (f) f.itemName = res.data.itemName;
        this.folders = [...this.folders]; // refresh UI
      }
    });
  }

  async createFolder(data: any) {
      this.onFolderCreated(data);
  }

  onFolderCreated(movedFolder: any) {
    const movedId = String(movedFolder.id);
    const newParentId = movedFolder.parentId ?? "";

    // 🔍 Find old parent from folderCache
    let oldParentId = "";
    for (const [parentId, folderList] of Object.entries(this.folderCache)) {
      if (folderList.some((f) => String(f.id) === movedId)) {
        oldParentId = parentId;
        break;
      }
    }

    // 🧠 Always update metadata
    this.folderMeta[movedId] = movedFolder;

    // 🔁 If parent changed, move from old to new
    if (oldParentId !== newParentId) {
      // ❌ Remove from old parent
      if (this.folderCache[oldParentId]) {
        this.folderCache[oldParentId] = this.folderCache[oldParentId].filter(
          (f) => String(f.id) !== movedId
        );
      }

      // ✅ Add to new parent
      if (!this.folderCache[newParentId]) {
        this.folderCache[newParentId] = [];
      }
    } else {
      // 🆗 Just update in-place if parent is same
      const list = this.folderCache[newParentId];
      const index = list?.findIndex((f) => String(f.id) === movedId);
      if (list && index !== undefined && index >= 0) {
        list[index] = movedFolder;
      }
    }
    const alreadyExists = this.folderCache[newParentId].some(
      (f) => String(f.id) === String(movedId)
    );
    if (!alreadyExists) {
      this.folderCache[newParentId].push(movedFolder);
    }
    // 👁️ Refresh UI if viewing the affected parent
    const currentFolderId = this.getCurrentFolderId() ?? "";
    if (
      [oldParentId, newParentId].includes(currentFolderId) ||
      !currentFolderId
    ) {
      this.folders =
        this.folderCache[currentFolderId]?.filter((f) => !f?.isDeleted) || [];
      this.onSearchChange();
    }
  }

  onFolderDeleted(data: any) {
    if (!data) return;
    const files = data.record || [];
    const fileArray = Array.isArray(files) ? files : [files];

    // Remove from local folders list

    // Call delete for each item
    fileArray.forEach((file) => {
      this.fileService.deleteFolderOrFile(file.id).subscribe((res: any) => {
        if (res?.success) {
          this.folders = this.folders.filter(
            (f) => !fileArray.some((item) => item.id === f.id)
          );
          this.folderCache[file.parentId] = this.folders;
          delete this.folderMeta[file.id];
          this.onSearchChange();
        }
      });
    });
  }

  getCurrentFolderId(): string | null {
    return this.breadcrums[this.breadcrums.length - 1]?.id ?? null;
  }

  getCurrentFolder(): any {
    let id = this.getCurrentFolderId();
    if (!id) return null;
    return this.folderMeta[id] || null;
  }

}
