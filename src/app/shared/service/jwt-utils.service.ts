import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

export interface DecodedToken {
  sub?: string;         // standard username claim
  userName?: string;    // custom claim
  exp?: number;         // expiration timestamp (seconds)
  iat?: number;         // issued at timestamp
  [key: string]: any;   // any other claims
}

@Injectable({ providedIn: 'root' })
export class JwtUtilsService {

  /**
   * Decode JWT and return claims
   */
  static decodeToken(token: string): DecodedToken | null {
    try {
      return jwtDecode<DecodedToken>(token);
    } catch (err) {
      console.error('Invalid JWT:', err);
      return null;
    }
  }

  /**
   * Check if the JWT is expired
   */
  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true; // invalid or no expiry

    const expiryTime = decoded.exp * 1000; // exp is in seconds → convert to ms
    return Date.now() > expiryTime;
  }

  /**
   * Extract username from token (supports both 'userName' and 'sub')
   */
  static getUsername(token: string): string | null {
    const decoded = this.decodeToken(token);
    if (!decoded) return null;
    return decoded.userName || decoded.sub || null;
  }

  /**
   * Compare stored user info with token username
   */
  static isLoggedInUserValid(storedUserName: string, token: string): boolean {
    if (!token || !storedUserName) return false;

    const isExpired = this.isTokenExpired(token);
    const username = this.getUsername(token);

    return !isExpired && username === storedUserName;
  }
}
