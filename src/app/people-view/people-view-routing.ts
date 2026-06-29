import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PeopleViewComponent } from './people-view.component';


const routes: Routes = [
  {
     path: '', component: PeopleViewComponent
  }
];

@NgModule({
  declarations: [],
  imports: [CommonModule,RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PeopleViewRouteModule{ }