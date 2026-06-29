import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class KeyedBase64Service {

  // Encode string with secret key
  static encode(plain: string, key: string): string {
    if (!key) throw new Error('Key must not be empty');

    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const keyBytes = encoder.encode(key);

    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i] ^ keyBytes[i % keyBytes.length]);
    }

    return btoa(binary);
  }

  // Decode string with secret key
  static decode(encoded: string, key: string): string {
    if (!key) throw new Error('Key must not be empty');

    const binary = atob(encoded);
    const len = binary.length;
    const keyBytes = new TextEncoder().encode(key);

    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = binary.charCodeAt(i) ^ keyBytes[i % keyBytes.length];
    }

    return new TextDecoder().decode(out);
  }
  static staticKey = CryptoJS.enc.Base64.parse('JXhr3V9jOlKDx4jE+aRH/DU+8dm1npO8E/IKuV7WgwQ=');

  /**
   * Encrypt an object/value -> returns base64 string (suitable to put into URL after encodeURIComponent)
   */
  static encodeData(value: any): string {
    if (value === null || value === undefined) { return ''; }
    const plainText = JSON.stringify(value);

    // CryptoJS expects a WordArray as 'message' if we pass parsed bytes, so use Utf8.parse for the plaintext
    const encrypted = CryptoJS.AES.encrypt(
      CryptoJS.enc.Utf8.parse(plainText),
      this.staticKey,
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    // encrypted.toString() is Base64 by default
    return encrypted.toString();
  }

  /**
   * Decrypt a base64 string (possibly URL-encoded) and parse JSON.
   * Handles URL decoding plus the common "spaces vs +' problem".
   */
  static decodeData(response: string): any {
    if (!response) { return ''; }

    try {
      // 1) If the value is coming from a URL param, it may be percent-encoded.
      // Use decodeURIComponent to convert %2F etc -> characters.
      // If incoming string has + replaced by spaces by some consumers, restore them.
      let cleaned = response;
      try {
        cleaned = decodeURIComponent(response);
      } catch (e) {
        // If it's not percent-encoded, ignore the decode error and use raw
        cleaned = response;
      }

      // Many systems convert '+' to ' ' when parsing URLs — base64 uses '+'.
      // If you observe spaces, restore them to '+'.
      if (cleaned.indexOf(' ') >= 0 && cleaned.indexOf('+') === -1) {
        cleaned = cleaned.replace(/ /g, '+');
      }

      // Optional: remove line breaks that might be present in base64
      cleaned = cleaned.replace(/\r?\n|\r/g, '');

      // 2) Now decrypt using the parsed Base64 key
      const decryptedWA = CryptoJS.AES.decrypt(cleaned, this.staticKey, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      });

      // 3) Convert WordArray -> UTF-8 string
      const decryptedText = CryptoJS.enc.Utf8.stringify(decryptedWA);

      // If decryptedText is empty, it's usually because wrong key or corrupted ciphertext
      if (!decryptedText) {
        console.error('Decryption returned empty string — possible wrong key or corrupted ciphertext.');
        return null;
      }

      // 4) Parse JSON (if the payload is JSON)
      try {
        return JSON.parse(decryptedText);
      } catch (parseErr) {
        // Not JSON — return raw string
        return decryptedText;
      }
    } catch (err) {
      console.error('Error during decodeData:', err);
      return null;
    }
  }

  /**
   * Convenience: create a URL-safe encrypted parameter value
   * usage: const urlSafe = CryptoUtilsService.toUrlSafe(encryptedBase64);
   */
  static toUrlSafe(base64str: string): string {
    // encodeURIComponent will escape + and / properly for URLs
    return encodeURIComponent(base64str);
  }

  /**
   * Reverse of toUrlSafe (not strictly required because decodeData tries decodeURIComponent)
   */
  static fromUrlSafe(urlSafeStr: string): string {
    try {
      return decodeURIComponent(urlSafeStr);
    } catch {
      return urlSafeStr;
    }
  }

  
}
