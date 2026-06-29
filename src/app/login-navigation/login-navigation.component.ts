import { Component, ElementRef, QueryList, ViewChildren } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FileService } from "../../shared/service/file.service";
import { AppStorageService } from "../../shared/service/app-storage.service";
import { AlertService } from "../../shared/alert-service/alert.service";
import { DriveConfig } from "../../shared/config/drive.config";
import { FormBuilder, FormGroup, FormControl } from "@angular/forms";
import { Location } from "@angular/common";
import { SharedService } from "../../shared/shared.service";
import { ElectronFileService } from "../../shared/service/electron.service";

@Component({
  standalone: false,
selector: "app-login-navigation",
  templateUrl: "./login-navigation.component.html",
  styleUrl: "./login-navigation.component.scss",
})
export class LoginNavigationComponent {
  isLoading: boolean = false;
  isError: boolean = false;
  type: "SSO" | "VERIFY_2FA" = "SSO";
  userId: any;
  mfaList: any[] = [];
  selectedMfa: any;
  mfaVerified: boolean = true;
  otpForm!: FormGroup;
  otpLength = 4;
  userData: any;
  token: any;
  resendTimer: number = 60;
  isResendDisabled: boolean = true;
  resendInterval: any;
  otpType: "WHATSAPP" | "EMAIL" = "WHATSAPP";
  otpSentMessage = "We sent a 4-digit code to your WhatsApp.";
  isSendEmailDisabled = false;
  @ViewChildren("otpInput") otpInputs!: QueryList<ElementRef>;

  constructor(
    private route: ActivatedRoute,
    private service: FileService,
    private router: Router,
    private alertService: AlertService,
    private fb: FormBuilder,
    private location: Location,
    private sharedService: SharedService,
    private electronService: ElectronFileService

  ) { }

  ngOnInit() {
    const controls: { [key: string]: FormControl } = {};
    for (let i = 0; i < this.otpLength; i++) {
      controls[`digit${i}`] = new FormControl("");
    }
    this.otpForm = this.fb.group(controls);
    this.isLoading = true;
    this.isError = false;
    // Step 1: Get token from query params
    let queryToken = this.route.snapshot.queryParamMap.get("token");
    const navState = history.state;
    if (queryToken) {
      AppStorageService.setItem("ssoToken", queryToken);
      AppStorageService.removeItem("apiattempt");
      this.location.replaceState("/sso"); // <-- remove ?token=xxx from URL
    }

    const storedToken = AppStorageService.getItem("ssoToken");
    const apiAttempted = AppStorageService.getItem("apiattempt");

    if (storedToken && !apiAttempted) {
      this.type = "SSO";
      this.service.getUserDetailsFromToken(storedToken).subscribe({
        next: (result: any) => {
          if (result?.success === true && result?.data?.user !== null) {
            this.userData = result?.data?.user;
            this.token = result?.data?.token;
            if (result?.data?.mfaList?.length) {
              this.type = "VERIFY_2FA";
              this.userId = this.userData?.id;
              this.mfaList = result?.data?.mfaList || [];
              this.sendWhatsappOtp();
            } else {
              this.verified();
            }
          } else {
            this.isLoading = false;
            this.isError = true;
            AppStorageService.setItem("apiattempt", "true");
          }
        },
        error: (err) => {
          console.error("Failed to get user details:", err);
          this.isLoading = false;
          this.isError = true;
          AppStorageService.setItem("apiattempt", "true");
        },
      });
    } else if (navState?.userId && navState?.mfaList.length) {
      this.type = "VERIFY_2FA";
      this.userId = navState?.userId;
      this.userData = navState?.user;
      this.token = navState?.token;
      this.mfaList = navState.mfaList;
      this.sendWhatsappOtp();
    } else {
      console.error("authToken missing in URL");
      this.isLoading = false;
      this.isError = true;
    }
  }

  reloadPage() {
    window.location.reload();
  }
  onOtpChange(event: any, index: number) {
    const input = event.target;
    const nextInput = input.nextElementSibling;

    if (input.value && nextInput) {
      nextInput.focus();
    }
  }
  allowNumbersOnly(event: KeyboardEvent) {
    const charCode = event.charCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  handleKeyDown(event: KeyboardEvent, index: number): void {
    const currentControl = this.otpForm.get(`digit${index}`);
    const inputs = this.otpInputs.toArray();

    if (event.key === "Backspace") {
      event.preventDefault();

      if (currentControl?.value) {
        // Just clear current value
        currentControl.setValue("");
      } else if (index > 0) {
        // Move focus back and clear previous
        const prevControl = this.otpForm.get(`digit${index - 1}`);
        prevControl?.setValue("");
        setTimeout(() => inputs[index - 1].nativeElement.focus(), 0);
      }
    }

    // Optional: Handle arrow keys
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputs[index - 1].nativeElement.focus();
    }

    if (event.key === "ArrowRight" && index < inputs.length - 1) {
      event.preventDefault();
      inputs[index + 1].nativeElement.focus();
    }
  }

