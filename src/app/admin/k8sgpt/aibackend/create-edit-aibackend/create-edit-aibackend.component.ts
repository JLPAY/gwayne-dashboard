import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import { NgForm } from '@angular/forms';
import { MessageHandlerService } from '../../../../shared/message-handler/message-handler.service';
import { ActionType } from '../../../../shared/shared.const';
import { AIBackend } from '../../../../shared/model/v1/aibackend';
import { AIBackendService } from '../../../../shared/client/v1/aibackend.service';

@Component({
  selector: 'create-edit-aibackend',
  templateUrl: 'create-edit-aibackend.component.html',
  styleUrls: ['create-edit-aibackend.component.scss']
})
export class CreateEditAIBackendComponent {
  @Output() create = new EventEmitter<boolean>();
  modalOpened: boolean;
  @ViewChild('ngForm', { static: true })
  currentForm: NgForm;

  backend: AIBackend = new AIBackend();
  checkOnGoing = false;
  isSubmitOnGoing = false;
  isNameValid = true;
  position = 'right-middle';

  title: string;
  actionType: ActionType;

  providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'azureopenai', label: 'Azure OpenAI' },
    { value: 'ollama', label: 'Ollama' },
    { value: 'localai', label: 'LocalAI' },
    { value: 'cohere', label: 'Cohere' },
    { value: 'amazonbedrock', label: 'Amazon Bedrock' },
    { value: 'googlegenai', label: 'Google GenAI' },
    { value: 'googlevertexai', label: 'Google Vertex AI' },
    { value: 'huggingface', label: 'Hugging Face' },
    { value: 'ocigenai', label: 'OCI GenAI' },
    { value: 'watsonxai', label: 'IBM Watsonx AI' },
    { value: 'noopai', label: 'Other AI' }
  ];

  constructor(private aibackendService: AIBackendService,
              private messageHandlerService: MessageHandlerService) {
  }

  newOrEditBackend(id?: number) {
    this.modalOpened = true;
    if (id) {
      this.actionType = ActionType.EDIT;
      this.title = '编辑AI后端';
      this.aibackendService.getById(id).subscribe(
        status => {
          this.backend = status.data;
          // 不显示API密钥
          this.backend.apiKey = '******';
        },
        error => {
          this.messageHandlerService.handleError(error);
        });
    } else {
      this.actionType = ActionType.ADD_NEW;
      this.title = '添加AI后端';
      this.backend = new AIBackend();
    }
  }

  onCancel() {
    this.modalOpened = false;
    this.currentForm.reset();
  }

  onSubmit() {
    if (this.isSubmitOnGoing) {
      return;
    }
    this.isSubmitOnGoing = true;

    // 如果是编辑且API密钥是隐藏的，则不发送API密钥
    if (this.actionType === ActionType.EDIT && this.backend.apiKey === '******') {
      delete this.backend.apiKey;
    }

    switch (this.actionType) {
      case ActionType.ADD_NEW:
        this.aibackendService.create(this.backend).subscribe(
          status => {
            this.isSubmitOnGoing = false;
            this.create.emit(true);
            this.modalOpened = false;
            this.messageHandlerService.showSuccess('创建AI后端成功！');
          },
          error => {
            this.isSubmitOnGoing = false;
            this.modalOpened = false;
            this.messageHandlerService.handleError(error);
          }
        );
        break;
      case ActionType.EDIT:
        this.aibackendService.update(this.backend).subscribe(
          status => {
            this.isSubmitOnGoing = false;
            this.create.emit(true);
            this.modalOpened = false;
            this.messageHandlerService.showSuccess('更新AI后端成功！');
          },
          error => {
            this.isSubmitOnGoing = false;
            this.modalOpened = false;
            this.messageHandlerService.handleError(error);
          }
        );
        break;
    }
  }

  public get isValid(): boolean {
    return this.currentForm &&
      this.currentForm.valid &&
      !this.isSubmitOnGoing &&
      this.isNameValid &&
      !this.checkOnGoing;
  }

  handleValidation(): void {
    const cont = this.currentForm.controls['name'];
    if (cont) {
      this.isNameValid = cont.valid;
    }
  }
}

