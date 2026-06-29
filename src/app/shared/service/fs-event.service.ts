// src/app/services/fs-event.service.ts
import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FsEvent {
  type: string;
  path?: string;
  oldPath?: string;
  newPath?: string;
  timestamp?: number;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class FsEventService {
  private _events = new BehaviorSubject<FsEvent | null>(null);
  public events$: Observable<FsEvent | null> = this._events.asObservable();

  constructor(private ngZone: NgZone) {
    if (window?.electronAPI?.ipcRenderer) {
      window.electronAPI.ipcRenderer.on('fs-event', (_: any, payload: FsEvent) => {
        // ensure Angular change detection picks it up
        this.ngZone.run(() => {
          this._events.next(payload);
        });
      });
    } else {
      console.warn('ipcRenderer not exposed; filesystem events unavailable.');
    }
  }
}
