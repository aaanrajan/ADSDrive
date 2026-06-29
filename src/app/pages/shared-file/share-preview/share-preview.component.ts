import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FileService } from "../../../shared/service/file.service";
import { AppStorageService } from "../../../shared/service/app-storage.service";
import { forkJoin, Subscription } from "rxjs";
import { SharedService } from "../../../shared/shared.service";
import { AlertService } from "../../../shared/alert-service/alert.service";
import { DriveConfig } from "../../../shared/config/drive.config";
import { ElectronFileService } from "../../../shared/service/electron.service";

@Component({
  standalone: false,
  selector: "app-share-preview",
  templateUrl: "./share-preview.component.html"
})
export class SharePreviewComponent implements OnInit, OnDestroy {
  shareLink!: any;
  shareData: any;
  isLoading = true;
  isAuthorized = false;
  errorMessage: any;
  folderCache: { [key: string]: any[] } = {};
  breadcrums: { name: string; id: string | null, isLocal: boolean }[] = [
    { name: "Home", id: null, isLocal: false },
  ];
  isShowBreadcrumb = false;
  isRedirecting = false;
  accessRequested = false;
  driveData: any[] = [];
  private routeSub!: Subscription;
  @ViewChild('dropDownMenu') manageAccessMenu!: ElementRef<HTMLElement>;

  isDropdownOpen = false;
  selectedAccess: any = 'CAN_VIEW';
  showCommentPopup = false;
  commandText = '';
  selectedFileForComment: any = null;


  constructor(
    private route: ActivatedRoute,
    private service: FileService,
    private router: Router,
    private sharedService: SharedService,
    private alertService: AlertService,
    private electrionFileService: ElectronFileService ,
  ) { }

  isLoggedIn = false;
  user = {
    fullName: '',
    email: '',
  };


