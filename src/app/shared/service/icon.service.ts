// icon.service.ts
import { Injectable } from '@angular/core';
import { iconLibrary } from '@shoelace-style/shoelace/dist/utilities/icon-library.js';

@Injectable({ providedIn: 'root' })
export class IconService {
  constructor() {
    this.registerIcons();
  }

  registerIcons() {
    iconLibrary.registerIcon('custom-folder', async () => {
      const response = await fetch('assets/icons/folder.svg');
      return await response.text();
    });
  }
}
