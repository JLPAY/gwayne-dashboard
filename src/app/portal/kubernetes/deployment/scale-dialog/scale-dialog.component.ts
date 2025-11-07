import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'wayne-scale-dialog',
  templateUrl: './scale-dialog.component.html',
  styleUrls: ['./scale-dialog.component.scss']
})
export class ScaleDialogComponent implements OnInit {
  @Input() obj: any;
  @Input() cluster: string;
  @Output() scaleConfirmed = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<any>();

  replicas: number;
  isOpen = false;

  constructor(private translate: TranslateService) {}

  ngOnInit() {
    if (this.obj && this.obj.spec) {
      this.replicas = this.obj.spec.replicas || 0;
    } else {
      this.replicas = 0;
    }
  }

  open() {
    this.isOpen = true;
    if (this.obj && this.obj.spec) {
      this.replicas = this.obj.spec.replicas || 0;
    } else {
      this.replicas = 0;
    }
  }

  close() {
    this.isOpen = false;
    this.cancel.emit();
  }

  confirm() {
    if (this.replicas < 0) {
      return;
    }
    this.scaleConfirmed.emit({
      replicas: this.replicas,
      obj: this.obj
    });
    this.close();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.confirm();
    } else if (event.key === 'Escape') {
      this.close();
    }
  }
}

