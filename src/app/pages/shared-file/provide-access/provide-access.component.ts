import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { KeyedBase64Service } from '../../../shared/service/keyed-base64.service';
import { JwtUtilsService } from '../../../shared/service/jwt-utils.service';
import { AppStorageService } from '../../../shared/service/app-storage.service';
import { FileService } from '../../../shared/service/file.service';
import { AlertService } from '../../../shared/alert-service/alert.service';
import { DriveConfig } from '../../../shared/config/drive.config';

@Component({
    selector: 'app-provide-access',
    templateUrl: './provide-access.component.html',
    standalone: false,
})
export class ProvideAccessComponent implements OnInit {
    state: 'loading' | 'success' | 'error' = 'loading';
    isSameUser: boolean = false;

    @ViewChild('dropDownMenu') manageAccessMenu!: ElementRef<HTMLElement>;

    isDropdownOpen = false;
    selectedAccess: any = 'CAN_VIEW';
    accessOptions = [
        { label: 'Can View', value: 'CAN_VIEW', subLabel: "can't make changes" },
        { label: 'Can Edit', value: 'CAN_EDIT', subLabel: 'make any changes' },
        { label: 'Can View & Download', value: 'VIEW_DOWNLOAD', subLabel: 'can view & download' },
        { label: "View Only (No Download)", value: 'CANT_DOWNLOAD', subLabel: 'can view but not download' },
    ];

    shareData: any = null;

    constructor(private route: ActivatedRoute, private router: Router, private service: FileService,
        private alertService: AlertService,

    ) { }

    ngOnInit() {
        let data = this.route.snapshot.queryParamMap.get('data');
        const email = AppStorageService.getItem('email');

        if (!data) {
            this.state = 'error';
            return;
        }

        try {
            let res = KeyedBase64Service.decodeData(data);
            this.shareData = res;

            if (res && res.token) {
                if (JwtUtilsService.isTokenExpired(res.token)) {
                    console.warn('Token expired');
                    this.state = 'error';
                    return;
                }

                // Validate if the token user is same as logged-in owner
                if (email) {
                    this.isSameUser = JwtUtilsService.isLoggedInUserValid(email, res.token);
                } else {
                    this.isSameUser = false
                }

                if (!this.isSameUser) {
                    AppStorageService.clear();
                    AppStorageService.setItem('token', res.token);
                    AppStorageService.setItem('userId', res.ownerId);
                }
                this.state = 'success';
            } else {
                this.state = 'error';
            }
        } catch (error) {
            console.error('Error decoding data:', error);
            this.state = 'error';
        }
    }

    toggleDropdown() {
        this.isDropdownOpen = !this.isDropdownOpen;
    }

    selectAccess(option: any) {
        this.selectedAccess = option.value;
        this.isDropdownOpen = false;
    }

    getAccessLabel(value: string): string {
        const option = this.accessOptions.find((opt) => opt.value === value);
        return option ? option.label : 'Can view';
    }

    @HostListener('document:click', ['$event'])
    @HostListener('document:touchstart', ['$event'])
    closeMenu(event: MouseEvent | TouchEvent) {
        const target = event.target as HTMLElement;
        if (this.manageAccessMenu && !this.manageAccessMenu.nativeElement.contains(target)) {
            this.isDropdownOpen = false;
        }
    }

    onProvideAccess() {
        if (!this.shareData) return;
        // 🔧 Replace this with your API service
        // alert(
        //   `Access "${this.selectedAccess}" granted to ${this.shareData.requester} for "${this.shareData.driveItemName}".`
        // );

        const payload = [{
            userName: this.shareData.requester,
            permissionType: this.selectedAccess
        }];
        const id = this.shareData.shareDetailsId;
        this.service.createSharePermission(payload, id).subscribe(
            (res: any) => {
                // success handler
                this.alertService.show(`Access "${this.selectedAccess}" granted to ${this.shareData.requester} for "${this.shareData.driveItemName}".`
                    , DriveConfig.VARIANTS.SUCCESS);

            },
            (err: any) => {
                // error handler
                this.alertService.show("FAILD to give access retry", DriveConfig.VARIANTS.DANGER)
            }
        );
        // Example redirect
    }

    onDestroy() {
        if (!this.isSameUser) {
            AppStorageService.clear();
        }
    }
}
