import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login/login.component';

import { UploadProgressComponent } from './pages/upload-progress/upload-progress.component';

import { AlertHostComponent } from './shared/alert-service/alert-host.component';
import { LoginNavigationComponent } from './pages/login-navigation/login-navigation.component';
import { CommonModule } from '@angular/common';
import { NgxDocViewerModule } from 'ngx-doc-viewer';
import { SharedModule } from './shared/shared.module';

// ⬇️ Translate
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { NotificationModule } from './pages/notification/notification.module';
import { ProvideAccessComponent } from './pages/shared-file/provide-access/provide-access.component';
import { CallbackPageComponent } from './pages/callback-page/callback-page.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    UploadProgressComponent,
    AlertHostComponent,
    LoginNavigationComponent,
    CallbackPageComponent,
    ProvideAccessComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    NgxDocViewerModule,
    IonicModule.forRoot({}),
    TranslateModule.forRoot(), 
    NotificationModule
  ],
  providers: [
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json',
    }),
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
