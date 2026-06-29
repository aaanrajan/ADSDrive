import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DeletedListComponent } from './deleted-list.component';

const routes: Routes = [
  { path: '', component: DeletedListComponent},
    { path: ':rootPath', component: DeletedListComponent },
    { path: '**', redirectTo: 'file-browser' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DeletedListRoutingModule { }
