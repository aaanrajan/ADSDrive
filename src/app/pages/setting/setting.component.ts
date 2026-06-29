import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FileService } from '../../shared/service/file.service';
import { AlertService } from '../../shared/alert-service/alert.service';
import { DriveConfig } from '../../shared/config/drive.config';
import { AppStorageService } from '../../shared/service/app-storage.service';
import { ElectronFileService } from '../../shared/service/electron.service';
import { SharedService } from '../../shared/shared.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from "@angular/router";
@Component({
  standalone: false,
  selector: "app-setting",
  templateUrl: "./setting.component.html",
  styleUrl: "./setting.component.scss",
})
export class SettingComponent {
  settingsForm!: FormGroup;
  deleteAfterDays: number = 0;
  settingId: string = "";
  userId: any;
  breadcrums: any[] = [{ name: "Home" }, { name: "Settings" }];
  isMfaEnabled: boolean = false;
  phoneNumber: string = "";
  enteredOtp: string = "";
  otpSent: boolean = false;
  mfaVerified: boolean = false;
  syncFrequency: string = 'REALTIME';
  conflictResolution: string = 'KEEP_LOCAL';
  isPathValid: boolean = false;
  mfaList: any = [];
  isDesktop: boolean = false;
  recommendedDirectory: string = "";
  pathChecked: boolean = false;
  configData: any;
  activeTab: string = 'account';
  userName = AppStorageService.getItem('userName') || '';
  email = AppStorageService.getItem('email') || '';
  lastName = AppStorageService.getItem('lastName') || '';
  imageUrl:any;
  usedPercentage: number = 0;
  usedStorage = '0 B';
  totalStorage = '5 GB';
    storageBreakdown = {
    documents: 0,
    videos: 0,
    images: 0,
    audio: 0,
    zip: 0,
    others: 0
  };
    dataOccupied: any = {
    documents: 0,
    videos: 0,
    images: 0,
    audio: 0,
    zip: 0,
    others: 0
  };
   notificationKeys = [
    'runningOutOfSpace',
    'newBrowserSignIn',
    'newFeaturesUpdates',
    'onThisDayMemories',
    'deleteLargeNumberOfFiles'
  ];
    notificationSettings: any = {
    runningOutOfSpace: false,
    newBrowserSignIn: false,
    newFeaturesUpdates: false,
    onThisDayMemories: false,
    deleteLargeNumberOfFiles: false
  };
  freePercentage: number = 0;
  totalSpaceBytes: number = 0;
  totalOccupiedBytes: number = 0;
  notificationOptions: string[] = [
  "I’m running out of space",
  "A new browser is used to sign in",
  "New features and updates",
  "On this day memories are available",
  "I delete a large number of files"
  ];
  accessOptions = [
    { label: 'Anyone with the link', value: 'ANYONE' },
    { label: 'Only people in your organization', value: 'EXISTING' },
    { label: 'Specific people', value: 'CHOSEN' }
   ];

  permissionOptions = [
    { label: 'Can View', value: 'CAN_VIEW' },
    { label: 'Can Edit', value: 'CAN_EDIT' },
    { label: 'Can View & Download', value: 'VIEW_DOWNLOAD' },
    { label: "View Only (No Download)", value: 'CANT_DOWNLOAD' }
   ];

   selectedAccess: string = this.accessOptions[0].value;
   selectedPermission: string = this.permissionOptions[0].value;
   tabs = [
     { key: 'account', label: 'ACCOUNT_INFORMATION' },
     { key: 'manage', label: 'MANAGE_ACCOUNT' },
    //  { key: 'appearance', label: 'APPEARANCE' },
     { key: 'notification', label: 'NOTIFICATION' },
     { key: 'sharing', label: 'SHARING' },
     { key: 'restore', label: 'RESTORE_DATA' },
     { key: 'plans', label: 'PLANS_UPGRADES' }
   ];
   mobileActiveTab: string | null = null;
   selectedFolderName = "";
   open:boolean = false;
   selectedAccessLabel: any;
   openPermission = false;
   selectedPermissionLabel: any;


  constructor(
    private service: FileService,
    private alertService: AlertService,
    private electronService: ElectronFileService,
    private sharedService: SharedService,
    private fb: FormBuilder,
    private router: Router,
  ) {
    this.userId = AppStorageService.getItem("userId");
    this.loadMFAList();
    this.isDesktop = this.sharedService.isElectron();
  }

