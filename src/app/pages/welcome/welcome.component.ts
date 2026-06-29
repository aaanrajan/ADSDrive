import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppStorageService } from '../../shared/service/app-storage.service';
import { FileService } from '../../shared/service/file.service';
import { Router } from '@angular/router';
import { SharedService } from '../../shared/shared.service';
@Component({
  selector: 'app-welcome',
  standalone: false,
  templateUrl: './welcome.component.html',
  styles: `@keyframes float {

    0%,
    100% {
        transform: translateY(0px) rotate(0deg);
    }

    50% {
        transform: translateY(-10px) rotate(2deg);
    }
}

/* On mobile, shrink the entire visualization slightly to prevent overflow */
@media (max-width: 768px) {
    .float-animation {
        transform: scale(0.8);
    }
}`
})
export class WelcomeComponent {
  currentSlide = 0;
  activeIndex = 0;
  isMenuOpen = false;
  isProductsOpen = false;
  private timer: any;
  sub!: Subscription;
  isElectron: boolean = false;
  stats = [
    { label: 'Uptime', value: '99.9%' },
    { label: 'Encryption', value: '256-bit' },
    { label: 'Notifications', value: 'Instant' },
    { label: 'Labels', value: 'Unlimited' }
  ];

  syncFeatures = [
    { icon: 'fas fa-cloud-upload-alt', title: 'Secure File Uploads' },
    { icon: 'fas fa-folder-open', title: 'Smart Folder Organization' },
    { icon: 'fas fa-share-alt', title: 'Easy File Sharing' },
    { icon: 'fas fa-user-shield', title: 'Role-Based Access Control' },
    { icon: 'fas fa-database', title: 'Automatic Cloud Backup' },
    { icon: 'fas fa-lock', title: 'AES-256 Data Encryption' }
  ];
  logined = AppStorageService.getItem('token') ? true : false;
  isSwitchOpen: boolean = true;
  showProfileDropdown: any;
  fullName = AppStorageService.getItem('userName');
  email = AppStorageService.getItem('email');
  otherSessions: any[] = [];
  sessionList: any;

  constructor(private cdr: ChangeDetectorRef, private service: FileService, private shared: SharedService ,private _router: Router) {
    this.isElectron = this.shared.isElectron();
   }

  ngOnInit() {
    this.startAutoSlide();
    this.getSessions();

  }

  goToMyfiles() {
    this._router.navigate(['/drive/home'])
  }

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

  toggleProfileDropdown() {
    this.showProfileDropdown = !this.showProfileDropdown;
  }
  addAccount() {
    window.location.href = environment.service_url + '/auth/bootstrap?prompt=login';
  }
  toggleSwitch() {
    this.isSwitchOpen = !this.isSwitchOpen;
  }
  closeSwitch() {
    this.isSwitchOpen = false;
  }

  trackBySession(index: number, session: any) {
    return session.sessionId;
  }

  @ViewChild('switchHandler') switchHandler!: any;
  switchAccount(session: any, isLogout: boolean = false) {
    this.switchHandler.switchAccount(session, isLogout);
  }

  handlePostLogoutSession() {
    this.service.getSessions().subscribe({

      next: (sessions: any[]) => {

        const otherSessions = sessions.filter(
          (s: any) => !s.isCurrentSession && s.isActive
        );

        if (otherSessions.length === 0) {
          this.logout();

        } else {
          this.switchAccount(otherSessions[0], true);
        }
      },

      error: (err) => {

        console.error('Session fetch failed', err);

        this.logout();

      }

    });
  }

  logout() {
    AppStorageService.clear();
    this.service.clearUploadTasks();
    this._router.navigate(["/home"]);
  }

  startAutoSlide() {
    this.sub = interval(6000).subscribe(() => {
      this.activeIndex = (this.activeIndex + 1) % 3;
      this.cdr.markForCheck();
    });
  }


  setSlide(index: number) {
    this.activeIndex = index;
    clearInterval(this.timer);
    this.startAutoSlide();
  }

