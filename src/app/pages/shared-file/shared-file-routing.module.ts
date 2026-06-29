import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedFileComponent } from './shared-file.component';

const routes: Routes = [
  {
    path: '',
    component: SharedFileComponent
  },
   { path: ':rootPath', component: SharedFileComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SharedFileRoutingModule { }
