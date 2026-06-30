import { Component, OnInit } from '@angular/core';
import { PlatformService } from '../core/platform.service';

interface FileItem {
    id: string;
    itemName: string;
    size: number;
    syncStatus: string;
    modifiedDate: string;
    isFolder?: boolean;
    fullPath?: string;
}

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
    isElectron = false;
    files: FileItem[] = [];
    syncFolder = '';
    loading = false;
    message = '';

    constructor(private platform: PlatformService) { }

    ngOnInit(): void {
        this.isElectron = this.platform.isElectron();
    }

    async selectFolder() {
        if (!this.isElectron) {
            this.message = 'Folder selection is available in desktop app only.';
            return;
        }

        const folder = await this.platform.invoke('select-folder');
        if (folder) {
            this.syncFolder = folder;
            await this.loadFiles();
        }
    }

    async loadFiles() {
        if (!this.isElectron || !this.syncFolder) return;
        this.loading = true;
        this.files = await this.platform.invoke('get-files', this.syncFolder);
        this.loading = false;
    }

    async manualSync() {
        if (!this.isElectron) {
            this.message = 'Manual sync in web mode should call your backend API.';
            return;
        }

        const result = await this.platform.invoke('manual-sync');
        this.message = result?.message || 'Sync done';
        await this.loadFiles();
    }

    formatSize(bytes: number): string {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        let n = bytes;
        while (n >= 1024 && i < units.length - 1) {
            n /= 1024;
            i++;
        }
        return `${n.toFixed(1)} ${units[i]}`;
    }
}