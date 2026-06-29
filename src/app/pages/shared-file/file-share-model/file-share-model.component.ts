import { Component, ElementRef, EventEmitter, HostListener, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileService } from '../../../shared/service/file.service';
import { AppStorageService } from '../../../shared/service/app-storage.service';
import { DriveConfig } from '../../../shared/config/drive.config';
import { AlertService } from '../../../shared/alert-service/alert.service';
import { SharedService } from '../../../shared/shared.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
    standalone: false,
    selector: 'app-file-share-model',
    templateUrl: './file-share-model.component.html'
})
export class FileShareModelComponent {

    shareForm!: FormGroup;
    newUser!: FormGroup;
    isDropdownOpen = false;
    selectedDate: string | null = null;
    shareData: any;
    emails: string[] = [];
    emailInput: string = '';
    editedIndex: number | null = null;
    editValue: string = '';
    newEmail: string = '';
    insertingIndex: number | null = null;
    insertIndex: number | null = null;
    shareUserPermissions: any[] = []
    @Input() sharedItemList: any[] = []; // from parent [{name: 'File A', id: '...'}]
    @Input() sharedDetails: any; // from parent (response from backend if any)
    @Output() closeModel = new EventEmitter<any>();
    isShowBack: boolean = false
    @ViewChild('dropDownMenu') manageAccessMenu!: ElementRef<HTMLElement>;
    userList: { email: string, access: string }[] = [];
    selectedAccess: 'CAN_VIEW' | 'CAN_EDIT' | 'VIEW_DOWNLOAD' | 'CANT_DOWNLOAD' = 'CAN_VIEW';  // Default selected option
    linkAccess: 'ANYONE' | 'EXISTING' | 'CHOSEN' = 'ANYONE';  // Default selected option
    @Input() action: 'LINK_ACCESS' | 'SHARE' | 'MANAGE_ACCESS' | 'MANAGE_PEOPLE_ACCESS' | 'GRANT_ACCESS' = 'LINK_ACCESS';
    accessOptions = [
        { label: 'Can View', value: 'CAN_VIEW', subLabel: "can't make changes" },
        { label: 'Can Edit', value: 'CAN_EDIT', subLabel: 'make any changes' },
        { label: 'Can View & Download', value: 'VIEW_DOWNLOAD', subLabel: 'can view & download' },
        { label: "View Only (No Download)", value: 'CANT_DOWNLOAD', subLabel: 'can view but not download' }
    ];

    selectedFiles: string[] = ['Test report.xls', 'New project.pdf'];
    selectedItem: any;
    users: any[] = [];
    email: string = AppStorageService.getItem("email") || '';
    selectedFile = '';
    openDropdown = false;
    showOptions = false;
    linkLable = {
        'ANYONE': 'Anyone with the link',
        'EXISTING': 'Only existing access',
        'CHOSEN': 'People you choose'

    }
    isPagDirty: boolean = false;
    showAlertPopup: boolean = false;
    modelTitle: string = '';
    modelMessage: string = '';
    actionBtnText: string = '';
    revertBtnText: string = '';
    deleteSpinner: boolean = false;
    deleteLoadingEmail: string | null = null;
    listUpdate:any = null; // to trigger list update in parent after deletion

    @ViewChild('dropdownWrapper') dropdownWrapper!: ElementRef;
    selectedPeopleAccess: string = 'CAN_VIEW'; // default option
    colors: string[] = [
        'bg-red-500',
        'bg-blue-500',
        'bg-green-500',
        'bg-yellow-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-teal-500'
    ];
    searchSubject = new Subject<string>();

