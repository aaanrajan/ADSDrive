// viewport.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ViewportService {
  constructor() {
    this.setVh();
    window.addEventListener('resize', this.setVh);
  }

  private setVh() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
}
