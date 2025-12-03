import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ConfirmationDialogService } from '../../../shared/confirmation-dialog/confirmation-dialog.service';
import { ConfirmationMessage } from '../../../shared/confirmation-dialog/confirmation-message';
import { ConfirmationButtons, ConfirmationState, ConfirmationTargets } from '../../../shared/shared.const';
import { Subscription } from 'rxjs/Subscription';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { CreateEditAIBackendComponent } from './create-edit-aibackend/create-edit-aibackend.component';
import { ListAIBackendComponent } from './list-aibackend/list-aibackend.component';
import { AIBackend } from '../../../shared/model/v1/aibackend';
import { AIBackendService } from '../../../shared/client/v1/aibackend.service';

@Component({
  selector: 'wayne-aibackend',
  templateUrl: './aibackend.component.html',
  styleUrls: ['./aibackend.component.scss']
})
export class AIBackendComponent implements OnInit, OnDestroy {
  @ViewChild(ListAIBackendComponent, { static: false })
  list: ListAIBackendComponent;
  @ViewChild(CreateEditAIBackendComponent, { static: false })
  createEdit: CreateEditAIBackendComponent;

  backends: AIBackend[];
  subscription: Subscription;

  constructor(
    private aibackendService: AIBackendService,
    private messageHandlerService: MessageHandlerService,
    private deletionDialogService: ConfirmationDialogService) {
    this.subscription = deletionDialogService.confirmationConfirm$.subscribe(message => {
      if (message &&
        message.state === ConfirmationState.CONFIRMED &&
        message.source === ConfirmationTargets.AI_BACKEND) {
        const id = message.data;
        this.aibackendService
          .delete(id)
          .subscribe(
            response => {
              this.messageHandlerService.showSuccess('AI后端删除成功！');
              this.retrieve();
            },
            error => {
              this.messageHandlerService.handleError(error);
            }
          );
      }
    });
  }

  ngOnInit() {
    this.retrieve();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  retrieve(): void {
    this.aibackendService.list()
      .subscribe(
        response => {
          this.backends = response.data;
        },
        error => this.messageHandlerService.handleError(error)
      );
  }

  createBackend(created: boolean) {
    if (created) {
      this.retrieve();
    }
  }

  openModal(): void {
    this.createEdit.newOrEditBackend();
  }

  deleteBackend(backend: AIBackend) {
    const deletionMessage = new ConfirmationMessage(
      '删除AI后端确认',
      '你确认删除AI后端 ' + backend.name + ' ？',
      backend.id,
      ConfirmationTargets.AI_BACKEND,
      ConfirmationButtons.DELETE_CANCEL
    );
    this.deletionDialogService.openComfirmDialog(deletionMessage);
  }

  editBackend(backend: AIBackend) {
    this.createEdit.newOrEditBackend(backend.id);
  }

  setDefault(backend: AIBackend) {
    this.aibackendService.setDefault(backend.id)
      .subscribe(
        response => {
          this.messageHandlerService.showSuccess('设置默认后端成功！');
          this.retrieve();
        },
        error => {
          this.messageHandlerService.handleError(error);
        }
      );
  }
}

