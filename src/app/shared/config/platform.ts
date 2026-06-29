export class AppPlatform {
  static isElectron = window.electronAPI?.isElectron;
  static isMobile = /android|ios/i.test(navigator.userAgent);
  static isWeb = !AppPlatform.isElectron && !AppPlatform.isMobile;

  // Helper for TS logic
  static hideFor(platform: 'electron' | 'mobile' | 'web'): boolean {
    if (platform === 'electron') return AppPlatform.isElectron;
    if (platform === 'mobile') return AppPlatform.isMobile;
    if (platform === 'web') return AppPlatform.isWeb;
    return false;
  }
}
