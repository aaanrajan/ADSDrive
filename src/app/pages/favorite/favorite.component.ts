import { Component, NgZone } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FileService } from "../../shared/service/file.service";
import { Location } from "@angular/common";
import { FileNode } from "../../model/drive-item";
import { AppStorageService } from "../../shared/service/app-storage.service";
@Component({
  standalone: false,
selector: "app-favorite",
  templateUrl: "./favorite.component.html",
  styleUrl: "./favorite.component.scss",
})
export class FavoriteComponent {
  breadcrums: { name: string; id: string | null }[] = [
    // { name: "Home", id: null },
    { name: "Favorites", id: null },
  ];
  folders: any[] = [];
  folderCache: { [key: string]: any[] } = {};
  folderMeta: { [id: string]: any } = {}; // Stores single folder metadata
  private ignoreNextParamChange = false;
  type: any = "FAVORITE";
  userId: any;
  searchQuery: string = "";
  filteredFolders: any[] = [];
  isLoading:boolean = false;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fileService: FileService,
    private location: Location,
    private ngZone: NgZone
  ) {
    this.userId = AppStorageService.getItem("userId");
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
        console.log("encoded data", encoded);
        await this.rebuildBreadcrumbsByIds(idSegments);
      } else {
        this.loadFavorite(null);
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
      // { name: "Home", id: null },
      { name: "Favorites", id: null },
    ];
    this.loadFolders(null);
  }

  async rebuildBreadcrumbsByIds(ids: string[]) {
    const tempCrumbs = [
      // { name: "Home", id: null },
      { name: "Favorites", id: null },
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
            .loadFavorite(currentParentId, this.userId)
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
   this.isLoading = true;
    const key = parentId ?? "";
    // Use cached data if available


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
        this.isLoading = false;
      }, err => {
        this.isLoading = false;
      });
  }

  loadFavorite(parentId: any | null) {
    this.isLoading = true;
    const key = parentId ?? "";


    this.fileService
      .loadFavorite(parentId, this.userId)
      .subscribe((res: any) => {
        if (res?.success && res.data.length) {
          this.folderCache[key] = res.data;
          this.folders = res.data;
          this.filteredFolders = res.data;
          this.isLoading = false;
        } else {
          this.folderCache[key] = []; // cache empty result to avoid repeated calls
          this.folders = [];
          this.filteredFolders = [];
        }
        this.isLoading = false;
      },error =>{
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
    this.searchQuery = "";
    this.loadFolders(folder.id);
    this.updateRoute();
  }

  updateRoute() {
    const pathIds = this.breadcrums
      .slice(2)
      .map((b) => b.id)
      .filter(Boolean);

    const baseId = pathIds[0];
    let url =  "/drive/favorites";

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

  onFolderRenamed(folder: any) {
    if (!folder) return;
    this.fileService.updateFileName(folder).subscribe((res: any) => {
      if (res?.success && res.data) {
        this.onFolderCreated(res.data);
      }
    });
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

  onFavoriteToggled(node: FileNode) {
    // Remove the node from the list if it's no longer a favorite
    if (!node.isFavorite) {
      this.folders = this.folders.filter((f) => f.id !== node.id);
      this.onSearchChange();
    }
  }
}
