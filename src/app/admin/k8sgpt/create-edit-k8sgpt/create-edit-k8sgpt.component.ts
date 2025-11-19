import { Component, EventEmitter, OnInit, Output, ViewChild, OnDestroy } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { ActionType } from '../../../shared/shared.const';
import { AIProvider, AIBackend, AIBackendListResponse } from '../../../shared/model/v1/k8sgpt';
import { K8sGPTService } from '../../../shared/client/v1/k8sgpt.service';
import { getFriendlyErrorMessage, SAVE_PROVIDER_ERROR_MESSAGES } from '../../../shared/utils/error-handler.util';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'create-edit-k8sgpt',
  templateUrl: 'create-edit-k8sgpt.component.html',
  styleUrls: ['create-edit-k8sgpt.component.scss']
})
export class CreateEditK8sGPTComponent implements OnInit, OnDestroy {
  @Output() refresh = new EventEmitter<boolean>();
  modalOpened: boolean = false;

  k8sgptForm: NgForm;
  @ViewChild('k8sgptForm', { static: true })
  currentForm: NgForm;

  provider = new AIProvider();
  checkOnGoing = false;
  isSubmitOnGoing = false;
  title: string = '';
  actionType: ActionType;
  backends: AIBackend[] = [];
  selectedBackend: string = '';
  isEditMode: boolean = false; // 用于模板判断
  private subscriptions: Subscription[] = [];

  constructor(
    private messageHandlerService: MessageHandlerService,
    private k8sgptService: K8sGPTService
  ) {
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
  }

  ngOnInit(): void {
    // 先设置默认列表，确保下拉框有选项
    this.setDefaultBackends();
    // 然后尝试从后端获取列表
    this.loadBackends();
  }

  setDefaultBackends() {
    this.backends = [
      { name: 'openai', displayName: 'OpenAI' },
      { name: 'azureopenai', displayName: 'Azure OpenAI' },
      { name: 'cohere', displayName: 'Cohere' },
      { name: 'amazonbedrock', displayName: 'Amazon Bedrock' },
      { name: 'amazonsagemaker', displayName: 'Amazon SageMaker' },
      { name: 'google', displayName: 'Google' },
      { name: 'googlevertexai', displayName: 'Google Vertex AI' },
      { name: 'ollama', displayName: 'Ollama' },
      { name: 'localai', displayName: 'LocalAI' },
      { name: 'huggingface', displayName: 'Hugging Face' },
      { name: 'customrest', displayName: 'Custom REST' },
      { name: 'ibmwatsonxai', displayName: 'IBM Watson X AI' }
    ];
  }

  loadBackends() {
    const sub = this.k8sgptService.listAIBackends().subscribe(
      response => {
        this.handleBackendsResponse(response);
      },
      error => {
        console.error('获取 AI 后端列表失败:', error);
        // 如果后端未实现或请求失败，保持使用默认列表（已在 setDefaultBackends 中设置）
        // 不显示错误提示，因为已经有默认列表可以使用
      }
    );
    this.subscriptions.push(sub);
  }

  private handleBackendsResponse(response: AIBackendListResponse | AIBackend[]): void {
    // 兼容不同的响应格式
    let backendList: AIBackend[] = [];
    
    if (Array.isArray(response)) {
      backendList = response;
    } else if (response && response.data) {
      if (Array.isArray(response.data)) {
        backendList = response.data;
      } else if (typeof response.data === 'object') {
        // 如果 data 是对象，尝试转换为数组
        backendList = Object.keys(response.data).map(key => ({
          name: key,
          displayName: response.data[key].displayName || response.data[key].name || key
        }));
      }
    }
    
    // 验证并清理数据，确保每个后端都有 name 和 displayName
    if (backendList.length > 0) {
      this.backends = backendList.filter(backend => backend && backend.name).map(backend => ({
        name: backend.name || '',
        displayName: backend.displayName || backend.name || '',
        description: backend.description
      }));
    }
    // 如果解析后的列表为空，保持使用默认列表
  }

  newOrEdit(provider?: AIProvider) {
    // 确保后端列表已加载
    if (this.backends.length === 0) {
      this.setDefaultBackends();
    }
    
    this.modalOpened = true;
    if (provider) {
      this.actionType = ActionType.EDIT;
      this.isEditMode = true;
      this.title = '编辑 AI 引擎';
      this.provider = Object.assign({}, provider);
      this.selectedBackend = provider.name;
    } else {
      this.actionType = ActionType.ADD_NEW;
      this.isEditMode = false;
      this.title = '创建 AI 引擎';
      this.provider = new AIProvider();
      this.selectedBackend = '';
    }
  }

  onCancel() {
    this.modalOpened = false;
    this.currentForm.reset();
    this.provider = new AIProvider();
    this.selectedBackend = '';
  }

  onSubmit() {
    if (this.isSubmitOnGoing) {
      return;
    }

    // 表单验证
    if (!this.currentForm.valid) {
      this.messageHandlerService.showError('请填写所有必填项');
      return;
    }

    if (!this.provider.name || !this.provider.name.trim()) {
      this.messageHandlerService.showError('请选择 AI 后端类型');
      return;
    }

    if (!this.provider.password || !this.provider.password.trim()) {
      this.messageHandlerService.showError('请输入 API 密钥');
      return;
    }

    // 验证温度参数范围
    if (this.provider.temperature !== undefined) {
      if (this.provider.temperature < 0 || this.provider.temperature > 1) {
        this.messageHandlerService.showError('温度参数必须在 0 到 1 之间');
        return;
      }
    }

    this.isSubmitOnGoing = true;

    const sub = this.k8sgptService.createAIProvider(this.provider).subscribe(
      response => {
        this.isSubmitOnGoing = false;
        this.messageHandlerService.showSuccess('AI 引擎保存成功！');
        this.modalOpened = false;
        this.currentForm.reset();
        this.refresh.emit(true);
      },
      error => {
        this.isSubmitOnGoing = false;
        
        const errorMessage = getFriendlyErrorMessage(
          error,
          '保存 AI 引擎失败',
          SAVE_PROVIDER_ERROR_MESSAGES
        );
        
        this.messageHandlerService.showError(errorMessage);
      }
    );
    this.subscriptions.push(sub);
  }

  onBackendChange() {
    if (!this.selectedBackend) {
      this.provider.name = '';
      return;
    }

    this.provider.name = this.selectedBackend;
    
    // 设置默认值
    const backend = this.backends.find(b => b && b.name === this.selectedBackend);
    if (!backend) {
      return;
    }

    // 根据不同的后端设置默认值（仅在创建模式下设置，编辑模式保留原有值）
    if (this.actionType === ActionType.ADD_NEW) {
      switch (this.selectedBackend) {
        case 'openai':
          this.provider.baseurl = this.provider.baseurl || 'https://api.openai.com/v1';
          this.provider.model = this.provider.model || 'gpt-3.5-turbo';
          break;
        case 'azureopenai':
          this.provider.baseurl = this.provider.baseurl || '';
          this.provider.model = this.provider.model || '';
          break;
        case 'ollama':
          this.provider.baseurl = this.provider.baseurl || 'http://localhost:11434/v1';
          this.provider.model = this.provider.model || 'llama2';
          break;
        default:
          // 其他后端保持空值，让用户填写
          break;
      }
    }
  }

  trackByBackendName(index: number, backend: AIBackend): string {
    return backend ? backend.name : '';
  }
}


