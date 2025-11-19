import { Component, EventEmitter, OnInit, Output, OnDestroy } from '@angular/core';
import { K8sGPTService } from '../../../shared/client/v1/k8sgpt.service';
import { AIProvider, AIProviderListResponse } from '../../../shared/model/v1/k8sgpt';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { getFriendlyErrorMessage, K8SGPT_ERROR_MESSAGES } from '../../../shared/utils/error-handler.util';
import { Subscription } from 'rxjs/Subscription';
import { timeout, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'list-k8sgpt',
  templateUrl: 'list-k8sgpt.component.html',
  styleUrls: ['list-k8sgpt.component.scss']
})
export class ListK8sGPTComponent implements OnInit, OnDestroy {
  providers: AIProvider[] = [];
  loading: boolean = false;
  private subscription: Subscription;

  @Output() refresh = new EventEmitter<void>();
  @Output() edit = new EventEmitter<AIProvider>();
  @Output() delete = new EventEmitter<AIProvider>();
  @Output() setDefault = new EventEmitter<AIProvider>();

  constructor(
    private k8sgptService: K8sGPTService,
    private messageHandlerService: MessageHandlerService
  ) {
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.retrieve();
  }

  retrieve() {
    this.loading = true;
    this.subscription = this.k8sgptService.listAIProviders()
      .pipe(
        timeout(10000), // 10秒超时
        catchError(error => {
          this.handleRetrieveError(error);
          return throwError(error);
        })
      )
      .subscribe(
        response => {
          this.handleRetrieveSuccess(response);
        },
        error => {
          // 错误已在 catchError 中处理
          this.loading = false;
        }
      );
  }

  private handleRetrieveSuccess(response: AIProviderListResponse | AIProvider[]): void {
    // 兼容不同的响应格式
    let providerList: AIProvider[] = [];
    let defaultProviderName: string = '';
    
    if (Array.isArray(response)) {
      providerList = response;
    } else if (response) {
      // 处理 { providers: [...] } 格式
      if (response.providers && Array.isArray(response.providers)) {
        providerList = response.providers;
        defaultProviderName = response.defaultprovider || response.defaultProvider || '';
      } else if (response.data) {
        // 处理 { data: { providers: [...], defaultprovider: "..." } } 格式
        if (typeof response.data === 'object' && !Array.isArray(response.data)) {
          if (response.data.providers && Array.isArray(response.data.providers)) {
            providerList = response.data.providers;
            defaultProviderName = response.data.defaultprovider || response.data.defaultProvider || '';
          }
        } else if (Array.isArray(response.data)) {
          // 处理 { data: [...] } 格式
          providerList = response.data;
        }
      }
    }
    
    // 设置默认引擎标记并过滤无效数据
    if (providerList.length > 0) {
      this.providers = providerList
        .filter(provider => provider && provider.name && provider.name !== 'undefined')
        .map(provider => {
          // 设置默认引擎标记
          if (defaultProviderName) {
            provider.isDefault = (provider.name === defaultProviderName);
          }
          // 确保 enabled 字段有默认值
          if (provider.enabled === undefined) {
            provider.enabled = true;
          }
          return provider;
        });
    } else {
      this.providers = [];
    }
    
    this.loading = false;
  }

  private handleRetrieveError(error: any): void {
    console.error('获取 AI 引擎列表失败:', error);
    this.providers = [];
    
    const errorMessage = getFriendlyErrorMessage(
      error,
      '获取 AI 引擎列表失败',
      K8SGPT_ERROR_MESSAGES
    );
    
    this.messageHandlerService.showError(errorMessage);
  }

  editProvider(provider: AIProvider) {
    this.edit.emit(provider);
  }

  deleteProvider(provider: AIProvider) {
    this.delete.emit(provider);
  }

  setDefaultProvider(provider: AIProvider) {
    this.setDefault.emit(provider);
  }
}

