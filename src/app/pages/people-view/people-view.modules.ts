import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { PeopleViewComponent } from './people-view.component';
import { PeopleViewRouteModule } from './people-view-routing';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    PeopleViewComponent,
    HttpClientModule,
    PeopleViewRouteModule
  ],
   schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PeopleViewModule { }
