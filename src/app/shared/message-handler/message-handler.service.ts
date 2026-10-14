import { Inject, Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from '../global-message/message.service';
import { AlertType, httpStatusCode } from '../shared.const';
import { DOCUMENT } from '@angular/common';

@Injectable()
export class MessageHandlerService {

  constructor(private msgService: MessageService,
              private injector: Injector,
              @Inject(DOCUMENT) private document: any) {
  }

  public handleError(err: any | string): void {
    if (!err) {
      return;
    }
    const code = err.statusCode || err.status;
    console.log(err);
    if (code === httpStatusCode.Unauthorized) {
      const currentUrl = document.location.origin;
      if (document.location.pathname !== '/sign-in') {
        this.injector.get(Router).navigateByUrl(`sign-in?ref=${document.location.pathname}`);
      }
    } else {
      this.msgService.announceMessage(code, this.resolveErrorMessage(err, code), AlertType.DANGER);
    }
  }

  /**
   * 提取可读的错误信息；取不到时按状态码给出兜底文案。
   * 背景：网络不可达时 HttpErrorResponse.error 是 ProgressEvent（无 msg 字段）、
   * 网关/代理返回纯文本时 error 是字符串 —— 原实现统一取 err.error.msg 得到
   * undefined，弹窗只剩「错误」标题、正文空白。
   */
  private resolveErrorMessage(err: any, code: number): string {
    const body = err && err.error;
    if (typeof body === 'string' && body.trim() !== '' && !body.trim().startsWith('<')) {
      return body;
    }
    if (body && typeof body.msg === 'string' && body.msg.trim() !== '') {
      return body.msg;
    }
    if (body && typeof body.message === 'string' && body.message.trim() !== '') {
      return body.message;
    }
    if (!code) {
      return '无法连接到服务器，请检查网络连接或后端服务是否正常';
    }
    return '请求失败（HTTP 状态码 ' + code + '）';
  }


  public showError(message: string): void {
    if (message && message.trim() !== '') {
      this.msgService.announceMessage(500, message, AlertType.DANGER);
    }
  }

  public showSuccess(message: string): void {
    if (message && message.trim() !== '') {
      this.msgService.announceMessage(200, message, AlertType.SUCCESS);
    }
  }

  public showInfo(message: string): void {
    if (message && message.trim() !== '') {
      this.msgService.announceMessage(200, message, AlertType.INFO);
    }
  }

  public showWarning(message: string): void {
    if (message && message.trim() !== '') {
      this.msgService.announceMessage(400, message, AlertType.WARNING);
    }
  }

  public clear(): void {
    this.msgService.clear();
  }

  public error(error: any): void {
    this.showError(error);
  }


  public warning(warning: any): void {
    this.showWarning(warning);
  }

  public info(info: any): void {
    this.showSuccess(info);
  }

  public log(log: any): void {
    this.showInfo(log);
  }
}