  ngOnInit() {
    this.loadSetting();
    const email: any = AppStorageService.getItem("email");

    this.router.routerState.root.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });
    const recommended = this.sharedService.getUserFolderPath(email);
    this.recommendedDirectory = recommended;
    this.settingsForm = this.fb.group({
      localDirectory: [recommended, Validators.required],
      syncFrequency: ['REALTIME', Validators.required],
      conflictResolution: ['KEEP_LOCAL', Validators.required],
      isDeleteCloud: [true]
    });
    if (this.isDesktop) {
      this.loadConfig()
    }
  }

  getTabLabel(key: string) {
    return this.tabs.find(t => t.key === key)?.label || '';
  }

  changePassword() {
    this.router.navigate(['/change-password']);
  }

  formatSize(sizeInBytes: number): string {
    return this.sharedService.formatSize(sizeInBytes);
  }
  setSelectedLabel() {
  const found = this.accessOptions.find(o => o.value === this.selectedAccess);
  this.selectedAccessLabel = found ? found.label : 'Select Access';
}
 setSelectedPermissionLabel() {
  const found = this.permissionOptions.find(o => o.value === this.selectedPermission);
  this.selectedPermissionLabel = found ? found.label : 'Select Permission';
}


  getTotalOccupiedSpace() {
    this.service.getStorageUsage(this.userId).subscribe((res: any) => {
      const data = res.data;
      if (data) {
        this.usedStorage = this.sharedService.formatSize(data.occupiedSpace);
        this.totalStorage = this.sharedService.formatSize(data.totalSpace);
        this.totalSpaceBytes = data.totalSpace;

        // Real percentage
        const realUsedPercentage = parseFloat(((data.occupiedSpace / data.totalSpace) * 100).toFixed(2));

        // Apply minimum 50% rule for display
        this.usedPercentage = realUsedPercentage > 50 ? 50 : realUsedPercentage;
        this.freePercentage = 100 - this.usedPercentage;
        this.getOccupiedsizes();
      }
    }, (err) => {
      console.error("Error fetching storage usage:", err);
    });
  }
  getOccupiedsizes() {
    this.service.getOccupiedSizes(this.userId).subscribe((res: any) => {
      const data = res.data;
      if (data) {
        this.dataOccupied = {
          documents: data.DOCUMENTS,
          videos: data.VIDEOS,
          images: data.IMAGES,
          audio: data.AUDIOS,
          zip: data.ZIP,
          others: data.OTHERS || 0,
        };

        this.totalOccupiedBytes =
          data.DOCUMENTS + data.VIDEOS + data.IMAGES + data.AUDIOS + data.ZIP + (data.OTHERS || 0);

        const realUsedPercentage =
          (this.totalOccupiedBytes / this.totalSpaceBytes) * 100;

        if (realUsedPercentage > 50) {
          // this.usedPercentage = 50;
          this.freePercentage = 50;
        } else {
          // this.usedPercentage = realUsedPercentage;
          this.freePercentage = 100 - this.usedPercentage;
        }

        // Calculate all except the last one
        const documentsPercent = (data.DOCUMENTS / this.totalOccupiedBytes) * 100;
        const videosPercent = (data.VIDEOS / this.totalOccupiedBytes) * 100;
        const imagesPercent = (data.IMAGES / this.totalOccupiedBytes) * 100;
        const audioPercent = (data.AUDIOS / this.totalOccupiedBytes) * 100;
        const zipPercent = (data.ZIP / this.totalOccupiedBytes) * 100;

        // Others will take the remainder to sum exactly to usedPercentage
        const sumSoFar = documentsPercent + videosPercent + imagesPercent + audioPercent + zipPercent;
        const othersPercent = this.usedPercentage - sumSoFar;

        this.storageBreakdown = {
          documents: documentsPercent,
          videos: videosPercent,
          images: imagesPercent,
          audio: audioPercent,
          zip: zipPercent,
          others: othersPercent >= 0 ? othersPercent : 0,
        };

      }
    });
  }
