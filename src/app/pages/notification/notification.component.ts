import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, OnInit, Output, ViewChild } from '@angular/core';
import { AppStorageService } from '../../shared/service/app-storage.service';
import { FileService } from '../../shared/service/file.service';

@Component({
  selector: 'app-notification',
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss'],
})
export class NotificationComponent implements OnInit {

  @ViewChild('notificationMenu', { read: ElementRef })
  notificationMenu!: ElementRef;

  @Output() closePanel = new EventEmitter<void>();

  notificationTab: 'all' | 'unread' = 'all';
  showNotificationDropdown = false;
  notifications: any[] = [];
  /** ✅ SKELETON FLAG */
  isLoading = false;
  isMobile = false;
   menuPosition = {
    top: 0,
    left: 0
  };

  constructor(private fileService: FileService) { }

  ngOnInit() {
    this.loadAllNotifications(); // Default load ALL
    this.checkMobile();
  }
  @HostListener('window:resize')
  checkMobile() {
    this.isMobile = window.innerWidth < 640; // Tailwind sm breakpoint
  }

  closeNotifications() {
    this.closePanel.emit(); 
  }

  //  TAB SWITCH HANDLER
  switchTab(tab: 'all' | 'unread') {
    this.notificationTab = tab;

    if (tab === 'all') {
      this.loadAllNotifications();
    } else {
      this.loadUnreadNotifications();
    }
  }

  // MARK ALL AS READ API
  markAllAsRead() {
    const userId = AppStorageService.getItem("userId");
     this.isLoading = true;
     this.fileService.getNotificationmark(userId).subscribe({
      next: (res: any) => {
        // After marking as read, reload notifications based on current tab
        if (this.notificationTab === 'all') {
          this.loadAllNotifications();
        } else {
          this.loadUnreadNotifications();
        }
              this.isLoading = false;

      },
      error: (err) =>{ console.error(err)
              this.isLoading = false;
      }
    });
  }

  // LOAD ALL NOTIFICATIONS API
  loadAllNotifications() {
    const userId = AppStorageService.getItem("userId");
    this.isLoading = true;
    this.fileService.getNotification(userId).subscribe({
      next: (res: any) => {
        this.notifications = this.formatNotifications(res.data || []);
        this.isLoading = false;
      },
      error: (err) => { console.error(err)
       this.isLoading = false;
      }
    });
  }

  loadUnreadNotifications() {
    const userId = AppStorageService.getItem("userId");
    this.isLoading = true;

    this.fileService.getNotificationunread(userId).subscribe({
      next: (res: any) => {
        this.notifications = this.formatNotifications(res.data || []);
        this.isLoading = false;
      },
      error: (err) => {console.error(err)
        this.isLoading = false;
      }
    });
  }

  formatNotifications(list: any[]) {
    return list.map(n => ({
      id: n.id, // IMPORTANT for API actions
      userName: n.sharedByName || n.user || 'You',
      message: n.message || '',
      timeAgo: n.timeAgo || '',
      profile: n.profileImage || null,
      markAsViewed: n.markAsViewed,
      showMenu: false
    }));
  }


deleteNotification(notification: any) {

  // close menu
console.log('Close menu for notification:', this.notifications);
  // find index by unique id
  const index = this.notifications.findIndex(
    n => n.id === notification.id
  );

  // remove from array (UI updates instantly)
  if (index !== -1) {
    this.notifications.splice(index, 1);
  }
  console.log('Delete notification:', this.notifications);
  //  Later backend API goes here
  // this.notificationService.delete(notification.id).subscribe()
}

toggleMenu(n: any, event: MouseEvent) {
  event.stopPropagation();

  this.notifications.forEach(x => {
    if (x !== n) x.showMenu = false;
  });

  n.showMenu = !n.showMenu;

  if (n.showMenu) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    const menuWidth = 180;
    const screenWidth = window.innerWidth;

    let left = rect.right - menuWidth;
    if (left < 8) left = 8;

    this.menuPosition = {
      top: rect.bottom + 6,
      left
    };
  }
}



toggleRead(notification: any) {
  const userId = AppStorageService.getItem("userId");

    const payload = {
    id: notification.id,
    markAsViewed: true
    };
  // Backend only supports MARK AS READ
  if (!notification.markAsViewed) {
    this.fileService.getNotificationmark(userId).subscribe({
      next: () => {
        notification.markAsViewed = true;
        notification.showMenu = false;

        // If in UNREAD tab, remove it
        if (this.notificationTab === 'unread') {
          this.notifications = this.notifications.filter(n => n !== notification);
        }
      },
      error: err => console.error(err)
    });
  } else {
    // Mark as UNREAD (UI-only)
    notification.markAsViewed = false;
    notification.showMenu = false;
  }
}


  toggleNotificationDropdown() {
    this.showNotificationDropdown = !this.showNotificationDropdown;
  }

  // @HostListener('document:click', ['$event'])
  // @HostListener('document:touchstart', ['$event'])
  // onClickOutside(event: MouseEvent | TouchEvent) {
  //   if (!this.notificationMenu) return;

  //   const target = event.target as HTMLElement;

  //   if (!this.notificationMenu.nativeElement.contains(target)) {
  //     this.showNotificationDropdown = false;
  //   }
  //   this.notifications.forEach(n => n.showMenu = false);
  //  }

  @HostListener('document:click', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  onClickOutside(event: MouseEvent | TouchEvent) {

    const target = event.target as HTMLElement;

    /* 1️⃣ Close notification dropdown */
    if (this.notificationMenu &&
      !this.notificationMenu.nativeElement.contains(target)) {
      this.showNotificationDropdown = false;
    }

    /* 2️⃣ Close all notification 3-dot menus */
    this.notifications.forEach(n => n.showMenu = false);
  }

}

