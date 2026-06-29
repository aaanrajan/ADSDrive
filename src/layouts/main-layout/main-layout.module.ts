import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MainLayoutRoutingModule } from './main-layout-routing.module';
import { MainLayoutComponent } from './main-layout.component';
import { DashboardComponent } from '../../pages/dashboard/dashboard.component';
import { SharedModule } from '../../shared/shared.module';
import { FormsModule } from '@angular/forms';
import { NotificationModule } from '../../pages/notification/notification.module';


@NgModule({
  declarations: [
    MainLayoutComponent,
    DashboardComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    MainLayoutRoutingModule,
    NotificationModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MainLayoutModule { }
