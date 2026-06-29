import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecentFilesComponent } from './recent-files.component';
import { SharedModule } from '../../shared/shared.module';
import { FormsModule } from '@angular/forms';
import { RecentFilesRoutingModule } from './recent-files-routing.module';



@NgModule({
  declarations: [
  
  ],
  imports: [
    CommonModule,
    SharedModule,
    RecentFilesRoutingModule,
    FormsModule,
    RecentFilesComponent
  ],
schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RecentFilesModule { }

