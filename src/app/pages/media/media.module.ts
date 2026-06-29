import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaComponent } from './media.component';
import { MediaRoutingModule } from './media-routing.module';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    MediaRoutingModule,
    MediaComponent
    
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MediaModule {}
