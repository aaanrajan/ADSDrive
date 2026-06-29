import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeopleComponent } from './people.component';
import { PeopleRouteModule } from './people-routing-module';
import { SharedModule } from '../../shared/shared.module';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    PeopleComponent,
    PeopleRouteModule,
    SharedModule,
    FormsModule,
    HttpClientModule
  ],
   schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PeopleModule { }