    constructor(private fb: FormBuilder, private service: FileService, private alertService: AlertService, private sharedService: SharedService) {
        this.shareForm = this.fb.group({
            name: ['', Validators.required],              // string input
            to: [[], [Validators.required]],
            description: [''],       // string input
            users: this.fb.array([])
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['sharedItemList'] && changes['sharedItemList'].currentValue?.length) {
            this.sharedItemList.forEach(x => x.selected = true);
        }
        console.log('Shared Details onChanges:', this.sharedDetails);
        console.log('Action onChanges:', this.sharedItemList);
        if (!!this.sharedDetails.length) {
            this.shareData = this.sharedDetails[0]?.shareDetails;
            this.shareUserPermissions = this.sharedDetails[0]?.shareUserPermissions;
            this.selectedItem = this.sharedDetails[0]?.driveItems[0] || '';
            if (this.shareData) {
                if (this.shareData.shareAction) {
                    this.linkAccess = this.shareData.shareAction;
                } else {
                    this.linkAccess = 'ANYONE';
                }
                this.selectedAccess = this.shareData.permissionType ? this.shareData.permissionType : 'CAN_VIEW';
                this.shareForm.get('description')?.setValue(this.shareData.description);
            }

            if (this.action === 'MANAGE_ACCESS') {
                this.updateManageAccessData(this.sharedDetails[0]);
            }

        }
    }

    ngOnInit(): void {
        // this.selectedFile = this.selectedFiles[0];
        this.searchSubject
            .pipe(
                debounceTime(400),          // wait 400ms after user stops typing
                distinctUntilChanged()       // only trigger if value actually changes
            )
            .subscribe(query => {
                this.loadSuggestions(query);
            });
    }

    handlePaste(event: ClipboardEvent) {
        const pastedText = event.clipboardData?.getData('text') || '';
        const entries = pastedText
            .split(/[,;\s]+/)
            .map(e => e.trim())
            .filter(e => this.isValidEmail(e));

        if (entries.length) {
            this.emails.push(...entries);
            this.emails = [...new Set(this.emails)]; // Remove duplicates
            this.shareForm.controls['to'].setValue(this.emails);
            event.preventDefault();
        }
    }

    // Start editing a specific email address
    editEmail(index: number) {
        this.editedIndex = index;
        this.editValue = this.emails[index];
    }

    // Save the edited email and validate it
    saveEditedEmail(index: number) {
        if (this.isValidEmail(this.editValue)) {
            this.emails[index] = this.editValue;
        }
        this.editedIndex = null;
        this.editValue = '';
        this.shareForm.controls['to'].setValue(this.emails);
    }
    setInsertIndex(index: number) {
        this.insertIndex = index + 1; // insert after clicked one
    }

    startInsert(index: number) {
        this.insertingIndex = index;
        this.newEmail = '';
    }

    insertEmail() {
        const email = this.newEmail.trim();
        if (email && this.isValidEmail(email)) {
            this.emails.splice(this.insertingIndex!, 0, email);
        }
        this.cancelInsert();
    }

    cancelInsert() {
        this.insertingIndex = null;
        this.newEmail = '';
    }

    removeEmail(index: number) {
        this.emails.splice(index, 1);
    }

    addEmailFromInput() {
        const email = this.emailInput.trim();

        if (email && this.isValidEmail(email) && !this.emails.includes(email)) {
            if (this.insertIndex !== null && this.insertIndex <= this.emails.length) {
                this.emails.splice(this.insertIndex, 0, email);
            } else {
                this.emails.push(email);
            }

            // ✅ only reset if valid
            this.emailInput = '';
            this.insertIndex = null; // reset after insert
            this.shareForm.controls['to'].setValue(this.emails);
            this.shareForm.controls['to'].markAsTouched();
        } else {
            // ❌ invalid email → prevent clearing input
            // optionally, you could highlight input or show an error here
        }
    }

    onKeyDown(event: KeyboardEvent) {
        if (
            event.key === 'Enter' ||
            event.key === ' ' ||
            event.key === ',' ||
            event.key === ';'
        ) {
            event.preventDefault(); // stop typing space/comma
            this.addEmailFromInput();
        }
    }

    isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }


    updateShareDetails(action: any) {
        if (!this.shareData) return;
        this.shareData.shareAction = this.linkAccess != 'ANYONE' ? this.linkAccess : "";
        this.shareData.shareEveryone = this.linkAccess === 'ANYONE';
        this.shareData.permissionType = this.selectedAccess;
        if (!this.shareForm.get('description')?.value) {
            this.shareData.description = this.shareForm.get('description')?.value
        }
        this.service.updateShareDetails(this.shareData).subscribe(res => {
            if (this.action === 'LINK_ACCESS') {
                this.action = this.linkAccess == 'CHOSEN' ? 'MANAGE_ACCESS' : action;
                if (this.linkAccess === 'CHOSEN' && this.sharedDetails?.length) {
                    const detail = this.sharedDetails[0];
                    this.updateManageAccessData(detail);
                }


            }
        }, err => {

        })
    }