  batchColors: string[] = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500'
  ];

  accessOptions = [
    { label: 'Can View', value: 'CAN_VIEW', subLabel: "can't make changes" },
    { label: 'Can Edit', value: 'CAN_EDIT', subLabel: 'make any changes' },
    { label: 'Can View & Download', value: 'VIEW_DOWNLOAD', subLabel: 'can view & download' },
    { label: "View Only (No Download)", value: 'CANT_DOWNLOAD', subLabel: 'can view but not download' }
  ];


  getColor(user: any): string {
    let userName = user.fullName;

    if (!userName) return 'bg-gray-400';
    const index = userName.charCodeAt(0) % this.batchColors.length;
    return this.batchColors[index];
  }

  getInitial(user: any): string {
    return user.fullName.charAt(0).toUpperCase();
  }

  ngOnInit(): void {
    const firstName = AppStorageService.getItem('userName') || '';
    const lastName = AppStorageService.getItem('lastName') || '';
    const email = AppStorageService.getItem('email') || '';

    this.user.fullName = `${firstName} ${lastName}`.trim();
    this.user.email = email;

    this.isLoggedIn = !!(firstName || lastName || email);
    // Subscribe to paramMap changes
    this.routeSub = this.route.paramMap.subscribe(params => {
      const linkParam = params.get("shareLink");

      if (!linkParam) {
        console.error("❌ No shareLink parameter found in route");
        return;
      }

      try {
        // Decode Base64 → back to original JSON or string
        const decoded = atob(linkParam);
        // If your backend encodes an array or object as JSON before Base64,
        // then parse it safely
        try {
          this.shareLink = JSON.parse(decoded);
        } catch {
          // Otherwise, treat as a plain string
          this.shareLink = Array.isArray(decoded) ? decoded : [decoded];
        }

        this.verifyAccessAndLoadData();

      } catch (error) {
        console.error("❌ Invalid Base64 share link:", error);
      }
    });

  }


  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  verifyAccessAndLoadData() {
    this.service.getSharedItem(this.shareLink).subscribe({
      next: (res: any) => {
        if (res.data) {
          this.shareData = res.data;
          // this.driveData = this.shareData[0]?.driveItems || [];


          const userId = AppStorageService.getItem("userId");

          let allow = this.shareData?.some((entry: any) => {
            const share = entry.shareDetails;
            return share.shareEveryone === true || share.userId === userId;
          });

          let email: string | null = AppStorageService.getItem("email");
          // if (!allow) {
          //   this.isLoading = false;
          //   console.log("Access not allowed for this user.", email);
          //   if (!email) {
          //     this.isRedirecting = true;
          //   } else {
          //     this.showAccessDenied();
          //   }
          //   return;
          // }

          this.isLoading = false;

          // Process shareData to extract driveData with accessibility info
          this.driveData = [];
          if (this.shareData?.length) {
            this.driveData = this.shareData.map((entry: any) => {
              const item = entry.driveItems[0];
              const share = entry.shareDetails;
              const permission = entry.shareUserPermissions?.find(
                (p: any) => p.userName === email
              );

              console.log("👤 userId:", userId, "shared userId:", share.userId);
              const accessible =
                share.shareEveryone === true || share.userId === userId ||
                permission?.isAllow === true ||
                (!permission?.isAllow &&
                  (permission?.permissionType === 'read' ||
                    permission?.permissionType === 'VIEW_DOWNLOAD' ||
                    permission?.permissionType === 'CAN_VIEW'));

              return {
                id: item.id,
                itemName: item.itemName,
                fileType: item.fileType || (item.isFolder ? 'folder' : 'file'),
                isFolder: item.isFolder,
                size: item.size,
                createdBy: item.createdBy,
                modifiedDate: item.modifiedDate,
                color: item.color,
                lastViewedAt: item.lastViewedAt,
                fileDetailId: item.fileDetailId,
                darkenColor: this.sharedService.darkenColor(item.color || '#FCD34D', 20),
                shareDetailId: share.id,
                shareLink: share.shareLink,
                permissionType: share.permissionType,
                shareAction: share.shareAction,
                shareEveryone: share.shareEveryone,
                expiredAt: share.expiredAt,
                description: share.description,
                ownerUserId: share.userId,

                // 👤 User Permission Info
                userEmail: permission?.userName,
                isAllow: permission?.isAllow,
                userPermissionType: permission?.permissionType,

                // ✅ Computed property
                accessible,
              };
            });
            const key = "";
            this.folderCache[key] = this.driveData;


          }

          if (!this.driveData.some(d => d.accessible)) {
            // this.showAccessDenied();
            this.isLoading = false;
            if (!email) {
              this.isRedirecting = true;
            } else {
              this.showAccessDenied();
              this.isAuthorized = false;
            }
            return;
          }
          this.isAuthorized = true;


          if (this.driveData.length == 1 && !this.driveData[0].isFolder) {
            this.isModalOpen = true;
            this.selectedFile = this.driveData[0]
            this.showClose = false
          }
        }
      },
      error: (err) => {
        console.error("Access denied or link invalid", err);
        this.isRedirecting = true;
      },
    });
  }
  selectedFile: any;
  isModalOpen: boolean = false;
  loadSharedData(email: any) {
    this.service.verfyShareAccess(this.shareLink, email).subscribe({
      next: (res: any) => {
        if (res.data) {
          this.showData();
          // continue processing shared data...
        } else {
          this.showAccessDenied();
        }
      },
      error: (err) => {
        console.error("Access denied or link invalid", err);

        const customMessage = (err.status === 401 || err.status === 403)
          ? "You don’t have access to this data. Try logging in with a different account."
          : (err.error?.errorMessage || "Something went wrong. Please try again.");

        this.showAccessDenied(customMessage);
      },
    });
  }

  showData() {
    if (this.driveData?.length > 1) {
      this.router.navigateByUrl(`/drive/shared`);
    } else if (this.driveData?.length === 1 && this.driveData[0].isFolder) {
      const encoded = btoa(this.driveData[0].id);
      this.router.navigateByUrl(`/drive/shared/${encoded}`);
    } else {
      this.isModalOpen = true;
      this.selectedFile = this.driveData[0];
    }
  }

  showClose = false

  isMobile(): boolean {
    return window.innerWidth <= 768;
  }


  onItemClick(event: MouseEvent, file: any) {
    if (!this.isMobile()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.openItem(file);
  }

  openItem(item: any) {
    if (item.isFolder) {
      this.onFolderClick(item);
    } else {
      this.isModalOpen = true;
      this.showClose = true;
      this.selectedFile = item;
    }
  }

  download(item: any) {
    if (!item?.fileDetailId) {
      return;
    }

    if (item.isLocal) {
      this.electrionFileService.performFileAction(item.id, 'DOWNLOAD').then(() => {
        this.alertService.show("Download started", DriveConfig.VARIANTS.SUCCESS);
      });
      return;
    }

    let downloadUrl = item.isFolder
      ? this.service.downloadFolder(item.fileDetailId)
      : this.service.downloadFile(item.fileDetailId);

    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
      this.alertService.show("Your download has started", DriveConfig.VARIANTS.SUCCESS);
    } else {
      this.alertService.show("Download failed", DriveConfig.VARIANTS.DANGER);
    }
  }

  toggleMenu(file: any) {
    file.showMenu = !file.showMenu;
  }

  closeAllMenus() {
    this.driveData.forEach((f: any) => f.showMenu = false);
  }

  @HostListener('document:click', ['$event'])
  onGlobalClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (!target.closest('.menu-container') && !target.closest('.three-dot-btn')) {
      this.closeAllMenus();
    }

    if (this.manageAccessMenu && !this.manageAccessMenu.nativeElement.contains(target)) {
      this.isDropdownOpen = false;
    }

    if (this.showCommentPopup && !target.closest('.comment-popup')) {
    }
  }

  comment(file: any) {
    this.selectedFileForComment = file;
    this.emailInput = this.user?.email || '';
    this.commandText = '';
    this.showCommentPopup = true;
  }

  closeComment() {
    this.showCommentPopup = false;
  }

  submitCommand() {
    if (!this.commandText.trim()) {
      return;
    }

    const payload = {
      userName: this.emailInput,
      message: this.commandText,
      driveItemId: this.selectedFileForComment?.id,
    };


    this.service.commentpost(payload).subscribe({
      next: (res: any) => {
        this.closeComment();
      },
      error: (err) => {
      }
    });
  }

  showAccessDenied(
    message: string = "You’re currently logged in, but you don’t have permission to view this shared content."
  ) {
    this.errorMessage = message;
    this.isAuthorized = false;
  }

  navigateToLogin() {
    AppStorageService.clear();
    AppStorageService.setItem('shareLink', this.shareLink);
    this.router.navigate(['/login']);
  }

  getIconForNode(node: any): string {
    return this.sharedService.getIconForNode(
      node?.fileType,
      node?.isFolder,
      node?.itemName
    );
  }

  closeModal() {
    this.isModalOpen = false;
    this.showClose = false;
  }

  isDialogOpen = false;
  emailInput = '';

  selectedData: any = null;
  requestAccess(data: any = null) {
    this.selectedData = data;
    this.selectedAccess = data?.permissionType || 'CAN_VIEW';
    const email = AppStorageService.getItem('email');
    this.emailInput = email || '';
    this.isDialogOpen = true;
  }



  submitDialog() {
    if (!this.emailInput) return;

    let ids: any[] = [];

    if (this.selectedData?.shareDetailId) {
      // Single ID
      ids = [this.selectedData.shareDetailId];
    } else {
      // Multiple IDs
      ids = this.shareData?.map((entry: any) => entry.shareDetails.id) || [];
    }

    if (!ids.length) {
      this.alertService.show("No shareDetailIds found.", DriveConfig.VARIANTS.DANGER);
      return;
    }

    // Create array of Observables for forkJoin
    const requests = ids.map(id =>
      this.service.requestAccessToSharedFile({
        userName: this.emailInput,
        permissionType:
         this.selectedAccess,
        shareDetailId: id
      })
    );

    // Run all in parallel
    forkJoin(requests).subscribe({
      next: (results: any[]) => {
        const allSuccess = results.every(r => r?.success === true);

        if (allSuccess) {
          this.alertService.show("Request Sent Successfully!", DriveConfig.VARIANTS.SUCCESS);
        } else {
          // Get first error message
          const errorMsg = results.find(r => !r.success)?.message || "Some requests failed.";
          this.alertService.show(errorMsg, DriveConfig.VARIANTS.DANGER);
        }

        // Reset form
        this.emailInput = '';
        this.selectedData = null;
        this.selectedAccess = null;
        this.accessRequested = true;
        this.isDialogOpen = false;
      },

      error: (err) => {
        const backendMsg = err?.error?.message || "Error sending requests.";
        this.alertService.show(backendMsg, DriveConfig.VARIANTS.DANGER);
      }
    });
  }


  closeDialog() {
    this.isDialogOpen = false;
    this.emailInput = '';
  }


  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectAccess(option: any) {
    this.selectedAccess = option;
    this.isDropdownOpen = false;
  }

  getAccessLabel(value: string): string {
    const option = this.accessOptions.find(opt => opt.value === value);
    return option ? option.label : 'Can view';
  }

  loadFolders(parentId: string | null, userId: any, folder: any): void {
    const key = parentId ?? "";
    this.service.loadChilderen(parentId, userId)
      .subscribe((res: any) => {
        const cloudData = res?.success ? res.data || [] : [];
        this.driveData = cloudData.map((item: any) => {
          return {
            id: item.id,
            itemName: item.itemName,
            fileType: item.fileType || (item.isFolder ? 'folder' : 'file'),
            isFolder: item.isFolder,
            size: item.size,
            createdBy: item.createdBy,
            modifiedDate: item.modifiedDate,
            color: item.color,
            lastViewedAt: item.lastViewedAt,
            fileDetailId: item.fileDetailId,
            darkenColor: this.sharedService.darkenColor(item.color || '#FCD34D', 20),
            shareDetailId: folder.shareDetailId,
            shareLink: folder.shareLink,
            permissionType: folder.permissionType,
            shareAction: folder.shareAction,
            shareEveryone: folder.shareEveryone,
            expiredAt: folder.expiredAt,
            description: folder.description,
            ownerUserId: item.userId,

            // 👤 User Permission Info
            userEmail: folder?.userEmail,
            isAllow: folder?.isAllow,
            userPermissionType: folder?.permissionType,

            // ✅ Computed property
            accessible: true,
          }
        });
        this.folderCache[key] = this.driveData;

        this.isLoading = false;
      }, (error) => {
        console.error("🌩️ Cloud fetch failed:", error);
        this.driveData = [];
      });
  }

  onFolderClick(folder: any) {
    const index = this.breadcrums.findIndex((b) => b.id === folder.id);
    const key = folder.id ?? "";
    if (!key) {
      this.isShowBreadcrumb = false;
    } else {
      this.isShowBreadcrumb = true;
    }
    if (index >= 0) {
      // Folder already in breadcrumbs — trim to that level
      this.breadcrums = this.breadcrums.slice(0, index + 1);

      this.driveData = this.folderCache[key] || [];
    } else {
      // Folder not in breadcrumbs — add new entry
      this.breadcrums.push({ name: folder.itemName, id: folder.id, isLocal: folder.isLocal });
      this.loadFolders(folder.id, folder.ownerUserId, folder);
    }

  }

  get isSingleFileView(): boolean {
  return (
    this.breadcrums?.length > 1 &&
    this.driveData?.length === 1 &&
    !this.driveData[0]?.isFolder
  );
}

}