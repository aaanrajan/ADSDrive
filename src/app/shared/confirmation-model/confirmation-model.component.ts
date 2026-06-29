import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-confirmation-model',
  standalone: false,
  templateUrl: './confirmation-model.component.html',
  styleUrls: ['./confirmation-model.component.scss'],
})
export class ConfirmationModelComponent  implements OnInit {

  @Input() title: string = '';
  @Input() message: string = '';
  @Input() actionBtn: string = '';
  @Input() revertBtnText: string = '';
  @Output() isConfirmed = new EventEmitter<boolean>();

  constructor() { }

  ngOnInit() {}

  closeModel(isAction: boolean) {
    this.isConfirmed.emit(isAction);
  }

}
