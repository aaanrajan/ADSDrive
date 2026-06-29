import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SecuritySettingsComponent } from './security-settings.component';

const routes: Routes = [
  {
      path: '',
      component: SecuritySettingsComponent
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SecuritySettingsRoutingModule { }
