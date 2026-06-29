import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FileService } from '../../shared/service/file.service';
import { AlertService } from '../../shared/alert-service/alert.service';
import { DriveConfig } from '../../shared/config/drive.config';
import { AppStorageService } from '../../shared/service/app-storage.service';

@Component({
  standalone: false,
selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
forgotPasswordForm!: FormGroup
  constructor(
    private _router: Router,
    private service: FileService,
    private fb: FormBuilder,
    private alertService: AlertService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

onInputChange(event: any, controlName: string) {
  this.forgotPasswordForm.get(controlName)?.setValue(event.target.value);
}

sendResetLink() {
  if (this.forgotPasswordForm.valid) {
    const email = this.forgotPasswordForm.value.email;
    AppStorageService.setItem('userEmail', email);
     this.service.sendResetLink(email).subscribe({
      next: (result: any) => {
        if (result.data.success === true) {
          this.alertService.show('OTP sent to Email Successfully!', DriveConfig.VARIANTS.SUCCESS);
          this._router.navigateByUrl('/otp-screen');
        } else {
          this.alertService.show('Failed to sent OTP!', DriveConfig.VARIANTS.DANGER);
        }
      },
      error: (err: any) => {
          if (err.status === 404) {
             this.alertService.show('EmailId not exists.',  DriveConfig.VARIANTS.DANGER);
          } else if (err.status === 0) {
            this.alertService.show('Network error. Please check your internet connection.',  DriveConfig.VARIANTS.DANGER);
          } else if (err.status >= 500) {
            this.alertService.show('Internal server error. Please try again later.',  DriveConfig.VARIANTS.DANGER);
          } else {
            this.alertService.show('Something went wrong. Please try again.',  DriveConfig.VARIANTS.DANGER);
          }
        }
    });
  }
}

}
