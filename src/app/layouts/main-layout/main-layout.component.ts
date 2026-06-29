import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
} from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { FileService } from "../../shared/service/file.service";
import { SharedService } from "../../shared/shared.service";
import { AlertService } from "../../shared/alert-service/alert.service";
import { DriveConfig } from "../../shared/config/drive.config";
import { AppStorageService } from "../../shared/service/app-storage.service";
import { response } from "express";
import { environment } from "../../../environments/environment";
import { ElectronFileService } from "../../shared/service/electron.service";

@Component({
  standalone: false,
  selector: "app-main-layout",
  templateUrl: "./main-layout.component.html",
  styleUrl: "./main-layout.component.scss",
})
export class MainLayoutComponent {
  @ViewChild("profileMenu") profileMenuRef!: ElementRef;
  @ViewChild('searchBox', { static: false }) searchBoxRef!: ElementRef;
  @ViewChild('notificationMenu', { read: ElementRef }) notificationMenu!: ElementRef;
  usedStorageBytes: number = 0;
  totalStorageBytes: number = 0;
  usagePercent: number = 0;
  usageLabel: string = "";
  showProfileDropdown = false;
  profileImageUrl: string = "";
  mobileMenuOpen = false;
  searchFile: any[] = [];
  searchText: string = "";
  isSearching: boolean = false;
  isCollapsed = false;
  showArrow = false;
  isOverlay = false;
  isElectron: boolean = false;
  isScreenLarge = true;
  userName = '';
  email = '';
  lastName = '';
  totalStorage = '';
  mobileClosing = false;
  sidebarVisible = false;
  @ViewChild('sidebarRef') sidebarRef!: ElementRef;
  @ViewChild('sidebarToggle') sidebarToggleRef!: ElementRef;
  @ViewChild('mobileMenuRef') mobileMenuRef!: ElementRef;
  @ViewChild('openDriveContainer', { static: false }) openDriveContainer!: ElementRef;
  isMobile: boolean = false;
  showNotificationDropdown = false;
  notificationTab: 'all' | 'unread' = 'all';
  openDrive: boolean = false;
  count: number = 0;
  showLogoutModal = false;
  showDropdown = false;
  fullName: any = '';
  constructor(
    private _router: Router,
    private service: FileService,
    private share: SharedService,
    private alertService: AlertService    
  ) {
    this.isElectron = this.share.isElectron();
    this.getProductList();
    this.getSessions();

  }

  ngOnInit() {
    this.loadStorageUsage();
    this.getUnreadNotificationCount();
    this.onResize();
    this.userName = AppStorageService.getItem('userName') || '';
    this.email = AppStorageService.getItem('email') || '';
    this.lastName = AppStorageService.getItem('lastName') || '';

    this.fullName = [this.userName, this.lastName]
      .filter(name => name && name !== 'null' && name.trim() !== '')
      .join(' ');
    this.isMobile = this.share.isMobile();
  }

  openDriveOption() {
    this.openDrive = !this.openDrive
  }

  async openExternalApp(type: any) {
    let url = '';
    let sessiontoken = (await AppStorageService.getItem('token')) || '';
    if (type === 'TEAMBUZZ') {
      url = environment?.teamBuzzBaseUrl + btoa(sessiontoken);
    } else if (type === 'MAIL') {
      url = environment?.mailBaseUrl + btoa(sessiontoken)
    }
    else if (type === 'FORM') {
      url = environment?.formBaseUrl + btoa(sessiontoken)
    }
    if (url) {
      window.open(url, '_blank');
    } else {
      console.warn('No valid URL found for type:', type);
    }
    this.openDrive = false;
  }

  getUnreadNotificationCount() {
    this.service.getUnreadNotificationCount(AppStorageService.getItem("userId")).subscribe({
      next: (res: any) => {
        this.count = res.data || 0;
      }
    });
  }


  loadStorageUsage() {
    const userId = AppStorageService.getItem("userId");
    this.service.getStorageUsage(userId).subscribe({
      next: (res: any) => {
        const bytesUsed = res.data?.occupiedSpace || 0;
        const totalBytes = res.data?.totalSpace || 5 * 1024 * 1024 * 1024;
        this.totalStorage = this.share.formatSize(totalBytes);

        this.usagePercent = +((bytesUsed / totalBytes) * 100).toFixed(2);
        this.usageLabel = `${this.share.formatSize(
          bytesUsed
        )} used of ${this.share.formatSize(totalBytes)}`;

        if (bytesUsed > totalBytes) {
          this.alertService.show(
            "You have exceeded your storage limit. Please free up space.",
            DriveConfig.VARIANTS.DANGER
          );
        }
      },
      error: (err) => {
        console.error("Error fetching storage usage:", err);
      },
    });
  }