saveNotificationSettings() {
  const userId = AppStorageService.getItem('userId');
  if (!userId) {
    console.error('❌ User ID not found in storage');
    return;
  }

  const body = this.notificationSettings;

  this.service.updateNotificationSettings(userId, body).subscribe({
    next: (res) => {
      console.log('✅ Notification settings saved:', res);
    },
    error: (err) => {
      console.error('❌ Failed to save settings:', err);
    }
  });
}



  onMobileTabSelect(tabKey: string) {
    this.mobileActiveTab = tabKey;
    this.activeTab = tabKey;

    if (tabKey === 'manage') {
      this.getTotalOccupiedSpace();
    } else if (tabKey === 'restore') {
      this.getDays();
    }
  }

  loadConfig() {
    this.electronService.loadConfig().then((config: any) => {
      if (config) {
        this.configData = config;
        console.log("Loaded config:", config);
        this.settingsForm.patchValue({
          localDirectory: config.folderPath || this.recommendedDirectory,
          syncFrequency: config.syncFrequency || 'REALTIME',
          conflictResolution: config.conflictResolution || 'KEEP_LOCAL',
          isDeleteCloud: config.isDeleteCloud
        });
      } else {
        this.settingsForm.patchValue({
          localDirectory: this.recommendedDirectory,
          syncFrequency: 'REALTIME',
          conflictResolution: 'KEEP_LOCAL',
        });
    }}).catch((err: any) => {
      console.error("Failed to load config:", err);
      this.alertService.show(
        "Failed to load settings. Please try again.",
        DriveConfig.VARIANTS.DANGER
      );
    });
  }    
  
  onDeleteDaysChange(event: any) {
    const value = Number(event.target.value);

    if (value <= 30) {
      this.deleteAfterDays = value;
    } else {
      // Reset input value to max allowed
      event.target.value = this.deleteAfterDays;
    }
  }


  onDaysInput(event: any) {
    const input = event.target;
    const value = input.value;

    const numericValue = value.replace(/[^0-9]/g, "");
    if (value !== numericValue) {
      input.value = numericValue;
    }
  }

  loadSetting() {
    const userId = AppStorageService.getItem('userId');
    this.service.getSettings(userId).subscribe({
      next: (res: any) => {                
        if (res && res.data) {
          const setting = res.data;
          this.settingId = setting.id;
          this.selectedAccess = setting.whoHasAccess?.trim().toUpperCase();
          this.selectedPermission = setting.whatPeopleCanDo?.trim().toUpperCase();
          this.setSelectedLabel();
          this.setSelectedPermissionLabel();
          this.notificationKeys.forEach(key => {
          this.notificationSettings[key] = !!setting[key];
        });
        }
      },
      error: () => {
        // this.alertService.show('Failed to load setting.', DriveConfig.VARIANTS.DANGER);
      },
    });
  }

  getDays(){
    const userId = AppStorageService.getItem('userId');
    this.service.getSetting(userId).subscribe({
      next: (res: any) =>{
        this.deleteAfterDays = res.data.trashAutoDeleteDays;
       }})
  }

  onSave() {
    const userId = AppStorageService.getItem('userId');
    const days = this.deleteAfterDays

    if (days < 1 || days > 30) {
      this.alertService.show(
        "Please enter a valid number of days between 1 and 30.",
        DriveConfig.VARIANTS.WARNING
      );
      return;
    }

    if (this.settingId) {
      // Update existing setting
      const payload =
      {
        id: this.settingId,
        userId: userId,
        trashAutoDeleteDays: this.deleteAfterDays,
      }

      this.service.saveSettings(payload).subscribe({
        next: (response: any) => {
          if (response?.success === true) {
            this.alertService.show(
              "Setting Updated Successfully.",
              DriveConfig.VARIANTS.SUCCESS
            );
          }
        },
        error: () => {
          this.alertService.show(
            "Setting Updation Failed.",
            DriveConfig.VARIANTS.DANGER
          );
        },
      });
    } else {
      this.alertService.show(
        "Setting Updation Failed.",
        DriveConfig.VARIANTS.DANGER
      );
    }
  }

  onToggleMfa(event: any) {
    this.isMfaEnabled = event.target.checked;
    if (!this.isMfaEnabled) {
      this.resetMfaFields();
    }
  }

  onPhoneNumberChange(event: any) {
    this.phoneNumber = event.target.value;
  }

  onOtpChange(event: any) {
    this.enteredOtp = event.target.value;
  }

  sendOtp() {
    let data = {
      userId: this.userId,
      mobileNo: this.phoneNumber,
      purpose: DriveConfig.MFA_PURPOSE.CONFIGURE,
    };
    this.service.sendOtpToWhatsapp(data).subscribe(
      (res) => {
        if (res?.success && res?.data?.success) {
          this.otpSent = true;
        }
      },
      (err) => {
        this.alertService.show(
          "Faild to send Otp",
          DriveConfig.VARIANTS.DANGER
        );
      }
    );
  }

  verifyOtp() {
    let data = {
      userId: this.userId,
      mobileNo: this.phoneNumber,
      purpose: DriveConfig.MFA_PURPOSE.CONFIGURE,
      otp: this.enteredOtp,
    };
    this.service.validateOtpByMobileNumber(data).subscribe(
      (res) => {
        if (res?.success && res?.data?.success) {
          this.mfaVerified = true;
          this.loadMFAList();
        } else {
          this.alertService.show(
            "Invalid OTP. Please try again.",
            DriveConfig.VARIANTS.DANGER
          );
        }
      },
      (err) => {
        this.alertService.show(
          "Invalid OTP. Please try again.",
          DriveConfig.VARIANTS.DANGER
        );
      }
    );
  }

  resetMfaFields() {
    this.phoneNumber = "";
    this.enteredOtp = "";
    this.otpSent = false;
    this.mfaVerified = false;
  }

  loadMFAList() {
    this.service.getAllMfaListByUserId(this.userId).subscribe(
      (res) => {
        this.mfaList = res?.success && res?.data ? res.data : [];
        this.isMfaEnabled = this.mfaList.length > 0;
      },
      (err) => {
        console.error("Failed to load MFA list", err);
        this.mfaList = [];
        this.isMfaEnabled = false;
      }
    );
  }

  getMfaConfigByType(type: string): any {
    return this.mfaList.find((m: any) => m.type === type && m.isConfigured);
  }

  getMaskedContact(config: any): string {
    if (!config?.contactNo) return "";
    const phone = config.contactNo;
    return phone.slice(0, 2) + "XXXXXXX" + phone.slice(-2);
  }

  removeMfa(type: string) {
    const config = this.getMfaConfigByType(type);
    if (!config) return;

    this.service.deleteMfaConfig(config.id).subscribe(
      (res: any) => {
        if (res.success) {
          this.loadMFAList();
        } else {
          console.error("Failed to remove MFA config");
        }
      },
      (err: any) => {
        console.error("Error removing MFA config:", err);
      }
    );
  }

  isValidDigits(input: string, length: number): boolean {
    return new RegExp(`^\\d{${length}}$`).test(input || "");
  }

  onSyncFrequencyChange(event: any) {
    this.settingsForm.get('syncFrequency')?.setValue(event.target.value);
  }

  onConflictResolutionChange(event: any) {
    this.settingsForm.get('conflictResolution')?.setValue(event.target.value);
  }


  async saveSettings() {
    try {
      const userId = AppStorageService.getItem('userId');
      const email: any = AppStorageService.getItem("email");
      const username = email.split('@')[0];
      const folderPath = this.settingsForm.get('localDirectory')?.value;

      if (!folderPath) {
        this.alertService.show(
          "Please select a valid local directory.",
          DriveConfig.VARIANTS.WARNING
        );
        return;
      }
      this.electronService.createDirIfNotExists(folderPath);

      let obj = {
        userId,
        username,
        folderPath,
        accessToken: AppStorageService.getItem('token') || '',
        syncFrequency: this.settingsForm.get('syncFrequency')?.value,
        conflictResolution: this.settingsForm.get('conflictResolution')?.value,
        isDeleteCloud: this.settingsForm.get('isDeleteCloud')?.value
      };
      const ok = await this.electronService.saveConfig(obj);

      if (!ok) {
        this.alertService.show(
          "Failed to save settings. Please try again.",
          DriveConfig.VARIANTS.DANGER
        );
        return;
      } 
      // this.electronService.startWatching(userId, email);
      //  this.electronService.setConfig('isDeleteCloud', this.settingsForm.get('isDeleteCloud')?.value)
      this.alertService.show(
        "Settings updated.",
        DriveConfig.VARIANTS.SUCCESS
      );
    } catch (err: any) {
      this.alertService.show(
        "Failed to save settings: " + err.message,
        DriveConfig.VARIANTS.DANGER
      );
    }

  }

  async browseFolder() {
    let folderPath = await window.electronAPI.selectFolder();
    if (folderPath && folderPath.data) {
      this.settingsForm.get('localDirectory')?.setValue(folderPath.data);
    }
  }

  onDeleteSyncChange(event: any) {
     const isDeleteCloud = event.target.checked;
       // true = switch on, false = switch off
        this.settingsForm.get('conflictResolution')?.setValue(isDeleteCloud);
       this.electronService.setConfig('isDeleteCloud', isDeleteCloud)

  }
  
  saveNotificationConfigure(){
    let data= {
      userId: this.userId,
      whatPeopleCanDo: this.selectedPermission,
      whoHasAccess: this.selectedAccess
    }
    this.service.notificationConfigure(data).subscribe(
      (res:any) => {
        if(res.success){
          this.alertService.show("Share access updated successfully!", DriveConfig.VARIANTS.SUCCESS);
        }
      }, (err: any) => {
      }
    )
  }

  selectOption(option: any) {
    this.selectedAccess = option.value;
    this.selectedAccessLabel = option.label;
    this.open = false;
  }

  selectPermission(option: any) {
    this.selectedPermission = option.value;
    this.selectedPermissionLabel = option.label;
    this.openPermission = false;
  }

  @ViewChild('permissionDropdown') permissionDropdown!: ElementRef;
  @ViewChild('accessDropdown') accessDropdown!: ElementRef;
  @HostListener('document:click', ['$event'])
  
  handleClick(event: Event) {
    const target = event.target as HTMLElement;

    if (this.openPermission && this.permissionDropdown &&
      !this.permissionDropdown.nativeElement.contains(target)) {
      this.openPermission = false;
    }

    if (this.open && this.accessDropdown &&
      !this.accessDropdown.nativeElement.contains(target)) {
      this.open = false;
    }
  }
}
