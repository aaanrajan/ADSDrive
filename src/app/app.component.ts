import { Component } from "@angular/core";
import { SharedService } from "./shared/shared.service";
import { App } from '@capacitor/app';
import { Router } from '@angular/router';
import { Toast } from '@capacitor/toast';
import { AppPlatform } from "./shared/config/platform";
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from "@ngx-translate/core";
import { environment } from "../environments/environment";
import { AppStorageService } from "./shared/service/app-storage.service";

@Component({
  standalone: false,
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  title = "ads-drive";
  private backPressTime = 0;
  constructor(
    private router: Router,
    private sharedService: SharedService,
    private platform: Platform,
    private translateService: TranslateService
  ) {
    this.initializeApp();
    if (AppPlatform.isElectron) document.body.classList.add('electron');
    if (AppPlatform.isMobile) document.body.classList.add('mobile');
    if (AppPlatform.isWeb) document.body.classList.add('web');

  }
   ngOnInit() {
  
    this.translateService.use('en')
    if (this.sharedService.isAndroid) {
      App.addListener('backButton', () => {
        const currentUrl = this.router.url;

        const exitRoutes = [
          '/drive/home',
          '/drive/dashboard',
          '/login',
          '/'
        ];

        // Don't allow going back to login if already authenticated
        if (exitRoutes.includes(currentUrl)) {
          const now = new Date().getTime();

        if (this.backPressTime && now - this.backPressTime < 2000) {
          // Pressed again within 2s → exit
          App.exitApp();
        } else {
          this.backPressTime = now;
          Toast.show({
            text: 'Press back again to exit',
            duration: 'short',
            position: 'bottom',
          });
        }
        } else {
          window.history.back(); // go back in Angular history
        }
      });
    }

      const token = AppStorageService.getItem('token');
      const currentPath = window.location.pathname;
      // skip auth loop for callback/share
      if (['/callback', '/share'].some(p => currentPath.includes(p))) {
        return;
      }

      const params = new URLSearchParams(window.location.search);

      const encodedData = params.get('data');

      if (encodedData) {

        const email = atob(encodedData);

        const storedEmail = AppStorageService.getItem('email');
        
        // different user login
        if (storedEmail && storedEmail !== email) {
          this.login(true);
          return;
        }
      }

     
      if (!token) {
         AppPlatform.isElectron ? this.router.navigateByUrl('/login') : this.login();
      }
  }
  async initializeApp() {
    console.log('🟠 initializeApp() called');

    // 1️⃣ Wait for the platform to be ready
    await this.platform.ready();
    console.log('✅ Ionic Platform is ready');

    // 2️⃣ Detect Capacitor platform
    const platform = Capacitor.getPlatform(); // 'ios', 'android', or 'web'
    const isNative = Capacitor.isNativePlatform();
    console.log(`📱 Platform: ${platform} | Native: ${isNative}`);

    // 3️⃣ Add a platform CSS class to the body
    document.body.classList.add(`capacitor-${platform}`);
    console.log('🧱 Body class list:', document.body.className);

    // 4️⃣ Verify <ion-app> exists
    const appDiv = document.querySelector('ion-app');
    if (appDiv) console.log('✅ <ion-app> found');
    else console.warn('⚠️ <ion-app> not found');

    // 5️⃣ StatusBar setup (native only)
    if (!isNative) {
      console.log('🌐 Not a native platform, skipping StatusBar setup');
      return;
    }
    const appWrapper = document.querySelector('.app-wrapper');
if (appWrapper) {
  console.log('🟢 Full element:', appWrapper);
  console.log('📏 Computed styles:');
  const styles = getComputedStyle(appWrapper);
  console.log('padding-top:', styles.paddingTop);
  console.log('padding-left:', styles.paddingLeft);
  console.log('padding-right:', styles.paddingRight);
  console.log('padding-bottom:', styles.paddingBottom);
  console.log('background-color:', styles.backgroundColor);
  console.log('height:', styles.height);
  console.log('width:', styles.width);
}

    try {
      // Show the status bar
      await StatusBar.show();
      console.log('✅ StatusBar shown');

      // Set the style based on dark/light mode
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      await StatusBar.setStyle({ style: prefersDark ? Style.Dark : Style.Light });
      console.log(`✅ StatusBar style set (${prefersDark ? 'Dark' : 'Light'})`);

      // Set background color
      await StatusBar.setBackgroundColor({ color: '#ff8906' });
      console.log('✅ StatusBar background set to orange');
    } catch (err) {
      console.error('❌ StatusBar plugin error:', err);
    }

    console.log('🏁 initializeApp() finished');
  }
  
  login(isNewUser: boolean = false) {

    this.router.navigate(
      ['/callback'],
      { queryParams: { isNewUser } }
    );

    // window.location.href = environment.service_url + '/auth/bootstrap';
  }
}
