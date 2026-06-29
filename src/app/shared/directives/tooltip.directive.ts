import { Directive, Input, HostListener, ElementRef, Renderer2, TemplateRef, ComponentFactoryResolver, ComponentRef, ViewContainerRef, NgZone } from '@angular/core';
import { TooltipComponent } from '../tooltip/tooltip.component';

@Directive({
  selector: '[appTooltip]',
  standalone: false
})
export class TooltipDirective {
 @Input('appTooltip') tooltipContent: string = '';
  @Input() tooltipMultiline: boolean = false;
  @Input() tooltipHtml?: string;
  @Input() tooltipTemplate?: TemplateRef<any>;
  @Input() tooltipContext?: any; // <-- dynamic template context

  private lastMouseEvent?: MouseEvent;
  private tooltipElement: HTMLElement | null = null;
  private arrowElement: HTMLElement | null = null;
  private tooltipPositioned: boolean = false;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private viewContainerRef: ViewContainerRef, // use this to attach templates
    private ngZone: NgZone
  ) {}

  @HostListener('mouseenter', ['$event'])
  onMouseEnter(event: MouseEvent) {
    this.lastMouseEvent = event;
    if (!this.tooltipElement) {
      this.createTooltip();
      this.setPosition(event);
    }
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.destroyTooltip();
    this.tooltipPositioned = false;
  }

  private setPosition(event: MouseEvent) {
    if (!this.tooltipElement || !this.arrowElement || this.tooltipPositioned) return;

    const offset = 12; // distance from cursor
    const tooltipRect = this.tooltipElement.getBoundingClientRect();

    // Default above cursor
    let top = event.pageY - tooltipRect.height - offset;
    let arrowClass = 'arrow-bottom';

    // If tooltip would go above viewport, place below
    if (top < window.scrollY) {
      top = event.pageY + offset;
      arrowClass = 'arrow-top';
    }

    let left = event.pageX - tooltipRect.width / 2;

    // Prevent overflow left/right
    if (left < 0) left = 4;
    if (left + tooltipRect.width > window.scrollX + window.innerWidth) {
      left = window.scrollX + window.innerWidth - tooltipRect.width - 4;
    }

    this.renderer.setStyle(this.tooltipElement, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);

    // Position arrow horizontally
    const arrowLeft = event.pageX - left - 6; // arrow width = 12px
    this.renderer.setStyle(this.arrowElement, 'left', `${arrowLeft}px`);

    // Set arrow direction
    this.renderer.removeClass(this.arrowElement, 'arrow-top');
    this.renderer.removeClass(this.arrowElement, 'arrow-bottom');
    this.renderer.addClass(this.arrowElement, arrowClass);

    this.tooltipPositioned = true;
  }

private createTooltip() {
  this.tooltipElement = this.renderer.createElement('div');
  this.renderer.addClass(this.tooltipElement, 'custom-tooltip');

  this.arrowElement = this.renderer.createElement('div');
  this.renderer.addClass(this.arrowElement, 'custom-tooltip-arrow');
  this.renderer.appendChild(this.tooltipElement, this.arrowElement);

  const contentDiv = this.renderer.createElement('div');
  this.renderer.addClass(contentDiv, 'custom-tooltip-content');

  // Render dynamic content
  if (this.tooltipTemplate) {
    const viewRef = this.tooltipTemplate.createEmbeddedView(this.tooltipContext || {});
    this.viewContainerRef.insert(viewRef);
    viewRef.rootNodes.forEach(node => this.renderer.appendChild(contentDiv, node));
  } else if (this.tooltipHtml) {
    contentDiv.innerHTML = this.tooltipHtml;
  } else if (this.tooltipMultiline) {
    this.tooltipContent.split('\n').forEach(line => {
      const div = this.renderer.createElement('div');
      const text = this.renderer.createText(line);
      this.renderer.appendChild(div, text);
      this.renderer.appendChild(contentDiv, div);
    });
  } else {
    contentDiv.innerText = this.tooltipContent;
  }
 this.renderer.appendChild(this.tooltipElement, contentDiv);
  this.renderer.appendChild(document.body, this.tooltipElement);
  this.renderer.setStyle(this.tooltipElement, 'opacity', '1');

  // Wait until Angular renders the template
  this.ngZone.runOutsideAngular(() => {
    requestAnimationFrame(() => {
      this.setPosition(this.lastMouseEvent!);
    });
  });
}


  private destroyTooltip() {
    if (this.tooltipElement) {
      this.renderer.removeChild(document.body, this.tooltipElement);
      this.tooltipElement = null;
      this.arrowElement = null;
    }
  }
  // @HostListener('mousemove', ['$event']) onMouseMove(event: MouseEvent) {
  //   if (!this.tooltipElement || !this.arrowElement) return;

  //   const offset = 12; // space between cursor and tooltip
  //   const tooltipRect = this.tooltipElement.getBoundingClientRect();

  //   // Default above cursor
  //   let top = event.pageY - tooltipRect.height - offset;
  //   let arrowClass = 'arrow-bottom';

  //   // If tooltip would go above viewport, place below cursor
  //   if (top < window.scrollY) {
  //     top = event.pageY + offset;
  //     arrowClass = 'arrow-top';
  //   }

  //   let left = event.pageX - tooltipRect.width / 2;

  //   // Prevent overflow on left/right edges
  //   if (left < 0) left = 4;
  //   if (left + tooltipRect.width > window.scrollX + window.innerWidth) {
  //     left = window.scrollX + window.innerWidth - tooltipRect.width - 4;
  //   }

  //   this.renderer.setStyle(this.tooltipElement, 'top', `${top}px`);
  //   this.renderer.setStyle(this.tooltipElement, 'left', `${left}px`);

  //   // Position arrow relative to cursor
  //   const arrowLeft = event.pageX - left - 6; // arrow width = 12px
  //   this.renderer.setStyle(this.arrowElement, 'left', `${arrowLeft}px`);

  //   // Set arrow direction
  //   this.renderer.removeClass(this.arrowElement, 'arrow-top');
  //   this.renderer.removeClass(this.arrowElement, 'arrow-bottom');
  //   this.renderer.addClass(this.arrowElement, arrowClass);
  // }

}
