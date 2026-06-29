import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OtpScreenComponent } from './otp-screen.component';

const routes: Routes = [
  {
    path: '',
    component: OtpScreenComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OtpScreenRoutingModule { }
