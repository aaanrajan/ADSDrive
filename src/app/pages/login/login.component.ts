import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { FileService } from "../../shared/service/file.service";
import { finalize } from "rxjs";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { AlertService } from "../../shared/alert-service/alert.service";
import { DriveConfig } from "../../shared/config/drive.config";
import { AppStorageService } from "../../shared/service/app-storage.service";
import { SharedService } from "../../shared/shared.service";
import { ElectronFileService } from "../../shared/service/electron.service";
import { TranslateService } from '@ngx-translate/core';
import { environment } from "../../../environments/environment";




@Component({
  standalone: false,
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.scss",
})
export class LoginComponent {
  errorMessage: any;
  loginForm!: FormGroup;
  userAgent: string = "";
  deviceName: string = "";
  deviceModel: string = "";
  os: string = "";
  browser: string = "";

  constructor(
    private _router: Router,
    private service: FileService,
    private fb: FormBuilder,
    private alertService: AlertService,
    private sharedService: SharedService,
    private electronService: ElectronFileService,
    private translate: TranslateService
  ) {
    this.translate.use('en')
    this.loginForm = this.fb.group({
      // userName: ['', Validators.required],
      userName: ["", [Validators.required, Validators.email]],
      password: ["", Validators.required],
    });
  }

  ngOnInit(): void {
    this.userAgent = navigator.userAgent;

    if (this.userAgent.includes("Chrome")) this.browser = "Chrome";
    else if (this.userAgent.includes("Firefox")) this.browser = "Firefox";
    else if (this.userAgent.includes("Safari")) this.browser = "Safari";
    else if (this.userAgent.includes("Edge")) this.browser = "Edge";
    else this.browser = "Unknown";


    if (this.userAgent.includes("Win")) this.os = "Windows";
    else if (this.userAgent.includes("Mac")) this.os = "MacOS";
    else if (this.userAgent.includes("Linux")) this.os = "Linux";
    else if (this.userAgent.includes("Android")) this.os = "Android";
    else if (this.userAgent.includes("like Mac")) this.os = "iOS";
    else this.os = "Unknown";


    if (/Mobi|Android/i.test(this.userAgent)) {
      this.deviceName = "Mobile";
    } else if (/Tablet|iPad/i.test(this.userAgent)) {
      this.deviceName = "Tablet";
    } else {
      this.deviceName = "Desktop / Laptop";
    }

    this.deviceModel = this.userAgent;

    AppStorageService.setItem("browser", this.browser);
    AppStorageService.setItem("os", this.os);
    AppStorageService.setItem("device", this.deviceName);
    AppStorageService.setItem("model", this.deviceModel);
  }
  
// Angular: login.component.ts
loginWithSSO() {
  // const clientId = 'adsdrive-a22818ac0ea84320a377c253ee9abb2e';
  // const redirectUri = `${environment.web_url}/callback`;
  // const scopes = ["openid", "profile", "email"].join(" ");

  // const authUrl =
  //   `http://localhost:8088/api/auth/sso/authorize` +
  //   `?client_id=${clientId}` +
  //   `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  //   `&response_type=code` +
  //   `&scope=${encodeURIComponent(scopes)}`;

  // window.location.href = authUrl;
}


  login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); // 🔁 triggers all validation messages
      return;
    }

    let data = {
      email: this.loginForm.get("userName")?.value,
      password: this.loginForm.get("password")?.value,
    };
    this.service
      .login(data)
      .pipe(finalize(() => { }))
      .subscribe({
        next: async (result: any) => {
          if (!result || !result.headers || !result.body) {
            this.alertService.show(
              "Invalid response from server.",
              DriveConfig.VARIANTS.DANGER
            );
            return;
          }

          const authHeader = result.headers.get("Authorization");
          const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
          // await this.sharedService.ensureUserFolder(data?.email);

          if (token) {
            const userData = result.body.user;
            const mfaList = result.body.mfaConfigs || [];

            if (mfaList?.length) {
              this._router.navigate(["/verify"], {
                state: {
                  type: "VERIFY_2FA", // or 'sso'
                  userId: userData?.id,
                  mfaList: mfaList,
                  user: userData,
                  token: token,
                },
              });
            } else {
              AppStorageService.setItem("token", token);
              AppStorageService.setItem("userId", userData?.id || "");
              AppStorageService.setItem("email", userData?.email || "");
              AppStorageService.setItem("userName", userData?.firstName  || "");
              AppStorageService.setItem("lastName", userData?.lastName  || "");
              if (this.sharedService.isElectron()) {
                this.electronService.loadConfig().then((config: any) => {
                  if (!config || !config.folderPath) {
                    this._router.navigate(["/drive/setting"]);
                    return;
                  }
                  this.electronService.startWatching(userData?.id, userData?.email);
                });
              }
              const shareLink = AppStorageService.getItem("shareLink");


              if (shareLink) {
                AppStorageService.removeItem("shareLink");
                this._router.navigate(["/share", encodeURIComponent(shareLink)]); // ✅ Reconstruct URL
              } else {
                this._router.navigate(["/drive/home"]);
              }
            }
          } else {
            this.alertService.show(
              "Login failed. Missing token.",
              DriveConfig.VARIANTS.DANGER
            );
          }
        },
        error: (err: any) => {
          if (err.status === 401) {
            this.alertService.show(
              "Invalid username or password.",
              DriveConfig.VARIANTS.DANGER
            );
          } else if (err.status === 0) {
            this.alertService.show(
              "Network error. Please check your internet connection.",
              DriveConfig.VARIANTS.DANGER
            );
          } else if (err.status >= 500) {
            this.alertService.show(
              "Internal server error. Please try again later.",
              DriveConfig.VARIANTS.DANGER
            );
          } else {
            this.alertService.show(
              "Something went wrong. Please try again.",
              DriveConfig.VARIANTS.DANGER
            );
          }
        },
      });
  }

  onInputChange(event: any, controlName: string): void {
    const value = (event.target as HTMLInputElement).value;
    // this.loginForm.get(controlName)?.setValue(value);
    const control = this.loginForm.get(controlName);
    control?.setValue(value);
    control?.markAsTouched();
  }
}
