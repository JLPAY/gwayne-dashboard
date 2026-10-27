import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import * as YAML from 'js-yaml';
import { MessageHandlerService } from '../../../../shared/message-handler/message-handler.service';
import { AceEditorBoxComponent } from '../../../../shared/ace-editor/ace-editor-box/ace-editor-box.component';

class KV {
  key: string;
  value: string;
}

const EXAMPLE_YAML = `# Namespace 资源示例（可直接修改后提交）
apiVersion: v1
kind: Namespace
metadata:
  name: demo-namespace     # 必填：小写字母、数字、中划线，最长 63 字符
  labels:                  # 可选：标签
    app: demo
    team: ops
  annotations:             # 可选：注解
    owner: ops-team
`;

// K8s 命名空间名称的 DNS-1123 校验规则
const NAME_PATTERN = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const NAME_MAX_LENGTH = 63;

@Component({
  selector: 'create-namespace-form',
  templateUrl: 'create-namespace-form.component.html',
  styleUrls: ['create-namespace-form.component.scss']
})
export class CreateNamespaceFormComponent {
  opened = false;
  mode: 'form' | 'yaml' = 'form';
  isSubmitOnGoing = false;

  /** 非空表示编辑模式（值为原对象）；null 表示创建模式 */
  editObj: any = null;

  name = '';
  labels: KV[] = [];
  annotations: KV[] = [];

  /** 是否已向 YAML 编辑器灌入过示例（只在首次进入 YAML 模式时灌入） */
  private yamlInited = false;

  /** 编辑模式下是否已向 YAML 编辑器灌入过原对象（只在首次进入 YAML 模式时灌入） */
  private editYamlInited = false;

  /** 切到 YAML 模式时的编辑器内容快照；切回表单时仅当内容被改过才回填，避免覆盖表单数据 */
  private yamlSnapshot = '';

  @ViewChild(AceEditorBoxComponent)
  aceBox: AceEditorBoxComponent;

  @Output() create = new EventEmitter<any>();

  @Output() save = new EventEmitter<any>();

  constructor(private messageHandlerService: MessageHandlerService) {
  }

  open() {
    this.opened = true;
    this.mode = 'form';
    this.editObj = null;
    this.name = '';
    this.labels = [];
    this.annotations = [];
    this.isSubmitOnGoing = false;
    this.yamlInited = false;
    this.yamlSnapshot = '';
  }

  /**
   * 编辑模式：带入完整原对象；表单展示名称（只读）与标签/注解，
   * YAML 模式展示完整原对象，保存统一 emit save。
   */
  openEdit(obj: any) {
    this.opened = true;
    this.mode = 'form';
    this.editObj = obj || null;
    this.name = obj && obj.metadata ? (obj.metadata.name || '') : '';
    this.labels = this.expandKV(obj && obj.metadata ? obj.metadata.labels : null);
    this.annotations = this.expandKV(obj && obj.metadata ? obj.metadata.annotations : null);
    this.isSubmitOnGoing = false;
    this.yamlInited = false;
    this.editYamlInited = false;
    this.yamlSnapshot = '';
  }

  onCancel() {
    this.opened = false;
  }

  isNameValid(): boolean {
    const name = this.name.trim();
    return name.length > 0 && name.length <= NAME_MAX_LENGTH && NAME_PATTERN.test(name);
  }

  canSubmit(): boolean {
    if (this.isSubmitOnGoing) {
      return false;
    }
    if (this.mode === 'form') {
      // 编辑模式名称只读，表单必有有效值
      return this.editObj ? true : this.isNameValid();
    }
    return this.aceBox && this.aceBox.isValid;
  }

  /**
   * 表单 → YAML：把当前表单内容生成 YAML 放进编辑器；首次进入时预填
   * （创建模式预填 example，编辑模式预填原对象完整 YAML）
   */
  switchMode(mode: 'form' | 'yaml') {
    if (mode === this.mode) {
      return;
    }
    if (mode === 'yaml') {
      // 先切模式让 YAML 面板渲染（*ngIf），下一拍再初始化编辑器，否则 aceBox 尚不存在
      this.mode = 'yaml';
      setTimeout(() => {
        if (!this.aceBox) {
          return;
        }
        const content = this.editObj
          ? YAML.dump(this.editYamlInited ? this.buildEditObjFromForm() : this.editObj, {lineWidth: -1})
          : JSON.stringify(this.buildObjFromForm(), null, 2);
        this.aceBox.setValue(content);
        if (this.editObj) {
          // 编辑模式内容是 YAML 文本，必须确保编辑器处于 yaml 模式（否则按 json 解析会失败）
          this.ensureYamlMode();
          this.editYamlInited = true;
        } else if (!this.yamlInited) {
          this.showExampleInYaml();
          this.yamlInited = true;
        }
        this.yamlSnapshot = this.aceBox.editor.getValue();
      });
      return;
    }
    // YAML → 表单：内容未被改过则直接保留表单原数据；被改过才解析回填（失败则留在 YAML 模式，防脏数据）
    if (this.aceBox && this.aceBox.editor &&
      this.aceBox.editor.getValue().trim() !== this.yamlSnapshot.trim()) {
      if (!this.applyYamlToForm()) {
        return;
      }
    }
    this.mode = 'form';
  }

  fillExample() {
    if (this.aceBox && this.aceBox.editor) {
      this.showExampleInYaml();
    }
  }

