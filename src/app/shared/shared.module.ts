import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from './page-header/page-header.component';
import { FileViewComponent } from '../pages/file-view/file-view.component';
import { NgxDocViewerModule } from 'ngx-doc-viewer';
import { FilePreviewComponent } from '../pages/file-preview/file-preview.component';
import { ShoelaceFormControlsModule } from 'shoelace-style-angular/form-controls';
import { TooltipDirective } from './directives/tooltip.directive';
import { TooltipComponent } from './tooltip/tooltip.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FileShareModelComponent } from '../pages/shared-file/file-share-model/file-share-model.component';
import { SharePreviewComponent } from '../pages/shared-file/share-preview/share-preview.component';
import { RightSideBarComponent } from '../right-side-bar/right-side-bar.component';
import { TranslateModule } from '@ngx-translate/core';
import { MoveComponent } from '../move/move.component';
import { SwitchAccountDialogComponent } from './components/switch-account-dialog/switch-account-dialog.component';
import { ConfirmationModelComponent } from './confirmation-model/confirmation-model.component';



@NgModule({
  declarations: [
    PageHeaderComponent,
    FileViewComponent,
    FilePreviewComponent,
    TooltipDirective,
    TooltipComponent,
    FileShareModelComponent,
    SharePreviewComponent,
    SwitchAccountDialogComponent,
    ConfirmationModelComponent
  ],
  imports: [
    CommonModule,
    NgxDocViewerModule,
    ShoelaceFormControlsModule,
    FormsModule,
    ReactiveFormsModule,
    RightSideBarComponent,
    MoveComponent,
    TranslateModule.forChild()
  ],
  exports: [
    PageHeaderComponent,
    FileViewComponent,
    FilePreviewComponent,
    TooltipDirective,
    TooltipComponent,
    FileShareModelComponent,
    SharePreviewComponent,
    SwitchAccountDialogComponent,
    TranslateModule,
    ConfirmationModelComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule { }
