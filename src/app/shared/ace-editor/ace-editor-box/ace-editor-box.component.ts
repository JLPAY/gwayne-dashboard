import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import * as ace from 'ace-builds';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-yaml';
import * as YAML from 'js-yaml';
import { AceEditorService } from '../ace-editor.service';
import { AceEditorMsg } from '../ace-editor';
import { MessageHandlerService } from '../../message-handler/message-handler.service';

const ACE_MODE_JSON = 'ace/mode/json';
const ACE_MODE_YAML = 'ace/mode/yaml';
const ACE_MODE_STORAGE_KEY = 'aceMode';

@Component({
  selector: 'wayne-ace-editor-box',
  templateUrl: './ace-editor-box.component.html',
  styleUrls: ['./ace-editor-box.component.scss']
})
export class AceEditorBoxComponent implements OnInit, OnDestroy {

  @ViewChild('editorElement')
  editorElement: ElementRef;
  aceEditorMsg: AceEditorMsg;
  aceMode = ACE_MODE_JSON;
  editor: any;
  @Output() modalChange = new EventEmitter<any>();
  private aceEditorMsgSub: Subscription;

  constructor(
    public el: ElementRef,
    private aceEditorService: AceEditorService,
    private messageHandle: MessageHandlerService) {
  }

  ngOnInit() {
    this.aceEditorMsgSub = this.aceEditorService.aceMessageAnnouncedSource$.subscribe(
      message => {
        this.aceEditorMsg = message;
        this.aceMode = ACE_MODE_JSON;
        this.emitModalState(message);
        this.initEditor();
        // 每次打开都显式设置只读状态：编辑器实例会被复用，不能只依赖「查看模式」那一次设置
        this.editor.setReadOnly(message.edit === false);
        this.editor.setValue(this.stringifyMessage(message.message), -1);
        this.restoreSessionMode();
      }
    );
  }

  setValue(value: string) {
    this.aceMode = ACE_MODE_JSON;
    this.initEditor();
    this.editor.setValue(value, -1);
    this.restoreSessionMode();
  }

  /**
   * 编辑器只在需要时创建；已经创建过则复用（同一个 DOM 容器只允许 ace.edit 一次）
   */
  private initEditor() {
    if (!this.editor) {
      this.editor = ace.edit(this.editorElement.nativeElement, {
        theme: 'ace/theme/textmate',
        fontSize: '16px',
        showPrintMargin: false,
        tabSize: 2,
        useSoftTabs: true,
        scrollPastEnd: 0.5
      });
      // 打包环境里 worker 无法按 basePath 加载，关掉可省一次失败的请求与控制台报错；
      // YAML/JSON 的语法校验由本组件自身的 isValid 完成
      this.editor.getSession().setUseWorker(false);
    }
    this.editor.getSession().setMode(this.aceMode);
  }

  private emitModalState(message: AceEditorMsg) {
    const modalOpened = true;
    let title: string, hiddenFooter: boolean;
    // 这里分为三种情况，不传 edit 时候是嵌套在其他模板中，true 为编辑模板，false 为查看模板。
    if (message.edit !== undefined) {
      if (message.edit) {
        title = '编辑模版';
        hiddenFooter = false;
      } else {
        title = '查看模版';
        hiddenFooter = true;
      }
      title = message.title ? message.title : title;
      const query = { modalOpened, title, hiddenFooter };
      // 这里通过判断 observers.length 来判断是否存在父组件，非官方方法；
      if (this.modalChange.observers.length) {
        this.modalChange.emit(query);
      }
    }
  }

  /**
   * 消息内容可能是 JSON 字符串、YAML 字符串或对象，统一转成 JSON 文本展示；
   * 不是合法 JSON 时原样展示，避免解析失败把编辑器初始化整个打断
   */
  private stringifyMessage(message: any): string {
    if (typeof message === 'string') {
      try {
        return JSON.stringify(JSON.parse(message), null, 2);
      } catch (e) {
        return message;
      }
    }
    return JSON.stringify(message, null, 2);
  }

  private restoreSessionMode() {
    const storedMode = localStorage.getItem(ACE_MODE_STORAGE_KEY);
    if (storedMode === ACE_MODE_YAML) {
      this.aceMode = ACE_MODE_YAML;
      this.aceModeChange();
    }
  }

  ngOnDestroy() {
    if (this.aceEditorMsgSub) {
      this.aceEditorMsgSub.unsubscribe();
    }
    // ace 会在容器上挂 env、在 body 上挂输入框与事件监听，弹窗反复开关不销毁会持续泄漏
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  }

  aceModeChange(mode?: string) {
    if (mode) {
      this.aceMode = mode;
    }
    this.editor.getSession().setMode(this.aceMode);
    const content = this.rawValue();
    if (content.trim() !== '') {
      try {
        const obj = this.aceMode === ACE_MODE_JSON ? YAML.load(content) : JSON.parse(content);
        this.editor.setValue(this.aceMode === ACE_MODE_JSON ? JSON.stringify(obj, null, 2) : YAML.dump(obj), -1);
      } catch (e) {
        // 内容本身不合法时保留原文，由 isValid / 下拉框禁用提示，不再让异常冒到控制台
      }
    }
    localStorage.setItem(ACE_MODE_STORAGE_KEY, this.aceMode);
  }

  format() {
    const content = this.rawValue();
    if (content.trim() === '') {
      return;
    }
    try {
      if (this.aceMode === ACE_MODE_JSON) {
        this.editor.setValue(JSON.stringify(JSON.parse(content), null, 2), -1);
      } else {
        this.editor.setValue(YAML.dump(YAML.load(content)), -1);
      }
    } catch (e) {
      // 格式不合法时保持原样
    }
  }

  getValue() {
    const content = this.rawValue();
    if (this.aceMode === ACE_MODE_JSON) {
      return content;
    }
    try {
      const obj = YAML.load(content);
      return obj === undefined ? '' : JSON.stringify(obj);
    } catch (e) {
      return '';
    }
  }

  private rawValue(): string {
    return this.editor ? this.editor.getValue() : '';
  }

  clickEvent() {
    this.messageHandle.showError('请检查文本格式是否正确');
  }

  get isValid(): boolean {
    const content = this.rawValue();
    if (content.trim() === '') {
      return true;
    }
    try {
      if (this.aceMode === ACE_MODE_JSON) {
        JSON.parse(content);
      } else {
        YAML.load(content);
      }
    } catch (e) {
      return false;
    }
    return true;
  }

}
