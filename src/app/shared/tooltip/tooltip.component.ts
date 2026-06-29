import { Component, Input, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-tooltip',
  standalone:false,
  template: `
    <div class="custom-tooltip">
      <div class="tooltip-arrow"></div>
      <div class="tooltip-content">
        <ng-container *ngIf="template; else elseBlock">
          <ng-container *ngTemplateOutlet="template"></ng-container>
        </ng-container>

        <ng-template #elseBlock>
          <ng-container *ngIf="htmlContent; else textBlock">
            <div [innerHTML]="htmlContent"></div>
          </ng-container>

          <ng-template #textBlock>{{ content }}</ng-template>
        </ng-template>
      </div>
    </div>
  `,
})
export class TooltipComponent {
  @Input() content: string = '';
  @Input() htmlContent: string = '';
  @Input() template?: TemplateRef<any>;
}
