import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SecuritySettingsRoutingModule } from './security-settings-routing.module';
import { SecuritySettingsComponent } from './security-settings.component';
import { SharedModule } from '../../shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    SecuritySettingsComponent
  ],
  imports: [
    CommonModule,
    SecuritySettingsRoutingModule,
    SharedModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SecuritySettingsModule { }
