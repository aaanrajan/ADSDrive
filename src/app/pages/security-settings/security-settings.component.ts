import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FileService } from '../../shared/service/file.service';
import { AlertService } from '../../shared/alert-service/alert.service';
import { DriveConfig } from '../../shared/config/drive.config';
import { AppStorageService } from '../../shared/service/app-storage.service';

@Component({
  standalone: false,
selector: 'app-security-settings',
  templateUrl: './security-settings.component.html',
  styleUrl: './security-settings.component.scss'
})
export class SecuritySettingsComponent {

  // Step controls
  passwordPage = true;
  recoveryEmailPage = false;
  qrCodePage = false; // prepare for next step
  errorMessage: string = '';

  // Form groups
  passwordForm!: FormGroup;
  recoveryEmailForm!: FormGroup;

  constructor(private fb: FormBuilder, private router: Router , private service: FileService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.passwordForm = this.fb.group({
      accountPassword: ['', Validators.required],
    });

    this.recoveryEmailForm = this.fb.group({
      recoveryEmail: ['', [Validators.required, Validators.email]],
    });

    this.passwordForm.get('accountPassword')?.valueChanges.subscribe(() => {
    this.errorMessage = ''; 
  });
  }

  // Step 1: Password → Recovery Email
  goToRecoveryEmailPage() {
    const password = this.passwordForm.get('accountPassword')?.value;
    const email = AppStorageService.getItem("email");

    const data = {
      email: email,
      password: password,
    };

    this.service.login(data).subscribe({
      next: (response) => {
        if (response) {
          this.passwordPage = false;
          this.recoveryEmailPage = true;
        } else {
          this.alertService.show("Check with password entered.", DriveConfig.VARIANTS.DANGER)
        }
      },
      error: (err) => {
        if (err.status === 401) {
          this.alertService.show('Check with password entered.', DriveConfig.VARIANTS.DANGER);
        } else if (err.status === 0) {
          this.alertService.show('Network error. Please check your internet connection.', DriveConfig.VARIANTS.DANGER);
        } else if (err.status >= 500) {
          this.alertService.show('Internal server error. Please try again later.', DriveConfig.VARIANTS.DANGER);
        } else {
          this.alertService.show('Something went wrong. Please try again.', DriveConfig.VARIANTS.DANGER);
        }
      }
    });
  }

  // Step 2: Recovery Email → QR Code (or any next step)
  goToQrCodePage(): void {
    if (this.recoveryEmailForm.valid) {
      const email = this.recoveryEmailForm.value.recoveryEmail;
      console.log('Recovery Email submitted:', email);

      this.recoveryEmailPage = false;
      this.qrCodePage = true;

      // You can now call API to get QR code here if needed
    }
  }

  cancelBtn() {
  this.passwordPage = true;
  this.recoveryEmailPage = false;
  this.qrCodePage = false;
  this.router.navigate(['/drive/home']);

  // Optionally clear forms
  this.passwordForm.reset();
  this.recoveryEmailForm.reset();
}

}