  sendWhatsappOtp() {
    this.otpType = "WHATSAPP";
    this.selectedMfa = this.mfaList.find(x => x.type === "WHATSAPP");

    if (!this.selectedMfa?.contactNo) return;

    let data = {
      userId: this.userId,
      mobileNo: this.selectedMfa.contactNo,
      purpose: DriveConfig.MFA_PURPOSE.LOGIN,
    };

    this.startResendCountdown();

    this.service.sendOtpToWhatsapp(data).subscribe({
      next: () => {
        this.otpSentMessage = "We sent a 4-digit code to your WhatsApp.";
        this.alertService.show("OTP sent to WhatsApp!", "success");
      },
      error: () => this.alertService.show("Failed to send OTP", "danger"),
    });
  }
  
  sendEmailOtp() {
    this.otpType = "EMAIL";
    console.log('email:',this.userData);
    
    const email = this.userData?.email;
    if (!email) return;

    this.isSendEmailDisabled = true;
    this.startResendCountdown();

    this.service.sendResetLink(email).subscribe({
      next: () => {
        this.otpSentMessage = "We sent a 4-digit code to your mail.";
        this.alertService.show("OTP sent to your Mail!", "success");
        setTimeout(() => (this.isSendEmailDisabled = false), 15000);
      },
      error: () => {
        this.alertService.show("Failed to send Email OTP", "danger");
        this.isSendEmailDisabled = false;
      }
    });
  }

  resendOtp() {
    if (this.otpType === "WHATSAPP") {
      this.sendWhatsappOtp();
    } else {
      this.sendEmailOtp();
    }
  }

  isOtpComplete(): boolean {
    return Object.values(this.otpForm.value).every((val) => val !== "");
  }

  verifyCode() {
    const otpValue = Object.values(this.otpForm.value).join("");

    if (!otpValue || otpValue.length !== this.otpLength) {
      this.alertService.show("Please enter the full OTP.", "danger");
      return;
    }

    // -------------------------
    // ✔ VERIFY WHATSAPP / MOBILE OTP
    // -------------------------
    if (this.otpType === "WHATSAPP") {
      const data = {
        userId: this.userId,
        mobileNo: this.selectedMfa?.contactNo,
        purpose: DriveConfig.MFA_PURPOSE.LOGIN,
        otp: otpValue
      };

      this.service.validateOtpByMobileNumber(data).subscribe({
        next: (res: any) => {
          if (res?.success && res?.data?.success) {
            this.alertService.show("OTP verified!", "success");
            this.verified();
          } else {
            this.alertService.show("Invalid OTP. Please try again.", "danger");
          }
        },
        error: () => {
          this.alertService.show("Invalid OTP. Please try again.", "danger");
        }
      });

      return;
    }

    // -------------------------
    // ✔ VERIFY EMAIL OTP
    // -------------------------
    if (this.otpType === "EMAIL") {
      const email = this.userData?.email;

      this.service.validateOtp(otpValue, email).subscribe({
        next: (res: any) => {
          if (res?.data?.success === true) {
            this.alertService.show("OTP verified successfully!", "success");
            this.verified();
          } else {
            this.alertService.show("Invalid OTP. Please try again.", "danger");
          }
        }
      });

      return;
    }
  }

  verified() {
    if (!!this.userData) {
      AppStorageService.setItem("token", this.token);
      AppStorageService.setItem("userId", this.userData.id);
      AppStorageService.setItem("email", this.userData.email);
      AppStorageService.setItem("userName", this.userData.firstName);
      AppStorageService.setItem("lastName", this.userData.lastName);
      AppStorageService.setItem(
        "userType",
        !!this.userData?.userType ? this.userData.userType : null
      );
      if (this.sharedService.isElectron()) {
        this.electronService.loadConfig().then((config: any) => {
          if (!config || !config.folderPath) {
            this.router.navigate(["/drive/setting"]);
            return;
          }
        });
        this.electronService.startWatching(this.userData?.id, this.userData?.email);
      }
      const shareLink = AppStorageService.getItem("shareLink");

      if (shareLink) {
        AppStorageService.removeItem("shareLink");
        this.router.navigate(["/share", shareLink]); // ✅ Reconstruct URL
      } else {
        this.router.navigate(["/drive/home"]);
      }
      // this.router.navigate(["/drive/home"]);
    }
  }

  startResendCountdown() {
    this.isResendDisabled = true;
    this.resendTimer = 60;
    this.resendInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        this.isResendDisabled = false;
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }
}