    submitShare() {
        if (this.shareForm.get('description')?.value !== this.shareData.description) {
            this.updateShareDetails(null);
        }
        if (!this.emails || this.emails.length === 0) {
            return;
        }
        const payload = this.emails.map(x => ({
            userName: x,
            isAllow: false,
            permissionType: this.selectedAccess
        }));
        const id = this.shareData?.id;

        this.service.createSharePermission(payload, id).subscribe(
            (res: any) => {
                if (this.action === 'SHARE') {
                    this.closeDialog('CHANGED');
                } else if (this.action === 'GRANT_ACCESS') {
                    const target = this.sharedDetails.find((x: any) => x.shareDetails.id === id);
                    if (target) {
                        if (!target.shareUserPermissions) {
                            target.shareUserPermissions = [];
                        }

                        const newPermissions = res.data || [];

                        newPermissions.forEach((newPerm: any) => {
                            const existingIndex = target.shareUserPermissions.findIndex(
                                (perm: any) => perm.id === newPerm.id
                            );

                            if (existingIndex > -1) {
                                // 🔁 Update existing
                                target.shareUserPermissions[existingIndex] = newPerm;
                            } else {
                                // ➕ Add new
                                target.shareUserPermissions.push(newPerm);
                            }
                        });
                    }
                    this.shareData = this.sharedDetails[0]?.shareDetails;
                    this.shareUserPermissions = this.sharedDetails[0]?.shareUserPermissions;
                    this.emails = [];
                    this.shareForm.get('to')?.setValue([]);
                    this.shareForm.get('description')?.setValue('');
                    this.selectedAccess = this.shareData.permissionType ? this.shareData.permissionType : 'CAN_VIEW';
                    this.selectedItem = this.sharedDetails[0]?.driveItems[0] || '';
                    this.action = 'LINK_ACCESS';
                }
                this.alertService.show("File shared successfully!", DriveConfig.VARIANTS.SUCCESS);
            },
            (err: any) => {
                this.alertService.show("Error sharing file. Please try again.", DriveConfig.VARIANTS.DANGER);
                // error handler
            }
        );
    }

    copyLink(shareDetails: any = null) {
        let shareLink;
        if (shareDetails) {
            shareLink = shareDetails.shareLink;
        } else {
            shareLink = this.sharedDetails?.length ? this.sharedDetails[0]?.shareDetails.shareLink : null;
        }
        if (!shareLink) return;
        navigator.clipboard.writeText(`${environment.web_url}/share/${btoa(shareLink)}`);
        this.alertService.show("Shareable link copied to clipboard!", DriveConfig.VARIANTS.SUCCESS);
    }

    closeDialog(data: any = true) {
        if (this.isPagDirty) {
            this.modelTitle = 'Leave Without Saving?';
            this.modelMessage = 'Your changes have not been saved. Do you want to continue without saving?';
            this.actionBtnText = 'Leave';
            this.revertBtnText = 'Cancel';
            this.showAlertPopup = true;
        }
        else {
            this.modelTitle = '';
            this.modelMessage = '';
            this.actionBtnText = '';
            this.revertBtnText = '';
            this.showAlertPopup = false;
            this.closeModel.emit(this.listUpdate ?? data);
            this.listUpdate = null;
        }
    }

    confirmModelResponce(isConfirmed: boolean) { 
        if (isConfirmed) {
            this.closeModel.emit(this.listUpdate ?? true);
            this.listUpdate = null;
        }
        else {
            this.modelTitle = '';
            this.modelMessage = '';
            this.actionBtnText = '';
            this.revertBtnText = '';
            this.showAlertPopup = false;
        }
    }

    toggleDropdown() {
        this.isDropdownOpen = !this.isDropdownOpen;
    }

    selectAccess(option: any) {
        this.selectedAccess = option;
        this.isDropdownOpen = false;
    }

    selectPermission(item: any) {
        this.linkAccess = item.key;
        this.openDropdown = false;
    }

