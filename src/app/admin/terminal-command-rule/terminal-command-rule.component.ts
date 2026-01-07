import { Component, OnInit } from '@angular/core';
import { TerminalCommandRuleService, TerminalCommandRule } from '../../shared/client/v1/terminal-command-rule.service';
import { MessageHandlerService } from '../../shared/message-handler/message-handler.service';
import { ConfirmationDialogService } from '../../shared/confirmation-dialog/confirmation-dialog.service';
import { ConfirmationMessage } from '../../shared/confirmation-dialog/confirmation-message';
import { ConfirmationButtons, ConfirmationState, ConfirmationTargets } from '../../shared/shared.const';
import { ClusterService } from '../../shared/client/v1/cluster.service';

@Component({
  selector: 'wayne-terminal-command-rule',
  templateUrl: './terminal-command-rule.component.html',
  styleUrls: ['./terminal-command-rule.component.scss']
})
export class TerminalCommandRuleComponent implements OnInit {
  rules: TerminalCommandRule[] = [];
  currentRule: TerminalCommandRule = {
    role: 'user',
    cluster: '',
    ruleType: 0,
    command: '',
    description: '',
    enabled: true
  };
  isCreateMode = true;
  modalOpened = false;
  roles = ['admin', 'user'];
  clusters: string[] = [];
  ruleTypes = [
    { value: 0, label: '黑名单' },
    { value: 1, label: '白名单' }
  ];

  constructor(
    private ruleService: TerminalCommandRuleService,
    private messageHandlerService: MessageHandlerService,
    private deletionDialogService: ConfirmationDialogService,
    private clusterService: ClusterService
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
    this.loadClusters();
    this.retrieve();
  }

  loadClusters() {
    this.clusterService.getNames().subscribe(
      response => {
        // 后端返回的是 Cluster 对象数组，需要提取 name 字段
        const clusterData = response.data || [];
        this.clusters = clusterData.map((cluster: any) => cluster.name || cluster).filter((name: string) => name);
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
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
      // 编辑模式：将逗号分隔的命令转换为换行分隔，便于在 textarea 中显示
      this.currentRule = {
        ...rule,
        command: this.formatCommandForDisplay(rule.command)
      };
      this.isCreateMode = false;
    } else {
      this.currentRule = {
        role: 'user',
        cluster: '',
        ruleType: 0,
        command: '',
        description: '',
        enabled: true
      };
      this.isCreateMode = true;
    }
    this.modalOpened = true;
  }

  // 将命令格式化为显示格式（逗号转换行）
  private formatCommandForDisplay(command: string): string {
    if (!command) {
      return '';
    }
    // 将逗号分隔的命令转换为换行分隔
    return command.split(',').map(cmd => cmd.trim()).filter(cmd => cmd).join('\n');
  }

  // 将命令格式化为保存格式（统一为逗号分隔）
  private formatCommandForSave(command: string): string {
    if (!command) {
      return '';
    }
    // 先按换行符分割，再按逗号分割，然后合并去重并去除空值
    const commands = command
      .split(/[\n,]/)
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && cmd.length > 0);
    // 去重
    const uniqueCommands = [...new Set(commands)];
    return uniqueCommands.join(',');
  }

  closeModal() {
    this.modalOpened = false;
  }

  save() {
    if (!this.currentRule.command || !this.currentRule.role) {
      this.messageHandlerService.showError('请填写必填字段');
      return;
    }

    // 确保 cluster 字段存在（如果未选择，设置为空字符串表示所有集群）
    if (this.currentRule.cluster === undefined || this.currentRule.cluster === null) {
      this.currentRule.cluster = '';
    }

    // 格式化命令：统一转换为逗号分隔格式（后端要求）
    const formattedCommand = this.formatCommandForSave(this.currentRule.command);
    if (!formattedCommand) {
      this.messageHandlerService.showError('命令模式不能为空');
      return;
    }

    // 确保 ruleType 是数字类型
    const ruleToSave = {
      ...this.currentRule,
      command: formattedCommand,
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

