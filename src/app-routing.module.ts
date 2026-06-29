import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { LoginNavigationComponent } from './pages/login-navigation/login-navigation.component';
import { AuthGuard, LoginGuard } from './shared/guards/auth.guard';
import { SharePreviewComponent } from './pages/shared-file/share-preview/share-preview.component';
import { ProvideAccessComponent } from './pages/shared-file/provide-access/provide-access.component';
import { PoliciesComponent } from './pages/policies/policies.component';
import { CallbackPageComponent } from './pages/callback-page/callback-page.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/welcome/welcome.module')
      .then(m => m.WelcomeModule)
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [LoginGuard]
  },
  {
    path: 'sso',
    component: LoginNavigationComponent,
    canActivate: [LoginGuard]
  },
   {
    path: 'verify',
    component: LoginNavigationComponent,
    canActivate: [LoginGuard]
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/signup/signup.module').then(m => m.SignupModule),
    canActivate: [LoginGuard]
  },
  {
    path: 'drive',
    loadChildren: () => import('./layouts/main-layout/main-layout.module').then(m => m.MainLayoutModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./pages/forgot-password/forgot-password.module').then(m => m.ForgotPasswordModule),
    canActivate: [LoginGuard]
  },
  {
    path: 'otp-screen',
    loadChildren: () => import('./pages/otp-screen/otp-screen.module').then(m => m.OtpScreenModule),
    canActivate: [LoginGuard]
  },
  {
    path: 'change-password',
    loadChildren: () => import('./pages/change-password/change-password.module').then(m => m.ChangePasswordModule)
  },
   {
    path: 'share/:shareLink',
    component: SharePreviewComponent
  },
  {
    path: 'share-access',
    component: ProvideAccessComponent
  },
   { path: 'callback', component: CallbackPageComponent },
  {
    path: 'policies',
    loadChildren:  () => import('./pages/policies/policies.module').then(m => m.PoliciesModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
      anchorScrolling: 'enabled',
      scrollPositionRestoration: 'enabled'
    })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