    getSelectedLabel() {
        const selected = (this.linkLable as any)?.[this.linkAccess];
        return selected ? selected : null;
    }


    getAccessLabel(value: string): string {
        const option = this.accessOptions.find(opt => opt.value === value);
        return option ? option.label : 'Can view';
    }

    openDatePicker() {
        const input = document.createElement('input');
        input.type = 'date';
        input.name = 'selectedDate';  // important for autofill
        input.id = 'selectedDate';
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        //   input.autocomplete = 'bday';

        input.onchange = (event: Event) => {
            const target = event.target as HTMLInputElement;
            this.selectedDate = target.value;
            document.body.removeChild(input);
        };

        document.body.appendChild(input);
        input.focus();
        input.click();
    }

    @HostListener('document:click', ['$event'])
    @HostListener('document:touchstart', ['$event'])
    closeMenu(event: MouseEvent | TouchEvent) {
        const target = event.target as HTMLElement;
        if (
            this.manageAccessMenu &&
            !this.manageAccessMenu.nativeElement.contains(target)
        ) {
            this.isDropdownOpen = false;
        }

        if (this.openDropdown && this.dropdownWrapper) {
            if (!this.dropdownWrapper.nativeElement.contains(event.target)) {
                this.openDropdown = false;
            }
        }
        this.sharedDetails.forEach((item: any) => item.showShareActionDropdown = false);

        this.users.forEach(u => (u.showOptions = false));
        this.filteredUsers = [...this.users];
    }

    getColor(user: any): string {
        let name = this.getDisplayName(user);
        const index = name.charCodeAt(0) % this.colors.length;
        return this.colors[index];
    }

    getInitial(user: any): string {
        let name = this.getDisplayName(user);
        return name.charAt(0).toUpperCase();
    }
    accessDropdown(user: any, event: MouseEvent) {
        event.stopPropagation(); // prevent triggering document click
        this.users.forEach(u => {
            if (u !== user) u.showOptions = false; // close others
        });
        user.showOptions = !user.showOptions;
    }

    selectOption(user: any, option: any) {
        user.permissionType = option.label; // or store value
        user.showOptions = false;
        this.isPagDirty = true;
    }

    getRoleLabel(user: any) {
        if (user.permissionType) {
            const option = this.accessOptions.find(o => o.value === user.permissionType);
            return option ? option.label : user.permissionType;
        }
        return user.permissionType;
    }

    searchQuery: string = '';
    filteredUsers: any[] = [];

