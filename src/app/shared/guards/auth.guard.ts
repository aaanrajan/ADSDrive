import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { AppStorageService } from "../service/app-storage.service";

// auth.guard.ts
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = AppStorageService.getItem('token');
    if (token) return true;
    AppStorageService.clear();
    // this.router.navigate(['/login']);
    return false;
  }
}

// login.guard.ts
@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = AppStorageService.getItem('token');
    if (token) {
      this.router.navigate(['/drive/home']); // or your default page
      return false;
    }
    return true;
  }
}


