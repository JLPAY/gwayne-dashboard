import { Component, OnInit } from '@angular/core';
import { TerminalCommandRuleService, TerminalCommandRule } from '../../shared/client/v1/terminal-command-rule.service';
import { MessageHandlerService } from '../../shared/message-handler/message-handler.service';
import { ConfirmationDialogService } from '../../shared/confirmation-dialog/confirmation-dialog.service';
import { ConfirmationMessage } from '../../shared/confirmation-dialog/confirmation-message';
import { ConfirmationButtons, ConfirmationState, ConfirmationTargets } from '../../shared/shared.const';

@Component({
  selector: 'wayne-terminal-command-rule',
  templateUrl: './terminal-command-rule.component.html',
  styleUrls: ['./terminal-command-rule.component.scss']
})
export class TerminalCommandRuleComponent implements OnInit {
  rules: TerminalCommandRule[] = [];
  currentRule: TerminalCommandRule = {
    role: 'user',
    ruleType: 0,
    command: '',
    description: '',
    enabled: true
  };
  isCreateMode = true;
  modalOpened = false;
  roles = ['admin', 'user'];
  ruleTypes = [
    { value: 0, label: '黑名单' },
    { value: 1, label: '白名单' }
  ];

  constructor(
    private ruleService: TerminalCommandRuleService,
    private messageHandlerService: MessageHandlerService,
    private deletionDialogService: ConfirmationDialogService
  ) {
    this.deletionDialogService.confirmationConfirm$.subscribe(message => {
      if (message && message.state === ConfirmationState.CONFIRMED) {
        if (message.source === ConfirmationTargets.TERMINAL_COMMAND_RULE) {
          this.deleteRule(message.data);
        }
      }
    });
  }

  ngOnInit() {
    this.retrieve();
  }

  retrieve() {
    this.ruleService.listRules().subscribe(
      response => {
        this.rules = response.data || [];
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }

  openModal(rule?: TerminalCommandRule) {
    if (rule) {
      this.currentRule = { ...rule };
      this.isCreateMode = false;
    } else {
      this.currentRule = {
        role: 'user',
        ruleType: 0,
        command: '',
        description: '',
        enabled: true
      };
      this.isCreateMode = true;
    }
    this.modalOpened = true;
  }

  closeModal() {
    this.modalOpened = false;
  }

  save() {
    if (!this.currentRule.command || !this.currentRule.role) {
      this.messageHandlerService.showError('请填写必填字段');
      return;
    }

    // 确保 ruleType 是数字类型
    const ruleToSave = {
      ...this.currentRule,
      ruleType: typeof this.currentRule.ruleType === 'string' 
        ? parseInt(this.currentRule.ruleType, 10) 
        : this.currentRule.ruleType
    };

    if (this.isCreateMode) {
      this.ruleService.createRule(ruleToSave).subscribe(
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
      this.ruleService.updateRule(ruleToSave).subscribe(
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

  deleteRule(rule: TerminalCommandRule) {
    if (!rule.id) {
      return;
    }
    this.ruleService.deleteRule(rule.id).subscribe(
      response => {
        this.messageHandlerService.showSuccess('删除成功');
        this.retrieve();
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }

  confirmDelete(rule: TerminalCommandRule) {
    const deletionMessage = new ConfirmationMessage(
      '删除确认',
      `确定要删除规则 "${rule.command}" 吗？`,
      rule,
      ConfirmationTargets.TERMINAL_COMMAND_RULE,
      ConfirmationButtons.DELETE_CANCEL
    );
    this.deletionDialogService.openComfirmDialog(deletionMessage);
  }

  getRuleTypeName(ruleType: number): string {
    return ruleType === 0 ? '黑名单' : '白名单';
  }

  toggleEnabled(rule: TerminalCommandRule) {
    rule.enabled = !rule.enabled;
    this.ruleService.updateRule(rule).subscribe(
      response => {
        this.messageHandlerService.showSuccess('更新成功');
        this.retrieve();
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }
}

