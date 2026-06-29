import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationComponent } from './notification.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    NotificationComponent
  ],
  exports: [NotificationComponent]

})
export class NotificationModule { }