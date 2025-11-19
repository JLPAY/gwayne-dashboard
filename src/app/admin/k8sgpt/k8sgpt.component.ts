import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ConfirmationDialogService } from '../../shared/confirmation-dialog/confirmation-dialog.service';
import { ConfirmationMessage } from '../../shared/confirmation-dialog/confirmation-message';
import { ConfirmationButtons, ConfirmationState, ConfirmationTargets } from '../../shared/shared.const';
import { Subscription } from 'rxjs/Subscription';
import { MessageHandlerService } from '../../shared/message-handler/message-handler.service';
import { AuthService } from '../../shared/auth/auth.service';
import { K8sGPTService } from '../../shared/client/v1/k8sgpt.service';
import { AIProvider } from '../../shared/model/v1/k8sgpt';
import { ListK8sGPTComponent } from './list-k8sgpt/list-k8sgpt.component';
import { CreateEditK8sGPTComponent } from './create-edit-k8sgpt/create-edit-k8sgpt.component';
import { getFriendlyErrorMessage, DELETE_PROVIDER_ERROR_MESSAGES, SET_DEFAULT_ERROR_MESSAGES } from '../../shared/utils/error-handler.util';

@Component({
  selector: 'wayne-k8sgpt',
  templateUrl: './k8sgpt.component.html',
  styleUrls: ['./k8sgpt.component.scss']
})
export class K8sGPTComponent implements OnInit, OnDestroy {
  @ViewChild(ListK8sGPTComponent, { static: false })
  listK8sGPT: ListK8sGPTComponent;
  @ViewChild(CreateEditK8sGPTComponent, { static: false })
  createEditK8sGPT: CreateEditK8sGPTComponent;

  subscription: Subscription;

  constructor(
    private k8sgptService: K8sGPTService,
    public authService: AuthService,
    private messageHandlerService: MessageHandlerService,
    private deletionDialogService: ConfirmationDialogService
  ) {
    this.subscription = deletionDialogService.confirmationConfirm$.subscribe(message => {
      if (message &&
        message.state === ConfirmationState.CONFIRMED &&
        message.source === ConfirmationTargets.K8SGPT_AI_PROVIDER) {
        const name = message.data;
        this.k8sgptService
          .deleteAIProvider(name)
          .subscribe(
            response => {
              this.messageHandlerService.showSuccess('AI 引擎删除成功！');
              this.retrieve();
            },
            error => {
              const errorMessage = getFriendlyErrorMessage(
                error,
                '删除 AI 引擎失败',
                DELETE_PROVIDER_ERROR_MESSAGES
              );
              this.messageHandlerService.showError(errorMessage);
            }
          );
      }
    });
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  retrieve() {
    if (this.listK8sGPT) {
      this.listK8sGPT.retrieve();
    }
  }

  createAIProvider() {
    if (!this.createEditK8sGPT) {
      console.error('CreateEditK8sGPTComponent 未初始化');
      return;
    }
    this.createEditK8sGPT.newOrEdit();
  }

  editAIProvider(provider: AIProvider) {
    if (!this.createEditK8sGPT) {
      console.error('CreateEditK8sGPTComponent 未初始化');
      return;
    }
    this.createEditK8sGPT.newOrEdit(provider);
  }

  deleteAIProvider(provider: AIProvider) {
    const deletionMessage = new ConfirmationMessage(
      '删除 AI 引擎确认',
      `确认删除 AI 引擎 "${provider.name}" 吗？`,
      provider.name,
      ConfirmationTargets.K8SGPT_AI_PROVIDER,
      ConfirmationButtons.DELETE_CANCEL
    );
    this.deletionDialogService.openComfirmDialog(deletionMessage);
  }

  setDefaultAIProvider(provider: AIProvider) {
    this.k8sgptService
      .setDefaultAIProvider(provider.name)
      .subscribe(
        response => {
          this.messageHandlerService.showSuccess('设置默认 AI 引擎成功！');
          this.retrieve();
        },
        error => {
          const errorMessage = getFriendlyErrorMessage(
            error,
            '设置默认 AI 引擎失败',
            SET_DEFAULT_ERROR_MESSAGES
          );
          this.messageHandlerService.showError(errorMessage);
        }
      );
  }
}

