import { Component, OnInit } from '@angular/core';
import { MessageHandlerService } from '../../../shared/message-handler/message-handler.service';
import { ConfirmationDialogService } from '../../../shared/confirmation-dialog/confirmation-dialog.service';
import { ConfirmationMessage } from '../../../shared/confirmation-dialog/confirmation-message';
import { ConfirmationButtons, ConfirmationState, ConfirmationTargets } from '../../../shared/shared.const';
import { ConfigService } from '../../../shared/client/v1/config.service';

@Component({
  selector: 'rsa-key-manager',
  templateUrl: 'rsa-key-manager.component.html'
})
export class RsaKeyManagerComponent implements OnInit {

  keyInfo: any = null;
  rotating = false;

  constructor(private configService: ConfigService,
              private messageHandlerService: MessageHandlerService,
              private confirmationDialogService: ConfirmationDialogService) {
    this.confirmationDialogService.confirmationConfirm$.subscribe(message => {
      if (message &&
        message.state === ConfirmationState.CONFIRMED &&
        message.source === ConfirmationTargets.RSA_KEY) {
        this.doRotate();
      }
    });
  }

  ngOnInit(): void {
    this.retrieve();
  }

  retrieve(): void {
    this.configService.getRsaKey().subscribe(
      (response: any) => {
        this.keyInfo = response.data;
      },
      error => this.messageHandlerService.handleError(error)
    );
  }

  rotate(): void {
    const isDb = this.keyInfo && this.keyInfo.mode === 'db';
    const detail = isDb
      ? '轮换后所有新令牌立即使用新密钥签发；旧密钥进入宽限窗口，存量令牌在窗口内仍可正常验签，在线用户不会掉线；' +
        '同时所有使用旧密钥（含泄露密钥）伪造的令牌立即失效。其他副本将在数秒内自动同步，无需重启。确认轮换？'
      : '轮换后所有新令牌立即使用新密钥签发；旧密钥进入宽限窗口并持久化到本地（服务重启后窗口内依然可验签），' +
        '在线用户不会掉线；同时所有使用旧密钥（含泄露密钥）伪造的令牌立即失效。' +
        '注意：file 模式下轮换仅对当前实例生效，多副本部署请使用 RsaKeyStore=db。确认轮换？';
    const message = new ConfirmationMessage(
      '轮换 JWT 签名密钥确认',
      detail,
      null,
      ConfirmationTargets.RSA_KEY,
      ConfirmationButtons.CONFIRM_CANCEL
    );
    this.confirmationDialogService.openComfirmDialog(message);
  }

  doRotate(): void {
    this.rotating = true;
    this.configService.rotateRsaKey().subscribe(
      (response: any) => {
        this.rotating = false;
        this.keyInfo = response.data;
        const isDb = response.data && response.data.mode === 'db';
        this.messageHandlerService.showSuccess(
          isDb ? '签名密钥轮换成功，其他副本将在数秒内自动同步' : '签名密钥轮换成功，旧密钥已进入宽限窗口');
      },
      error => {
        this.rotating = false;
        this.messageHandlerService.handleError(error);
      }
    );
  }

  modeLabel(mode: string): string {
    return mode === 'db' ? '数据库（多副本共享）' : '本地文件';
  }
}
