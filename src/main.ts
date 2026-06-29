import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
// import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/shoelace.js';
// import '@shoelace-style/shoelace/dist/themes/dark.css';

import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';

// Optional: You can also import individual icons if tree-shaking is important
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/drawer/drawer.js';


// Set base path to Shoelace assets (required for icons to load properly)
setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.14.0/dist/');

import { AppModule } from './app/app.module';
import { Capacitor } from '@capacitor/core';

const platform = Capacitor.getPlatform();

if (platform === 'android' || platform === 'ios') {
  document.body.classList.add('platform-native');
}

platformBrowserDynamic().bootstrapModule(AppModule, {
  ngZoneEventCoalescing: true
})
  .catch(err => console.error(err));
