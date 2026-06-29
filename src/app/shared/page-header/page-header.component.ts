import { Component, EventEmitter, input, Input, Output } from '@angular/core';

@Component({
  standalone: false,
selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss'
})
export class PageHeaderComponent {

  @Output() breadcrumbClicked = new EventEmitter<any>();

  @Input() title = '';
  @Input() subtitle = '';
  @Input() breadcrums: any[] = [];

  onBreadcrumbClick(item: any) {
  this.breadcrumbClicked.emit(item);
}

}
