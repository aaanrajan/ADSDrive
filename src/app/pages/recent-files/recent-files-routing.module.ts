import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RecentFilesComponent } from './recent-files.component';

const routes: Routes = [
  { path: '', component: RecentFilesComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RecentFilesRoutingModule { }
