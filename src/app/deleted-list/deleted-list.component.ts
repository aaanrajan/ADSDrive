import { Component, NgZone, Optional, SkipSelf } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FileService } from "../../shared/service/file.service";
import { Location } from "@angular/common";
import { AppStorageService } from "../../shared/service/app-storage.service";
import { MainLayoutComponent } from "../../layouts/main-layout/main-layout.component";

@Component({
  standalone: false,
  selector: "app-deleted-list",
  templateUrl: "./deleted-list.component.html",
  styleUrl: "./deleted-list.component.scss",
})
export class DeletedListComponent {
  breadcrums: { name: string; id: string | null }[] = [
    { name: "Home", id: null },
    { name: "Trash", id: null },
  ];
  folders: any[] = [];
  folderCache: { [key: string]: any[] } = {};
  folderMeta: { [id: string]: any } = {}; // Stores single folder metadata
  private ignoreNextParamChange = false;
  type: any = "TRASH";
  userId: any;
  searchQuery: string = "";
  filteredFolders: any[] = [];
  isLoading: boolean = false;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fileService: FileService,
    private location: Location,
    private ngZone: NgZone,
    @Optional() @SkipSelf() private mainLayout: MainLayoutComponent
  ) {
    this.userId = AppStorageService.getItem("userId")
  }

  ngOnInit(): void {
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
        this.loadDeletedList(null);
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
    this.breadcrums = [
      { name: "Home", id: null },
      { name: "Trash", id: null },
    ];
    this.loadFolders(null);
  }

  async rebuildBreadcrumbsByIds(ids: string[]) {
    const tempCrumbs = [
      { name: "Home", id: null },
      { name: "Trash", id: null },
    ];
    let currentParentId: string | null = null;

    for (const id of ids) {
      const key = currentParentId ?? "";
      // Use cached children or load them
      let children: any = this.folderCache[key];
      if (!children) {
        let res: any;
        if (!key) {
          res = await this.fileService
            .loadDeletedList(currentParentId, this.userId)
            .toPromise();
        } else {
          res = await this.fileService
            .loadChilderen(currentParentId, this.userId)
            .toPromise();
        }
        if (!res?.success) return;
        children = res.data;
        this.folderCache[key] = children;
      }

      // Find current folder in children
      const currentFolder = children.find((f: any) => f.id === id);
      if (!currentFolder) return;

      // Store metadata separately
      this.folderMeta[currentFolder.id] = currentFolder;

      tempCrumbs.push({ name: currentFolder.itemName, id: currentFolder.id });
      currentParentId = currentFolder.id;
    }

    this.breadcrums = tempCrumbs;

    const lastId = ids[ids.length - 1] ?? null;
    this.loadFolders(lastId);
  }

  loadFolders(parentId: string | null) {
    const key = parentId ?? "";
    // Use cached data if available
    if (this.folderCache[key]) {
      this.folders = this.folderCache[key];
      return;
    }

    this.fileService
      .loadChilderen(parentId, this.userId)
      .subscribe((res: any) => {
        if (res?.success && res.data.length) {
          this.folderCache[key] = res.data;
          this.folders = res.data;
          this.filteredFolders = res.data;
        } else {
          this.folderCache[key] = []; // cache empty result to avoid repeated calls
          this.folders = [];
          this.filteredFolders = [];
        }
      });
  }

  loadDeletedList(parentId: any | null) {
    this.isLoading = true;
    const key = parentId ?? "";

    // Use cached data if available
    if (this.folderCache[key]) {
      this.folders = this.folderCache[key];
      return;
    }

    this.fileService
      .loadDeletedList(parentId, this.userId)
      .subscribe((res: any) => {
        if (res?.success && res.data.length) {
          this.folderCache[key] = res.data;
          this.folders = res.data;
          this.filteredFolders = res.data;
        } else {
          this.folderCache[key] = []; // cache empty result to avoid repeated calls
          this.folders = [];
          this.filteredFolders = [];
        }
        this.isLoading = false;
      }, error => {
        this.isLoading = false;
      });
  }

  onFolderClick(folder: any) {
    let index = -1;
    if (folder.name === "Home") {
      index = 0;
      this.router.navigate(["/drive/home"]);
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
      this.breadcrums.push({ name: folder.itemName, id: folder.id });
    }

    this.loadFolders(folder.id);
    this.searchQuery = "";
    this.updateRoute();
  }

  updateRoute() {
    const pathIds = this.breadcrums
      .slice(2)
      .map((b) => b.id)
      .filter(Boolean);

    const baseId = pathIds[0];
    let url = baseId === "1" ? "/drive/home" : "/drive/trash";

    if (pathIds.length > 0) {
      const encoded = btoa(pathIds.join("/"));
      url += "/" + encoded;
    }

    if (baseId !== "1") {
      this.ngZone.runOutsideAngular(() => {
        this.location.replaceState(url);
      });
    }
  }

  onFolderCreated(folder: any) {
    const parentId = folder.parentId ?? "";

    if (!this.folderCache[parentId]) {
      this.folderCache[parentId] = [];
    }

    const existingIndex = this.folderCache[parentId].findIndex(
      (f) => f.id === folder.id
    );

    if (existingIndex === -1) {
      this.folderCache[parentId].push(folder);
    } else {
      this.folderCache[parentId][existingIndex] = folder; // Optionally update existing
    }

    if (this.folderMeta) {
      this.folderMeta[folder.id] = folder;
    }

    if (Array.isArray(this.folderCache[parentId])) {
      this.folders = this.folderCache[parentId].filter((f) => !f?.isDeleted);
    } else {
      this.folders = [];
    }
  }

  onFolderDeleted(data: any) {
    if (!data) return;
    if (data === "EMPTY") {
      this.fileService.emptyTrashByUserId(this.userId).subscribe((res: any) => {
        if (res?.success) {
          this.folders.forEach((x) => this.removeCache(x));
          this.mainLayout?.loadStorageUsage();
        }
      });
    } else {
      const files = data.items || [];
      const fileArray = Array.isArray(files) ? files : [files];

      if (fileArray.length === 1) {
        // 🔹 Single permanent delete
        const file = fileArray[0];
        this.fileService.permanentDeleteFolderOrFile(file.id).subscribe((res: any) => {
          if (res?.success) {
            this.removeCache(file);
            this.mainLayout?.loadStorageUsage();
          }
        });
      } else if (fileArray.length > 1) {
        // 🔹 Multiple permanent delete
        const ids = fileArray.map(f => f.id);
        this.fileService.deletePermanentMultiple(ids).subscribe((res: any) => {
          if (res?.success) {
            fileArray.forEach(file => this.removeCache(file));
            this.mainLayout?.loadStorageUsage();
          }
        });
      }
    }
  }

  getCurrentFolderId(): string | null {
    return this.breadcrums[this.breadcrums.length - 1]?.id ?? null;
  }

  restoreFileOrFolder(item: any) {
    if (item instanceof Set) {
      const ids = Array.from(item);

      if (ids.length === 1) {
        const singleId = ids[0];

        this.fileService.restoreFileOrFolder(singleId, this.userId)
          .subscribe((res: any) => {
            if (res?.success) {
              this.removeCache({ id: singleId });
            }
          });

      } else if (ids.length > 1) {
        this.fileService.multipleFileRestor(this.userId, ids)
          .subscribe((res: any) => {
            if (res?.success) {
              ids.forEach(id => this.removeCache({ id }));
            }
          });
      }

      return;
    }

    if (typeof item === 'string') {
      this.fileService.restoreFileOrFolder(item, this.userId)
        .subscribe((res: any) => {
          if (res?.success) this.removeCache({ id: item });
        });
      return;
    }

    if (item?.id) {
      this.fileService.restoreFileOrFolder(item.id, this.userId)
        .subscribe((res: any) => {
          if (res?.success) this.removeCache(item);
        });
      return;
    }

    console.warn("Unknown item type:", item);
  }

  removeCache(item: any) {
    this.folders = this.folders.filter((f) => item.id != f.id);
    this.onSearchChange();
  }
}
