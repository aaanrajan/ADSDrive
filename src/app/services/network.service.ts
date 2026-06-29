import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, Observable } from 'rxjs';
import { mapTo } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class NetworkService {
  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public online$: Observable<boolean> = this.onlineSubject.asObservable();

  constructor(private ngZone: NgZone) {
    // Listen to browser online/offline events
    merge(
      fromEvent(window, 'online').pipe(mapTo(true)),
      fromEvent(window, 'offline').pipe(mapTo(false))
    ).subscribe((status) => {
      this.ngZone.run(() => this.onlineSubject.next(status));
    });
  }

  /** Current network status */
  isOnline(): boolean {
    return this.onlineSubject.value;
  }
}
