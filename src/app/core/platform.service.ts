import { Injectable } from '@angular/core';

declare global {
    interface Window {
        electronAPI?: {
            isElectron: boolean;
            invoke: (channel: string, ...args: any[]) => Promise<any>;
            on: (channel: string, callback: (data: any) => void) => () => void;
        };
    }
}

@Injectable({ providedIn: 'root' })
export class PlatformService {
    isElectron(): boolean {
        return !!window.electronAPI?.isElectron;
    }

    invoke(channel: string, ...args: any[]): Promise<any> {
        if (!this.isElectron()) {
            return Promise.reject(new Error('Not running in Electron'));
        }
        return window.electronAPI!.invoke(channel, ...args);
    }

    on(channel: string, callback: (data: any) => void): (() => void) | null {
        if (!this.isElectron()) return null;
        return window.electronAPI!.on(channel, callback);
    }
}