  toggleNotificationDropdown() {
    this.showNotificationDropdown = !this.showNotificationDropdown;
    this.showProfileDropdown = false;
    const userId = AppStorageService.getItem("userId");
    this.service.resetCount(userId).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.getUnreadNotificationCount();
        }
      },
      error: (err) => console.error(err)
    });
  }

  searchFiles() {
    // this.searchText = event.target.value;

    if (!this.searchText.trim()) {
      this.searchFile = [];
      this.isSearching = false;
      this.searchText = '';
      this.showDropdown = false;
      return;
    }
    this.showDropdown = true;

    let data = {
      userId: AppStorageService.getItem("userId"),
      page: 0,
      size: 10,
      search: this.searchText
    };

    this.isSearching = true;
    this.service.getAllDriveItemsByUserId(data).subscribe(
      (res: any) => {
        this.isSearching = false;
        this.searchFile = res?.success ? res.data?.content || [] : [];
      },
      (error: any) => {
        this.isSearching = false;
        console.error("Error loading files:", error);
      }
    );
  }

  formatSize(size?: number): string {
    return this.share.formatSize(size);
  }

  formatLocation(location: string): string {
    if (!location) return '';
    const remove = AppStorageService.getItem("userId") + "/";
    return location.replace(remove, "");
  }

  openLocation(node: any) {
    if (!node?.parentId) return;

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
      this._router.navigateByUrl(url);
      this.searchText = "";
      this.searchFile = [];
    });
  }

  getTargetIds(path: string): string[] {
    return path.split('/').filter(Boolean);
  }

  toggleSidebar() {
    if (!this.isScreenLarge) {
      this.isOverlay = !this.isOverlay;
      this.isCollapsed = !this.isCollapsed;
    } else {
      this.isCollapsed = !this.isCollapsed;
    }
  }

  closeNotificationPanel() {
    this.showNotificationDropdown = false;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isScreenLarge = window.innerWidth >= 1100;
    this.showArrow = window.innerWidth < 1100
    if (this.isScreenLarge) {
      this.isOverlay = false;
      this.isCollapsed = false;
    } else {
      this.isCollapsed = true;
    }
  }

  toggleProfileDropdown() {
    this.showProfileDropdown = !this.showProfileDropdown;
    this.showNotificationDropdown = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = true;

    setTimeout(() => {
      this.sidebarVisible = true;
    }, 10);
  }


  logout() {
    AppStorageService.clear();
    this.service.clearUploadTasks();
   if (this.isElectron) {
     this._router.navigate(["/login"]);
    } else {
    this._router.navigate(["/home"]);
    }
  }

  goToProfile(event: any) {
    this.toggleProfileDropdown();

    if (event === "CHANGE_PASSWORD") {
      this._router.navigate(["change-password"], {
        queryParams: { type: event },
      });
    }
  }

  @HostListener("document:click", ["$event"])
  @HostListener('document:touchstart', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInsideProfile = this.profileMenuRef?.nativeElement.contains(target);
    const clickedInsideSearch = this.searchBoxRef?.nativeElement.contains(target);
    const clickedInsideSidebar = this.sidebarRef?.nativeElement.contains(target);
    const clickedToggleIcon = this.sidebarToggleRef?.nativeElement.contains(target);
    const clickedInsideNotification = this.notificationMenu?.nativeElement.contains(target);
    if (!clickedInsideProfile && !clickedInsideSearch) {
      this.showProfileDropdown = false;
      this.searchText = "";
      this.searchFile = [];
    }
    if (!clickedInsideSidebar && !clickedToggleIcon && this.isOverlay && !this.isCollapsed) {
      this.toggleSidebar();
    }
    // Close notification if clicked outside
    if (!clickedInsideNotification) {
      this.showNotificationDropdown = false;
    }
    // if (this.mobileMenuOpen && this.mobileMenuRef && !this.mobileMenuRef.nativeElement.contains(target)) {
    //   this.toggleMobileMenu();
    // }
    if (!this.openDriveContainer) return;

    const clickedInside = this.openDriveContainer.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.openDrive = false;
    }
    if (this.mobileMenuOpen &&
      this.mobileMenuRef &&
      !this.mobileMenuRef.nativeElement.contains(target)) {
      this.closeMobileMenuWithAnimation();
    }


  }

  menuItems = [
    {
      label: "MAIN MENU",
      children: [
        { label: "Home", path: "/drive/home", icon: "fa-home" },
        { label: "My Files", path: "/drive/my-files", icon: "fa-folder-open" },
        { label: "Shared", path: "/drive/shared", icon: "fa-user-group" },
        { label: "Favorites", path: "/drive/favorites", icon: "fa-star" },
        { label: "Trash", path: "/drive/trash", icon: "fa-trash-can" },
        { label: "Settings", path: "/drive/setting", icon: "fa-gear" },
        { label: "Notes", path: "/drive/notes", icon: "fa-note-sticky" }
      ]
    },
    {
      label: "BROWSE FILES BY",
      children: [
        { label: "People", path: "/drive/people", icon: "fa-user" },
        { label: "Media", path: "/drive/media", icon: "fa-image" }
      ]
    }
  ];

  showMobileSearch: boolean = false;

  toggleSearchBox() {
    this.showMobileSearch = !this.showMobileSearch;
    this.searchFile = [];
    this.searchText = '';
  }

  closeMobileMenu(event: any) {
    if (this.mobileMenuOpen && !this.mobileClosing) {
      event.stopPropagation();
      this.closeMobileMenuWithAnimation();
    }
  }

  listenToRouteChanges() {
    this._router.events.subscribe((event) => {
      if (event instanceof NavigationEnd && this.mobileMenuOpen) {
        this.mobileMenuOpen = false;
      }
    });
  }
  gotoUpgrade() {
    this.showProfileDropdown = false;
    this._router.navigate(
      ['/drive/setting'],
      { queryParams: { tab: 'plans' } }
    );
  }

  closeMobileMenuWithAnimation() {
    this.sidebarVisible = false;

    setTimeout(() => {
      this.mobileMenuOpen = false;
    }, 500);
  }

  groupedProducts: any[] = [];

  getProductList() {
    let userName = AppStorageService.getItem('email');

    this.service.getProductsList(userName).subscribe({
      next: (res: any) => {

        const currentApp = 'ADS_DRIVE';

        const filtered = res.filter((product: any) => product.productId !== currentApp);

        const grouped = filtered.reduce((acc: any, product: any) => {
          const key = product.productScope || 'OTHERS';

          if (!acc[key]) {
            acc[key] = {
              title: this.mapGroupTitle(key),
              products: []
            };
          }

          acc[key].products.push(product);

          return acc;
        }, {});

        this.groupedProducts = Object.values(grouped);
      }
    });
  }

  mapGroupTitle(scope: string): string {
    switch (scope) {
      case 'PLATFORM':
        return 'Platform Products';

      case 'GLOBAL_OTHER_ORG':
        return 'Global Products';

      case 'CURRENT_ORG':
        return 'Your Organization Products';

      case 'PRIVATE':
        return 'Private Products';

      default:
        return 'Other Products';
    }
  }

  openExternalProduct(product: any) {
    if (product?.redirectUri) {
      const url = new URL(product.redirectUri);
      const domain = url.origin;

      window.open(domain, '_blank');
    }
  }


  sessionList: any[] = [];
  otherSessions: any[] = [];
  isSwitchOpen = true;
  getSessions() {
    this.service.getSessions().subscribe({
      next: (res: any) => {
        this.sessionList = res.map((session: any) => {
          const firstName = session.firstName?.trim();
          const lastName = session.lastName?.trim();

          let fullName = '';

          if (firstName || lastName) {
            fullName = [firstName, lastName].filter(Boolean).join(' ');
          } else if (session.email) {
            fullName = session.email.split('@')[0]; // fallback
          } else {
            fullName = 'User';
          }

          return {
            ...session,
            fullName
          };
        });
        this.otherSessions = this.sessionList.filter(
          (session: any) =>
            session?.isActive === true &&
            !session?.isCurrentSession
        );
      },
      error: (err) => {
        console.error('Error fetching sessions:', err);
      }
    });
  }

  @ViewChild('switchHandler') switchHandler!: any;
  switchAccount(session: any, isLogout: boolean = false) {
    console.log('Switching to:', session);
    this.switchHandler.switchAccount(session, isLogout);

  }

  addAccount() {
    window.location.href = environment.service_url + '/auth/bootstrap?prompt=login';
  }

  trackBySession(index: number, session: any) {
    return session.sessionId;
  }


  toggleSwitch() {
    this.isSwitchOpen = !this.isSwitchOpen;
  }

  closeSwitch() {
    this.isSwitchOpen = false;
  }

  handlePostLogoutSession() {
    this.service.getSessions().subscribe({

      next: (sessions: any[]) => {

        const otherSessions = sessions.filter(
          (s: any) => !s.isCurrentSession && s.isActive
        );

        if (otherSessions.length === 0) {
          this.openLogoutModal();

        } else {
          this.switchAccount(otherSessions[0], true);
        }
      },

      error: (err) => {

        console.error('Session fetch failed', err);

        this.openLogoutModal();

      }

    });
  }
  
  openLogoutModal() {
    this.showProfileDropdown = false;
    this.showLogoutModal = true;
  }

  closeLogoutModal() {
    this.showLogoutModal = false;
  }
  confirmLogout() {
    this.showLogoutModal = false;
    AppStorageService.clear();
    this.service.clearUploadTasks();
    if (this.isElectron) {
     this._router.navigate(["/login"]);
    } else {
    this._router.navigate(["/home"]);
    }
  }
}