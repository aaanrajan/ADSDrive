import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../../environments/environment';
import { KeyedBase64Service } from './keyed-base64.service';

@Injectable({
  providedIn: 'root'
})
export class AppStorageService extends KeyedBase64Service {

  constructor() { super(); }

  static key = CryptoJS.enc.Utf8.parse('ADSDRIVEADMIN01X');

  static defaultKey = 'KQs6EwZfJBA4JB0AED1UTkA=';

  // Set item in local storage
  static setItem(key: string, value: string): void {
    if (environment.production){
      key = this.encode(key, this.defaultKey);
    } else {
      localStorage.setItem(key, value);
      return;
    }
    return this.setEncodedItem(key, value);
  }

  // Get item from local storage
  static getItem(key: string): string | null {
    return this.getDecodedItem(key);
  }

  /**
   * Set Current page in to local storage
   */
  static setCurrentPage(page: string) {
    return localStorage.setItem('currentPage', page);
  }

  /**
  * Remove All from Session and local storage
  */
  static clear() {
    localStorage.clear();
    sessionStorage.clear();
  }

    /**
  * Encode All set Data
  */
  static setEncodedItem(key: string, value: any): void {
    if (!value) return;

    const data = JSON.stringify(value);
    const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(data), AppStorageService.key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    }).toString();

    localStorage.setItem(key, encrypted); // Set encrypted data in sessionStorage
  }

  /**
    * Decode All set Data
    */
  static getDecodedItem(key: string): any {
    if (environment.production){
      key = this.encode(key, this.defaultKey);
    } else {
      return localStorage.getItem(key);
    }
    const encryptedData = localStorage.getItem(key);
    if (!encryptedData) return null;

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, AppStorageService.key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      });
      const decryptedText = CryptoJS.enc.Utf8.stringify(decrypted);
      return JSON.parse(decryptedText); // Parse decrypted JSON string
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  static removeItem(key: any) {
    if (environment.production){
      key = this.encode(key, this.defaultKey);
    }
    localStorage.removeItem(key);
    sessionStorage.removeItem(key)
  }

}
