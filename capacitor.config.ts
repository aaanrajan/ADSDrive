import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ads.adsdrive',
  appName: 'Ads Drive',
  webDir: 'dist/ads-drive/browser',

 plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#ffffffff",
    },
  },
  // server: {
  //   url: 'https://drive.adstest.io',
  //   cleartext: true
  // }
};

export default config;