    filterUsers() {
        const query = this.searchQuery.toLowerCase().trim();
        if (!query) {
            this.filteredUsers = [...this.users];
            return;
        }

        this.filteredUsers = this.users.filter(
            (u) =>
                u.name.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query)
        );
        // this.loadSuggetions({ target: { value: query } });
    }

    inviteNewUser(emailOrName: string) {
        // You can either directly push to users OR call API
        if (!this.isValidEmail(emailOrName)) {
            this.alertService.show("Invalid email format", DriveConfig.VARIANTS.DANGER);
            return;
        }

        const newUser = {
            name: emailOrName.includes('@') ? emailOrName.split('@')[0] : emailOrName,
            email: emailOrName,
            permissionType: this.selectedAccess, // default role
            color: this.getColor({ email: emailOrName }),
            isAllow: true,
            showOptions: false,
            isNotSaved: true // flag to identify unsaved users

        };
        this.users.push(newUser);
        this.filteredUsers = [...this.users];
        this.suggestedUsers = [];
        this.searchQuery = '';
        this.isPagDirty = true;
    }

    getIconForNode(node: any): string {
        return this.sharedService.getIconForNode(
            node?.fileType,
            node?.isFolder,
            node?.itemName
        );
    }

    selectedUser: any
    selectedManageAccess(data: any) {
        if (!data) return;
        this.selectedPeopleAccess = data?.permissionType || 'CAN_VIEW';
        if (this.sharedDetails?.length) {
            const detail = this.sharedDetails[0];
            const user = detail.sharedUsers?.find((x: any) => x.email === data.userName);

            let name = data.userName?.split("@")[0] || "";
            if (user?.firstName || user?.lastName) {
                name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
            }

            this.selectedUser = {
                name,
                email: data.userName,
                permissionType: data.permissionType,
                color: this.getColor({ email: data.userName }),
                isAllow: data.isAllow,
                showOptions: false,
                shareDetailId: data.shareDetailId
            }

        }
        this.action = 'MANAGE_PEOPLE_ACCESS'
    }

    updatePermission() {
        if (!this.selectedUser) return;
        const payload = [{
            userName: this.selectedUser.email,
            permissionType: this.selectedPeopleAccess
        }];
        const id = this.selectedUser.shareDetailId
        this.service.createSharePermission(payload, id).subscribe(
            (res: any) => {
                // success handler
                this.action = 'SHARE'
            },
            (err: any) => {
                // error handler
            }
        );
    }

    getShareableLink(data: any): string | null {
        return `${environment.web_url}/share/${encodeURIComponent(data?.shareLink)}`;
    }

    getDarkColor(node: any): string {
        return this.sharedService.darkenColor(node.color || '#FBBF24', 20);
    }

    getShareActionLabel(action: string): string {
        return this.linkLable[action as keyof typeof this.linkLable] || '';
    }

    actionDropdown(item: any) {
        item.showShareActionDropdown = !item.showShareActionDropdown;
        console.log('Dropdown toggled:', item.showShareActionDropdown);
    }

    copyAllLinks() {
        const links = this.sharedDetails?.length ? this.sharedDetails.map((detail: any) => detail.shareDetails?.shareLink).filter((link: string | null) => link !== null) : [];
        console.log('Links to copy:', links);
        if (links.length) {
            const allLinksText = JSON.stringify(links);
            console.log('All shareable links to copy:', allLinksText);
            navigator.clipboard.writeText(`${environment.web_url}/share/${btoa(allLinksText)}`);
            this.alertService.show("All shareable links copied to clipboard!", DriveConfig.VARIANTS.SUCCESS);
        }
    }

    grantAccess(data: any) {

        if (!data) return;
        this.selectedFile = data?.driveItems[0]?.itemName || '';
        this.shareData = data.shareDetails || {};
        this.selectedAccess = this.shareData.permissionType || 'CAN_VIEW';
        this.selectedItem = data?.driveItems[0] || {};
        this.shareForm.get('description')?.setValue(this.shareData.description || '');
        this.linkAccess = this.shareData.shareAction || 'ANYONE';
        if (this.linkAccess === 'CHOSEN' && this.sharedDetails?.length) {
            this.updateManageAccessData(data);
        }
        this.action = this.linkAccess == 'CHOSEN' ? 'MANAGE_ACCESS' : 'GRANT_ACCESS';
    }

    updateShareAction(shareData: any) {
        if (!shareData) return;
        shareData.shareEveryone = shareData.shareAction === 'ANYONE';
        shareData.shareAction = shareData.shareAction != 'ANYONE' ? shareData.shareAction : "";
        const obj = { id: shareData.id, shareAction: shareData.shareAction, shareEveryone: shareData.shareEveryone };
        this.service.updateShareDetails(obj).subscribe(res => {
        }, err => {

        })
    }


    updateManageAccessData(accessData: any) {
        if (!accessData) return;

        const detail = accessData;
        const userPermissions = detail.shareUserPermissions || [];
        // this.isShowBack= true
        this.users = [];

        // 1️⃣ Add Owner (current logged-in user)
        const ownerEmail = AppStorageService.getItem("email");
        const ownerNameFromStorage = AppStorageService.getItem("userName") || "";
        const ownerName =
            ownerNameFromStorage.trim() || (ownerEmail ? ownerEmail.split("@")[0] : "OWNER");

        this.users.push({
            name: ownerName,
            email: ownerEmail || '',
            permissionType: "OWNER", // mark as owner
            color: this.getColor({ email: ownerEmail }),
            isAllow: true,
            showOptions: false
        });

        // 2️⃣ Add shared users from permissions
        for (const perm of userPermissions) {
            const user = detail.sharedUsers?.find((x: any) => x.email === perm.userName);

            let name = perm.userName?.split("@")[0] || "";
            if (user?.firstName || user?.lastName) {
                name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
            }

            this.users.push({
                name,
                email: perm.userName,
                permissionType: perm.permissionType,
                color: this.getColor({ email: perm.userName }),
                isAllow: perm.isAllow,
                showOptions: false
            });
        }
        this.filteredUsers = [...this.users];

    }

    sendRequest() {

        const payload = this.users.filter(u => u.email != this.email ).map(u => ({
            userName: u.email,
            permissionType: u.permissionType,
            isAllow: u.isAllow
        }));

        const id = this.shareData.id;
        this.service.createSharePermission(payload, id).subscribe(
            (res: any) => {
                // success handler
                this.alertService.show("Permission updated successfully!", DriveConfig.VARIANTS.SUCCESS);
                this.isPagDirty = false;
                this.closeDialog('CHANGED');
            },
            (err: any) => {
                this.alertService.show("Error updating permission. Please try again.", DriveConfig.VARIANTS.DANGER);
            }
        );
    }


    onSearchChange(event: any) {
        //   const query = event.target.value;
        this.searchSubject.next(event);
    }

    suggestedUsers: any[] = [];
    loadSuggestions(event: any) {
        const query = event.target.value;
        if (query.length < 2) {
            this.suggestedUsers = [];
            return;
        }
        let userId = AppStorageService.getItem("userId");
        this.service.getUserSuggestions(query, userId).subscribe((res: any) => {
            const users = res.data || [];

            // 📋 Get list of existing emails from your local array
            let existingEmails = this.users
                .map((u: any) => (u.email ? u.email.toLowerCase() : ''));
            if (['GRANT_ACCESS', 'SHARE'].includes(this.action)) {
                existingEmails = this.emails.map(e => e.toLowerCase());
            }
            this.suggestedUsers = users.filter(
                (u: any) =>
                    u.email &&
                    u.email.trim() !== '' &&
                    !existingEmails.includes(u.email.toLowerCase())
            );
        }, err => {
            this.suggestedUsers = [];
        })
    }

    getDisplayName(user: any): string {
        // 1️⃣ If first or last name exist, combine them
        const fullName = [user.firstName, user.lastName]
            .filter(Boolean) // removes empty values
            .join(' ')
            .trim();

        if (fullName) return fullName;
        let email = user.email || user.userName || '';
        // 2️⃣ Otherwise, fallback to email before "@"
        if (email) {
            const localPart = email.split('@')[0];
            // Make it prettier — replace dots/underscores and capitalize
            return localPart
                .replace(/[._]/g, ' ')
                .replace(/\b\w/g, (c: any) => c.toUpperCase());
        }

        // 3️⃣ Last fallback — unknown
        return 'Unknown User';
    }

    addSuggestion(user: any) {
        if (!user || !user.email) return;
        this.emails.push(user.email);
        this.emailInput = '';
        this.emails = [...new Set(this.emails)]; // Remove duplicates
        this.shareForm.controls['to'].setValue(this.emails);
        this.suggestedUsers = this.suggestedUsers.filter(u => u.email !== user.email);
    }

    deleteManageAccess(email: any, isNotSaved: boolean = false) {
        this.deleteLoadingEmail = email;
        this.deleteSpinner = true;
        if (isNotSaved) {
            this.users = this.users.filter((u: any) => u.email !== email);
            this.deleteSpinner = false;
            this.deleteLoadingEmail = null;
        } else {
            this.deleteAccessedUsers(email);
        }
    }

    deleteAccessedUsers(email: any) {
        this.deleteLoadingEmail = email;
        this.deleteSpinner = true;

        this.service.removeRequest(
            this.sharedDetails[0].shareUserPermissions[0].shareDetailId,
            email
        ).subscribe({
            next: (res: any) => {

                this.users = this.users.filter((u: any) => u.email !== email);

                if (this.action !== 'MANAGE_ACCESS') {
                    this.closeDialog('CHANGED');
                }

                this.alertService.show('User access removed successfully', DriveConfig.VARIANTS.SUCCESS);
                this.listUpdate = 'CHANGED';
                this.deleteSpinner = false;
                this.deleteLoadingEmail = null;
            },
            error: (err: any) => {
                this.alertService.show('Something went wrong while deleting', DriveConfig.VARIANTS.DANGER);
                console.error(err);
                this.deleteSpinner = false;
                this.deleteLoadingEmail = null;
            }
        });
    }
}