import { Component, ElementRef, QueryList, ViewChildren, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { FileService } from '../../shared/service/file.service';
import { AlertService } from '../../shared/alert-service/alert.service';
import { DriveConfig } from '../../shared/config/drive.config';
import { Router } from '@angular/router';
import { AppStorageService } from '../../shared/service/app-storage.service';

@Component({
  standalone: false,
  selector: 'app-otp-screen',
  templateUrl: './otp-screen.component.html',
  styleUrls: ['./otp-screen.component.scss'] 
})
export class OtpScreenComponent implements OnInit {

  otpForm!: FormGroup;
  otpLength = 4;
  @ViewChildren("otpInput") otpInputs!: QueryList<ElementRef>;

  resendTimer: number = 60;
  isResendDisabled: boolean = true;
  resendInterval: any;

  constructor(
    private fb: FormBuilder,
    private service: FileService,
    private alertService: AlertService,
    private router: Router
  ) {
    
    const controls: { [key: string]: FormControl } = {};
    for (let i = 0; i < this.otpLength; i++) {
      controls[`digit${i}`] = new FormControl("", Validators.required);
    }
    this.otpForm = this.fb.group(controls);
  }

  ngOnInit() {
    this.startResendCountdown();
  }

  allowNumbersOnly(event: KeyboardEvent) {
    const charCode = event.charCode || event.which;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

 
  onOtpChange(event: any, index: number) {
    const input = event.target;
    const nextInput = input.nextElementSibling;

    if (input.value && nextInput) {
      nextInput.focus();
    }
  }

 
  handleKeyDown(event: KeyboardEvent, index: number): void {
    const currentControl = this.otpForm.get(`digit${index}`);
    const inputs = this.otpInputs.toArray();

    if (event.key === "Backspace") {
      event.preventDefault();

      if (currentControl?.value) {
        currentControl.setValue("");
      } else if (index > 0) {
        const prevControl = this.otpForm.get(`digit${index - 1}`);
        prevControl?.setValue("");
        setTimeout(() => inputs[index - 1].nativeElement.focus(), 0);
      }
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputs[index - 1].nativeElement.focus();
    }

    if (event.key === "ArrowRight" && index < inputs.length - 1) {
      event.preventDefault();
      inputs[index + 1].nativeElement.focus();
    }
  }


  isOtpComplete(): boolean {
    return Object.values(this.otpForm.value).every((val) => val !== "");
  }

  
  verifyOtp() {
    console.log('Verify clicked', this.otpForm.value);

    if (this.otpForm.valid) {
      const otpValue = Object.values(this.otpForm.value).join("");
      const email = AppStorageService.getItem('userEmail');
      this.service.validateOtp(otpValue, email).subscribe({
        next: (res: any) => {
          if (res?.data?.success === true) {
            this.alertService.show('OTP Validation Successful!', DriveConfig.VARIANTS.SUCCESS);
            /Added query param type if needed */
            this.router.navigateByUrl('/change-password?type=RESET_PASSWORD');
          } else {
            this.alertService.show('OTP Validation Failed!', DriveConfig.VARIANTS.DANGER);
          }
        },
        error: () => {
          this.alertService.show('OTP Validation Failed!', DriveConfig.VARIANTS.DANGER);
        }
      });
    }
  }

  /** resend OTP logic */
  resendOtp() {
    const email = AppStorageService.getItem('userEmail');

    this.service.sendResetLink(email).subscribe({
      next: (result: any) => {
        if (result.data.success === true) {
          this.startResendCountdown();
          this.alertService.show('OTP sent to Email Successfully!', DriveConfig.VARIANTS.SUCCESS);
        } else {
          this.alertService.show('Failed to send OTP!', DriveConfig.VARIANTS.DANGER);
        }
      },
      error: (err) => {
        if (err.status === 404) {
          this.alertService.show('EmailId not exists.', DriveConfig.VARIANTS.DANGER);
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

  startResendCountdown() {
    this.isResendDisabled = true;
    this.resendTimer = 60;
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
    this.resendInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        this.isResendDisabled = false;
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }}
