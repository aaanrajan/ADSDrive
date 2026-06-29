import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FavoriteComponent } from './favorite.component';

const routes: Routes = [
  { path: '', component: FavoriteComponent},
    { path: ':rootPath', component: FavoriteComponent },
    { path: '**', redirectTo: 'file-browser' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FavoriteRoutingModule { }
