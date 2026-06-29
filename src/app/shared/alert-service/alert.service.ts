// alert.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Variant } from '../config/drive.config';


export interface AlertMessage {
  message: string;
  variant: Variant;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private alertSubject = new Subject<AlertMessage>();
  alert$ = this.alertSubject.asObservable();

  show(message: string, variant: AlertMessage['variant'] = 'primary', duration = 3000) {
    this.alertSubject.next({ message, variant, duration });
  }
}
