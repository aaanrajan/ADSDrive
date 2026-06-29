import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FileService } from '../../shared/service/file.service';
import { AppStorageService } from '../../shared/service/app-storage.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-callback-page',
  standalone: false,
  templateUrl: './callback-page.component.html',
})
export class CallbackPageComponent implements OnInit {
  message: string = '';
  type: 'success' | 'error' | 'loading' = 'loading';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: FileService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const authCode = params['code'];
       const err =  params['error'];
       const isNewUser = params['isNewUser'] === 'true';

      if (authCode) {
        // Exchange code for token
        this.service.codeExchangeToToken(authCode).subscribe({
          next: (res: any) => {
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
              this.type = 'success';
              this.message = 'Login successful!';
              // Redirect after short delay (optional)
              setTimeout(() => this.router.navigate(['/drive/home']), 500);
            } else {
             this.login();
            }
          },
          error: (err) => {
            console.error('Token exchange failed', err);
            this.type = 'error';
            this.message = 'Login failed. Please try again.';
          }
        });
      } else if (isNewUser) {
        this.login();
        return;
      } else if (!!err) {
        if (err === 'login_required') {
          this.type = 'loading';
          this.message = 'Redirecting to login...';
          this.router.navigateByUrl('/home');
          return;
        }
            this.type = 'error';
            this.message = 'No auth code found';
            return;
      }else {
        const token = AppStorageService.getItem("token");
        if (token) {
          this.type = 'success';
          this.message = 'Already logged in. Redirecting...';
          setTimeout(() => this.router.navigate(['/drive/home']), 2000);
          return;
        } else {
          
          this.login();
          return;
        }
       
      }
    });
  }

  get bgColor(): string {
    return this.type === 'success' ? 'bg-green-500' : 'bg-red-500';
  }

  get icon(): string {
    return this.type === 'success' ? '✔️' : '❌';
  }

  login() {
    this.type = 'loading';
    this.message = 'Authenticating...';
    window.location.href = environment.service_url + '/auth/bootstrap';
  }
}
