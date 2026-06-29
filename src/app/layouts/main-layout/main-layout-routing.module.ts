import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component';
import { DashboardComponent } from '../../pages/dashboard/dashboard.component';
import { PeopleModule } from '../../pages/people/people-module';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: 'home', component: DashboardComponent },
      { 
        path: 'my-files', 
        loadChildren: () => import('../../pages/home/home.module').then(m => m.HomeModule)
      },
      {
        path: 'favorites',
        loadChildren: () => import('../../pages/favorite/favorite.module').then(m => m.FavoriteModule)
      },
      {
        path: 'shared',
        loadChildren: () => import('../../pages/shared-file/shared-file.module').then(m => m.SharedFileModule)
      },
      {
        path: 'file-upload',
        loadChildren: () => import('../../pages/file-upload/file-upload.module').then(m => m.FileUploadModule)
      },
      {
        path: 'trash',
        loadChildren: () => import('../../pages/deleted-list/deleted-list.module').then(m => m.DeletedListModule)
      },
      { 
        path: 'setting', 
        loadChildren: () => import('../../pages/setting/setting.module').then(m => m.SettingModule)
      },
      { 
        path: 'security-settings', 
        loadChildren: () => import('../../pages/security-settings/security-settings.module').then(m => m.SecuritySettingsModule)
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'recent',
        loadChildren: () => import('../../pages/recent-files/recent-files.module').then(m => m.RecentFilesModule)
      },
        {
        path: 'media',
        loadChildren: () => import('../../pages/media/media.module').then(m => m.MediaModule)
      },
        {
        path: 'people',
        loadChildren: () => import('../../pages/people/people-module').then(m => m.PeopleModule)
      },
      {
        path: 'people-view',
        loadChildren: () => import('../../pages/people-view/people-view.modules').then(m => m.PeopleViewModule)
      },
      {
        path: 'notes',
        loadChildren: () => import('../../pages/notes/notes.module').then(m => m.NotesModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainLayoutRoutingModule { }
