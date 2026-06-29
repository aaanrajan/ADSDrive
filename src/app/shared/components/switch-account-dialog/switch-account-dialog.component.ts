import { Component } from "@angular/core";
import { FileService } from "../../service/file.service";
import { AppStorageService } from "../../service/app-storage.service";

@Component({
    selector: 'app-switch-handler',
    templateUrl: './switch-account-dialog.component.html',
    styleUrl: './switch-account-dialog.component.css',
    standalone: false
})
export class SwitchAccountDialogComponent {
    isSwitching = false;
    loadingStep = '';
    status: 'loading' | 'success' | 'error' = 'loading';
    responseMessage = '';
    selectedSession: any = null;
    userRole: any;
    userFullData: any;
    userType: any;
    userData: any;
    token: any;
    constructor(
        private service: FileService,
    ) { }

    switchAccount(session: any, isLogoutCurrent: boolean = false): void {

        this.isSwitching = true;
        this.status = 'loading';
        this.loadingStep = 'Switching account...';
        this.selectedSession = session;
        this.service.switchSession(session.sessionId, isLogoutCurrent).subscribe({
            next: async (res: any) => {
                console.log("res", res);

                if (res && res?.user !== null) {

                    const userData = res?.user;
                    const token = res?.token;
                    AppStorageService.setItem('token', token);
                    AppStorageService.setItem("userId", userData.id);
                    AppStorageService.setItem("email", userData.email);
                    AppStorageService.setItem("userName", userData.firstName);
                    AppStorageService.setItem("lastName", userData.lastName);
                    AppStorageService.setItem(
                        "userType",
                        !!userData?.userType ? userData.userType : null
                    );
                    window.location.reload();
                } else {
                    return this.fail('Session apply failed');
                }
            },

            error: () => this.fail('Switch failed')
        });
    }



    get icon(): string {
        if (this.status === 'loading') return '⏳';
        if (this.status === 'success') return '✔️';
        return '❌';
    }

    fail(msg: string) {

        this.status = 'error';
        this.responseMessage = msg;
        this.loadingStep = msg;

        setTimeout(() => {
            this.isSwitching = false;
        }, 1500);
    }



}