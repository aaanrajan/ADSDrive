import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedFileRoutingModule } from './shared-file-routing.module';
import { SharedFileComponent } from './shared-file.component';
import { SharedModule } from '../../shared/shared.module';


@NgModule({
  declarations: [
    SharedFileComponent
  ],
  imports: [
    CommonModule,
    SharedFileRoutingModule,
    SharedModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedFileModule { }
