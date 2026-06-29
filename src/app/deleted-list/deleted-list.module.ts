import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeletedListComponent } from './deleted-list.component';
import { DeletedListRoutingModule } from './deleted-list-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [DeletedListComponent],
  imports: [
    CommonModule,
    DeletedListRoutingModule,
    SharedModule,
    FormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
  
})
export class DeletedListModule { }