  toggleMenu() { this.isMenuOpen = !this.isMenuOpen; }
  toggleProducts() { this.isProductsOpen = !this.isProductsOpen; }
  closeMenu() { this.isMenuOpen = false; this.isProductsOpen = false; }

  get bgGradient(): string {
    const gradients = [
      'from-white via-primary-50 to-indigo-100',
      'from-white via-indigo-50 to-purple-100',
      'from-white via-cyan-50 to-emerald-100'
    ];
    return gradients[this.activeIndex];
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    // this.sub?.unsubscribe();
  }

  faqs = [
    {
      q: 'What is Ads Drive?',
      a: 'Ads Drive is a secure cloud storage platform that allows businesses and individuals to store, manage, and access files safely from anywhere.'
    },
    {
      q: 'How secure is Ads Drive?',
      a: 'Ads Drive uses AES-256 encryption, secure cloud infrastructure, and role-based access controls to ensure your data remains fully protected.'
    },
    {
      q: 'Can I share files with my team?',
      a: 'Yes. You can securely share files and folders with customizable permission levels such as view, edit, or admin access.'
    },
    {
      q: 'Does Ads Drive provide automatic backups?',
      a: 'Absolutely. Ads Drive offers automatic cloud backup and version history to prevent accidental data loss.'
    },
    {
      q: 'Can I access my files from multiple devices?',
      a: 'Yes. Ads Drive is accessible from desktop, tablet, and mobile devices, allowing you to manage your files anytime, anywhere.'
    }
  ];
  // Optional: Logic to handle the accordion toggle
  faqIndex: number | null = null;

  toggleFaq(index: number) {
    this.faqIndex = this.faqIndex === index ? null : index;
  }
  // Define positions by degrees (0-360) for the rings
  innerRing = [
    { name: 'A', color: 'bg-blue-500', angle: 45 },
    { name: 'B', color: 'bg-slate-300', angle: 180 },
    { name: 'C', color: 'bg-sky-400', angle: 300 }
  ];

  outerRing = [
    { name: 'D', color: 'bg-blue-700', angle: 0 },
    { name: 'E', color: 'bg-slate-200', angle: 72 },
    { name: 'F', color: 'bg-blue-400', angle: 144 },
    { name: 'G', color: 'bg-slate-400', angle: 216 },
    { name: 'H', color: 'bg-sky-500', angle: 288 }
  ];
  // Define positions for left and right side avatars
  nodes = [
    // Left side
    { top: '15%', left: '10%', color: 'bg-blue-400' },
    { top: '45%', left: '5%', color: 'bg-sky-400' },
    { top: '75%', left: '12%', color: 'bg-indigo-400' },
    // Right side
    { top: '15%', left: '80%', color: 'bg-blue-500' },
    { top: '48%', left: '85%', color: 'bg-cyan-500' },
    { top: '78%', left: '75%', color: 'bg-blue-600' }
  ];
  participants = [
    { id: '01', color: 'bg-blue-500/20', pos: 'top-[15%] left-[20%]', delay: '0s' },
    { id: '02', color: 'bg-indigo-500/20', pos: 'top-[20%] right-[25%]', delay: '1.5s' },
    { id: '03', color: 'bg-blue-600/20', pos: 'bottom-[20%] left-[25%]', delay: '3s' },
    { id: '04', color: 'bg-slate-700/20', pos: 'bottom-[15%] right-[20%]', delay: '4.5s' }
  ];

  login() {
    window.location.href = environment.service_url + '/auth/bootstrap?prompt=login';

  }

  scrollToSection(sectionId: string): void {

    const element = document.getElementById(sectionId);
    if (element) {
      // Get navbar height dynamically
      const navbar = document.querySelector('nav');
      const navbarHeight = navbar ? navbar.offsetHeight : 80;

      // Add extra offset for mobile menu if open
      const mobileMenuOffset = this.isMenuOpen ? 200 : 0;

      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navbarHeight - mobileMenuOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Close mobile menu after scrolling
      setTimeout(() => {
        this.closeMenu();
      }, 100);
    }

  }
  handleNav(sectionId: string) {
    setTimeout(() => {
      this.scrollToSection(sectionId);
    }, 0);
  }

}