  /** 编辑模式：丢弃当前修改，恢复为原对象内容 */
  resetToOriginal() {
    if (!this.editObj || !this.aceBox || !this.aceBox.editor) {
      return;
    }
    this.aceBox.editor.setValue(YAML.dump(this.editObj, {lineWidth: -1}), -1);
    this.ensureYamlMode();
    this.yamlSnapshot = this.aceBox.editor.getValue();
  }

  /** 向编辑器写入示例 YAML，并保证编辑器处于 yaml 模式（注释只有 yaml 模式才能保留） */
  private showExampleInYaml() {
    const box = this.aceBox;
    if (!box || !box.editor) {
      return;
    }
    box.editor.setValue(EXAMPLE_YAML, -1);
    this.ensureYamlMode();
  }

  private ensureYamlMode() {
    const box = this.aceBox;
    if (!box || !box.editor) {
      return;
    }
    if (box.aceMode !== 'ace/mode/yaml') {
      box.aceMode = 'ace/mode/yaml';
      box.editor.getSession().setMode('ace/mode/yaml');
      localStorage.setItem('aceMode', box.aceMode);
    }
  }

  onAddKV(list: KV[]) {
    list.push({'key': '', 'value': ''});
  }

  /** 汇总表单输入为 Namespace 资源对象 */
  private buildObjFromForm(): any {
    const obj: any = {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {name: this.name.trim() || 'demo-namespace'}
    };
    const labels = this.compactKV(this.labels);
    const annotations = this.compactKV(this.annotations);
    if (Object.keys(labels).length > 0) {
      obj.metadata.labels = labels;
    }
    if (Object.keys(annotations).length > 0) {
      obj.metadata.annotations = annotations;
    }
    return obj;
  }

  /** 编辑模式：基于原对象克隆，仅更新表单可编辑的 labels / annotations */
  private buildEditObjFromForm(): any {
    const obj = JSON.parse(JSON.stringify(this.editObj));
    if (!obj.metadata) {
      obj.metadata = {};
    }
    const labels = this.compactKV(this.labels);
    const annotations = this.compactKV(this.annotations);
    if (Object.keys(labels).length > 0) {
      obj.metadata.labels = labels;
    } else {
      delete obj.metadata.labels;
    }
    if (Object.keys(annotations).length > 0) {
      obj.metadata.annotations = annotations;
    } else {
      delete obj.metadata.annotations;
    }
    return obj;
  }

  private compactKV(list: KV[]): any {    const result = {};
    if (list) {
      for (const item of list) {
        if (item.key && item.key.trim() !== '') {
          result[item.key.trim()] = item.value;
        }
      }
    }
    return result;
  }

  private parseEditorObj(): any {
    const text = this.aceBox.editor.getValue();
    if (!text || !text.trim()) {
      return null;
    }
    if (this.aceBox.aceMode === 'ace/mode/json') {
      return JSON.parse(text);
    }
    return YAML.load(text);
  }

  private applyYamlToForm(): boolean {
    let obj: any;
    try {
      obj = this.parseEditorObj();
    } catch (e) {
      const detail = e && e.message ? e.message : e;
      this.messageHandlerService.showError(`内容格式不正确，已保留 YAML 模式：${detail}`);
      return false;
    }
    this.labels = [];
    this.annotations = [];
    this.name = '';
    if (obj && obj.metadata) {
      this.name = obj.metadata.name || '';
      this.labels = this.expandKV(obj.metadata.labels);
      this.annotations = this.expandKV(obj.metadata.annotations);
    }
    return true;
  }

  private expandKV(map: any): KV[] {
    const list: KV[] = [];
    if (map) {
      Object.getOwnPropertyNames(map).forEach(key => {
        list.push({'key': key, 'value': map[key]});
      });
    }
    return list;
  }

  onSubmit() {
    if (this.isSubmitOnGoing) {
      return;
    }
    // 编辑模式：表单更新 labels/annotations，YAML 直接提交编辑器内容，统一走 save
    if (this.editObj) {
      let obj: any;
      if (this.mode === 'form') {
        obj = this.buildEditObjFromForm();
      } else {
        try {
          obj = this.parseEditorObj();
        } catch (e) {
          this.messageHandlerService.showError('YAML/JSON 格式不正确，请检查后再提交');
          return;
        }
        if (!obj || !obj.metadata || !obj.metadata.name) {
          this.messageHandlerService.showError('格式校验错误：缺少 metadata.name 字段');
          return;
        }
      }
      this.isSubmitOnGoing = true;
      this.save.emit(obj);
      this.opened = false;
      this.isSubmitOnGoing = false;
      return;
    }
    let obj: any;
    if (this.mode === 'form') {
      if (!this.isNameValid()) {
        this.messageHandlerService.showError('命名空间名称不符合 K8s 规范：仅限小写字母、数字和中划线，最长 63 字符');
        return;
      }
      obj = this.buildObjFromForm();
    } else {
      try {
        obj = this.parseEditorObj();
      } catch (e) {
        this.messageHandlerService.showError('YAML/JSON 格式不正确，请检查后再提交');
        return;
      }
      if (!obj || !obj.metadata || !obj.metadata.name) {
        this.messageHandlerService.showError('格式校验错误：缺少 metadata.name 字段');
        return;
      }
    }
    this.isSubmitOnGoing = true;
    this.create.emit(obj);
    this.opened = false;
    this.isSubmitOnGoing = false;
  }
}
