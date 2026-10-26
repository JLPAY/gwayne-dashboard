import { Component, OnInit } from '@angular/core';
import { LLMModelService, LLMModel, LLMModelTestResult } from '../../shared/client/v1/llm-model.service';
import { MessageHandlerService } from '../../shared/message-handler/message-handler.service';
import { ConfirmationDialogService } from '../../shared/confirmation-dialog/confirmation-dialog.service';
import { ConfirmationMessage } from '../../shared/confirmation-dialog/confirmation-message';
import { ConfirmationButtons, ConfirmationState, ConfirmationTargets } from '../../shared/shared.const';

@Component({
  selector: 'wayne-llm-model',
  templateUrl: './llm-model.component.html',
  styleUrls: ['./llm-model.component.scss']
})
export class LLMModelComponent implements OnInit {
  models: LLMModel[] = [];
  currentModel: LLMModel = this.emptyModel();
  isCreateMode = true;
  modalOpened = false;
  testingId: number | null = null;
  testResult: { modelName: string; result: LLMModelTestResult } | null = null;
  // 弹窗内保存前测试状态
  testingModal = false;
  modalTestResult: LLMModelTestResult | null = null;

  providers = [
    { value: 'deepseek', label: 'DeepSeek（默认地址 api.deepseek.com）' },
    { value: 'openai', label: 'OpenAI（默认地址 api.openai.com/v1）' },
    { value: 'moonshot', label: 'Moonshot / Kimi' },
    { value: 'zhipu', label: '智谱 GLM' },
    { value: 'ollama', label: 'Ollama（本地）' },
    { value: 'azure', label: 'Azure OpenAI' },
    { value: 'custom', label: '自定义（OpenAI 兼容接口）' }
  ];

  constructor(
    private modelService: LLMModelService,
    private messageHandlerService: MessageHandlerService,
    private deletionDialogService: ConfirmationDialogService
  ) {
    this.deletionDialogService.confirmationConfirm$.subscribe(message => {
      if (message && message.state === ConfirmationState.CONFIRMED) {
        if (message.source === ConfirmationTargets.LLM_MODEL) {
          this.deleteModel(message.data);
        }
      }
    });
  }

  ngOnInit() {
    this.retrieve();
  }

  private emptyModel(): LLMModel {
    return {
      name: '',
      provider: 'deepseek',
      apiKey: '',
      baseURL: '',
      model: '',
      temperature: 0.7,
      enabled: true,
      isDefault: false,
      description: ''
    };
  }

  retrieve() {
    this.modelService.listModels().subscribe(
      response => {
        this.models = response.data || [];
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }

  openModal(model?: LLMModel) {
    this.modalTestResult = null;
    if (model) {
      this.currentModel = { ...model };
      this.isCreateMode = false;
      // 编辑时不回显密钥（列表接口返回的是掩码值），留空表示保持原密钥不变
      this.currentModel.apiKey = '';
    } else {
      this.currentModel = this.emptyModel();
      this.isCreateMode = true;
    }
    this.modalOpened = true;
  }

  closeModal() {
    this.modalOpened = false;
  }

  save() {
    if (!this.currentModel.name || !this.currentModel.provider || !this.currentModel.model) {
      this.messageHandlerService.showError('请填写名称、提供商和模型名称');
      return;
    }
    if (this.currentModel.temperature === undefined || this.currentModel.temperature === null) {
      this.currentModel.temperature = 0.7;
    }

    if (this.isCreateMode) {
      this.modelService.createModel(this.currentModel).subscribe(
        response => {
          this.messageHandlerService.showSuccess('创建成功');
          this.closeModal();
          this.retrieve();
        },
        error => {
          this.messageHandlerService.handleError(error);
        }
      );
    } else {
      this.modelService.updateModel(this.currentModel).subscribe(
        response => {
          this.messageHandlerService.showSuccess('更新成功');
          this.closeModal();
          this.retrieve();
        },
        error => {
          this.messageHandlerService.handleError(error);
        }
      );
    }
  }

  deleteModel(model: LLMModel) {
    if (!model.id) {
      return;
    }
    this.modelService.deleteModel(model.id).subscribe(
      response => {
        this.messageHandlerService.showSuccess('删除成功');
        this.retrieve();
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }

  confirmDelete(model: LLMModel) {
    const deletionMessage = new ConfirmationMessage(
      '删除确认',
      `确定要删除模型 "${model.name}" 吗？`,
      model,
      ConfirmationTargets.LLM_MODEL,
      ConfirmationButtons.DELETE_CANCEL
    );
    this.deletionDialogService.openComfirmDialog(deletionMessage);
  }

  toggleEnabled(model: LLMModel) {
    model.enabled = !model.enabled;
    this.modelService.updateModel(model).subscribe(
      response => {
        this.messageHandlerService.showSuccess('更新成功');
        this.retrieve();
      },
      error => {
        this.messageHandlerService.handleError(error);
        this.retrieve();
      }
    );
  }

  setDefault(model: LLMModel) {
    if (!model.id) {
      return;
    }
    this.modelService.setDefaultModel(model.id).subscribe(
      response => {
        this.messageHandlerService.showSuccess(`已将 "${model.name}" 设为默认模型`);
        this.retrieve();
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }

  testModel(model: LLMModel) {
    if (!model.id || this.testingId) {
      return;
    }
    this.testingId = model.id;
    this.testResult = null;
    this.modelService.testModel(model.id).subscribe(
      response => {
        const result: LLMModelTestResult = response.data;
        this.testResult = { modelName: model.name, result };
        if (result.success) {
          this.messageHandlerService.showSuccess(`模型 "${model.name}" 连接成功（${result.durationMs}ms）`);
        } else {
          this.messageHandlerService.showError(`模型 "${model.name}" 连接失败: ${result.error}`);
        }
        this.testingId = null;
      },
      error => {
        this.messageHandlerService.handleError(error);
        this.testingId = null;
      }
    );
  }

  // testModalConfig 保存前测试：用弹窗表单的当前值直接发起真实调用，无需先保存
  testModalConfig() {
    if (this.testingModal) {
      return;
    }
    if (!this.currentModel.provider || !this.currentModel.model) {
      this.messageHandlerService.showError('测试前请先填写提供商和模型名称');
      return;
    }
    this.testingModal = true;
    this.modalTestResult = null;
    this.modelService.testModelConfig({
      id: this.currentModel.id,
      provider: this.currentModel.provider,
      apiKey: this.currentModel.apiKey,
      baseURL: this.currentModel.baseURL,
      model: this.currentModel.model,
      temperature: this.currentModel.temperature
    }).subscribe(
      response => {
        this.modalTestResult = response.data as LLMModelTestResult;
        this.testingModal = false;
      },
      error => {
        this.messageHandlerService.handleError(error);
        this.testingModal = false;
      }
    );
  }

  getProviderLabel(provider: string): string {
    const found = this.providers.find(p => p.value === provider);
    return found ? found.label.split('（')[0] : provider;
  }
}
