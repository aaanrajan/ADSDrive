// alert-host.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AlertService, AlertMessage } from './alert.service';
import { DriveConfig, Variant } from '../config/drive.config';

@Component({
  standalone: false,
selector: 'app-alert-host',
  templateUrl: './alert-host.component.html',
})
export class AlertHostComponent implements OnInit {
  alert: AlertMessage | null = null;
    
  constructor(private alertService: AlertService, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.alertService.alert$.subscribe(alert => {
      this.alert = alert;
       this.cd.detectChanges();
    });
  }

  getIcon(variant: string) {
    switch (variant) {
      case 'success': return 'check-circle';
      case 'danger': return 'x-circle';
      case 'warning': return 'exclamation-triangle';
      default: return 'info-circle';
    }
  }
getBgColor(variant: Variant): string {
  switch (variant) {
    case DriveConfig.VARIANTS.SUCCESS: return '#d1fae5';
    case DriveConfig.VARIANTS.DANGER: return '#fee2e2';
    case DriveConfig.VARIANTS.WARNING: return '#fef3c7';
    case DriveConfig.VARIANTS.INFO: return '#e0f2fe';
    default: return '#f9fafb'; // fallback
  }
}



}
