import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppStorageService } from './app-storage.service';

@Injectable({
  providedIn: 'root'
})
export class BaseService {

  constructor() { }

  /**
   * Returns HTTP headers with auth token.
   */ 
  getHeader() {
    const token = AppStorageService.getItem("token");  
    if (!token) {
      console.warn("Token not found!");
    }
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      "Authorization": token ? token.replace('Bearer ', '') : ''
    });
    return headers;
  }
  loginHeaders() {

    let browser=AppStorageService.getItem("browser");
    let os=AppStorageService.getItem("os");
    let device=AppStorageService.getItem("device");
    let model=AppStorageService.getItem("model");
    const headers = new HttpHeaders({
      
      "browser": browser ? browser : '',
      "os": os ? os : '',
      "device": device ? device : '',
      "model": model ? model : '',
    });
    return headers;
  }
}
