import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FileService } from '../../shared/service/file.service';
import { AlertService } from '../../shared/alert-service/alert.service';
import { DriveConfig } from '../../shared/config/drive.config';
import { AppStorageService } from '../../shared/service/app-storage.service';

@Component({
  standalone: false,
selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent {
  passwordForm!: FormGroup;
  errorMessage = '';
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  type: 'CHANGE_PASSWORD' | 'RESET_PASSWORD' = 'RESET_PASSWORD';

  constructor(private fb: FormBuilder,
    private serviceProvider: FileService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const typeParam = params['type'];
      if (typeParam === 'CHANGE_PASSWORD' || typeParam === 'RESET_PASSWORD') {
        this.type = typeParam as 'CHANGE_PASSWORD' | 'RESET_PASSWORD';
      }
      this.initializeForm();
      this.passwordForm.get('confirmPassword')?.valueChanges.subscribe(() => {
        if (this.passwordForm.hasError('passwordMismatch')) {
          this.errorMessage = '';
        }
      });

      // Optional: Clear error if newPassword changes
      this.passwordForm.get('newPassword')?.valueChanges.subscribe(() => {
        if (this.passwordForm.hasError('passwordMismatch')) {
          this.errorMessage = '';
        }
      });
    });
  }

  initializeForm() {
    if (this.type === 'CHANGE_PASSWORD') {
      this.passwordForm = this.fb.group({
        oldPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8),Validators.pattern(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/)
        ]]
,
        confirmPassword: ['', Validators.required]
      });
    } else {
      this.passwordForm = this.fb.group({
        newPassword: ['', [Validators.required,Validators.minLength(8),Validators.pattern(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/)
        ]],
        confirmPassword: ['', Validators.required]
      });
    }
  }
  

  onInputChange(event: Event, controlName: string) {
    const inputElement = event.target as HTMLInputElement;
    const control = this.passwordForm.get(controlName);
    control?.setValue(inputElement.value); // ✅ Fix here
    control?.markAsTouched();
    control?.updateValueAndValidity();

    // Clear password mismatch error dynamically
    const { newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword && confirmPassword && newPassword === confirmPassword) {
      this.errorMessage = '';
    }
  }

  preventSpace(event: KeyboardEvent) {
    if (event.key === ' ') {
      event.preventDefault();
    }
  }

  toggleVisibility(field: string) {
    if (field === 'old') this.showOldPassword = !this.showOldPassword;
    else if (field === 'new') this.showNewPassword = !this.showNewPassword;
    else if (field === 'confirm') this.showConfirmPassword = !this.showConfirmPassword;
  }

  submitPasswordChange() {
    this.errorMessage = '';

    const formValues = this.passwordForm.value;

    if (this.type !== 'CHANGE_PASSWORD') {
      if (formValues.newPassword !== formValues.confirmPassword) {
        this.errorMessage = 'New Password and Confirm Password do not match.';
        return;
      }
      this.resetPassword(formValues.newPassword);
    } else {
      if (formValues.newPassword === formValues.oldPassword) {
        this.errorMessage = 'New Password and Old Password should not be same.';
        return;
      }
       if (formValues.confirmPassword !== formValues.newPassword) {
        this.errorMessage = 'New Password and Confirm Password do not match.';
        return;
      }
      this.changePassword(formValues.oldPassword, formValues.newPassword);
    }
  }

  changePassword(oldPassword: string, newPassword: string) {

    const email = AppStorageService.getItem("email");

    const data = {
      emailId: email,
      oldPassword: oldPassword,
      password: newPassword
    };

    this.serviceProvider.updatChangePassword(data).subscribe({
      next: (result: any) => {
        if (result.data.success === true) {
          this.alertService.show('Password Updated Successfully!', DriveConfig.VARIANTS.SUCCESS);
          this.router.navigateByUrl('/drive/home')
        } else {
          this.alertService.show('Check with the Old Password Entered!', DriveConfig.VARIANTS.DANGER);
        }
      },
      error: (err: any) => {
        if (err.status === 400) {
          this.alertService.show('Bad Request. Check with Request passed.', DriveConfig.VARIANTS.DANGER);
        } else if (err.status === 0) {
          this.alertService.show('Network error. Please check your connection.', DriveConfig.VARIANTS.DANGER);
        } else {
          this.alertService.show('Failed to Update Password!', DriveConfig.VARIANTS.DANGER);
        }
      }
    });

  }

  resetPassword(newPassword: string) {

    const email = AppStorageService.getItem('email')

    const data = {
      email: email,
      newPassword: newPassword
    }
    this.serviceProvider.updateForgotPassword(data).subscribe({
      next: (result: any) => {
        if (result.data.success === true) {
          this.alertService.show('Password Updated Successfully!', DriveConfig.VARIANTS.SUCCESS);
          AppStorageService.clear();
          this.router.navigateByUrl('/login');
        } else {
          this.alertService.show('Failed to Update Password!', DriveConfig.VARIANTS.DANGER);
        }
      },
      error: (err: any) => {
        if (err.status === 400) {
          this.alertService.show('Bad Request. Check with Request passed.', DriveConfig.VARIANTS.DANGER);
        } else if (err.status === 0) {
          this.alertService.show('Network error. Please check your connection.', DriveConfig.VARIANTS.DANGER);
        } else {
          this.alertService.show('Failed to Update Password!', DriveConfig.VARIANTS.DANGER);
        }
      }
    });
  }

}
