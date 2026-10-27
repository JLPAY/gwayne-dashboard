import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import * as YAML from 'js-yaml';
import { MessageHandlerService } from '../../../../shared/message-handler/message-handler.service';
import { AceEditorBoxComponent } from '../../../../shared/ace-editor/ace-editor-box/ace-editor-box.component';

class KV {
  key: string;
  value: string;
}

class PortItem {
  name: string;
  port: string;
  targetPort: string;
  nodePort: string;
  protocol: string;
}

const EXAMPLE_YAML = `# Service 资源示例（可直接修改后提交）
apiVersion: v1
kind: Service
metadata:
  name: demo-service        # 必填：小写字母、数字、中划线，最长 63 字符
  namespace: default        # 必填：所属命名空间
  labels:                   # 可选：标签
    app: demo
  annotations:              # 可选：注解
    owner: ops-team
spec:
  type: ClusterIP           # 可选：ClusterIP / NodePort / LoadBalancer / ExternalName
  selector:                 # 可选：转发目标 Pod 的标签匹配
    app: demo
  ports:                    # ClusterIP/NodePort/LoadBalancer 至少一个端口
    - name: http            # 可选：端口名
      port: 80              # 必填：Service 暴露端口（1-65535）
      targetPort: 8080      # 可选：后端 Pod 端口，默认与 port 相同
      protocol: TCP         # 可选：TCP / UDP / SCTP，默认 TCP
#  type: NodePort 时可指定 nodePort（不填则随机分配）：
#    - port: 80
#      nodePort: 30080
#  type: ExternalName 时使用 externalName 指定外部域名：
#  externalName: db.example.com
`;

// K8s 资源名称的 DNS-1123 校验规则
const NAME_PATTERN = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const NAME_MAX_LENGTH = 63;
const SERVICE_TYPES = ['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'];
const PROTOCOLS = ['TCP', 'UDP', 'SCTP'];

@Component({
  selector: 'create-service-form',
  templateUrl: 'create-service-form.component.html',
  styleUrls: ['create-service-form.component.scss']
})
export class CreateServiceFormComponent {
  opened = false;
  mode: 'form' | 'yaml' = 'form';
  isSubmitOnGoing = false;

  serviceTypes = SERVICE_TYPES;
  protocols = PROTOCOLS;

  /** 非空表示编辑模式（值为原对象）；null 表示创建模式 */
  editObj: any = null;

  name = '';
  namespace = '';
  namespaceList: string[] = [];
  type = 'ClusterIP';
  externalName = '';
  labels: KV[] = [];
  annotations: KV[] = [];
  selector: KV[] = [];
  ports: PortItem[] = [];

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

  /**
   * @param cluster 当前集群（仅用于展示）
   * @param namespaces 当前集群可选的命名空间列表
   * @param defaultNamespace 列表页当前选中的命名空间，作为默认值
   */
  open(cluster: string, namespaces: string[], defaultNamespace: string) {
    this.opened = true;
    this.mode = 'form';
    this.editObj = null;
    this.name = '';
    this.namespace = defaultNamespace || '';
    this.namespaceList = namespaces || [];
    this.type = 'ClusterIP';
    this.externalName = '';
    this.labels = [];
    this.annotations = [];
    this.selector = [];
    this.ports = [];
    this.isSubmitOnGoing = false;
    this.yamlInited = false;
    this.editYamlInited = false;
    this.yamlSnapshot = '';
  }

  /**
   * 编辑模式：带入完整原对象；表单展示名称/命名空间（只读）、类型、端口、
   * selector、labels、annotations；YAML 模式展示完整原对象，保存统一 emit save。
   */
  openEdit(obj: any) {
    this.opened = true;
    this.mode = 'form';
    this.editObj = obj || null;
    this.name = obj && obj.metadata ? (obj.metadata.name || '') : '';
    this.namespace = obj && obj.metadata ? (obj.metadata.namespace || '') : '';
    this.namespaceList = this.namespace ? [this.namespace] : [];
    this.type = obj && obj.spec && obj.spec.type && SERVICE_TYPES.indexOf(obj.spec.type) > -1
      ? obj.spec.type : 'ClusterIP';
    this.externalName = obj && obj.spec ? (obj.spec.externalName || '') : '';
    this.labels = this.expandKV(obj && obj.metadata ? obj.metadata.labels : null);
    this.annotations = this.expandKV(obj && obj.metadata ? obj.metadata.annotations : null);
    this.selector = this.expandKV(obj && obj.spec ? obj.spec.selector : null);
    this.ports = [];
    if (obj && obj.spec && Array.isArray(obj.spec.ports)) {
      for (const p of obj.spec.ports) {
        if (!p) {
          continue;
        }
        const item = new PortItem();
        item.name = p.name ? String(p.name) : '';
        item.port = p.port !== undefined && p.port !== null ? String(p.port) : '';
        item.targetPort = p.targetPort !== undefined && p.targetPort !== null ? String(p.targetPort) : '';
        item.nodePort = p.nodePort !== undefined && p.nodePort !== null ? String(p.nodePort) : '';
        item.protocol = p.protocol || 'TCP';
        this.ports.push(item);
      }
    }
    if (this.type !== 'ExternalName' && this.ports.length === 0) {
      this.addPort();
    }
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

  isPortNumValid(value: string): boolean {
    if (value === null || value === undefined || value.trim() === '') {
      return false;
    }
    const num = Number(value);
    return Number.isInteger(num) && num >= 1 && num <= 65535;
  }

  /** nodePort 可选，填了就必须合法 */
  isNodePortValid(item: PortItem): boolean {
    const value = (item.nodePort || '').trim();
    if (value === '') {
      return true;
    }
    return this.isPortNumValid(value);
  }

  hasValidPort(): boolean {
    return this.ports.some(item => this.isPortNumValid(item.port));
  }

  isFormValid(): boolean {
    if (!this.isNameValid() || !this.namespace) {
      return false;
    }
    if (this.type === 'ExternalName') {
      return this.externalName.trim() !== '';
    }
    return this.hasValidPort() && this.ports.every(item => this.isNodePortValid(item));
  }

  canSubmit(): boolean {
    if (this.isSubmitOnGoing) {
      return false;
    }
    if (this.mode === 'form') {
      // 编辑模式名称/命名空间只读，校验可编辑字段
      if (this.editObj) {
        if (this.type === 'ExternalName') {
          return this.externalName.trim() !== '';
        }
        return this.hasValidPort() && this.ports.every(item => this.isNodePortValid(item));
      }
      return this.isFormValid();
    }
    return this.aceBox && this.aceBox.isValid;
  }

  addPort() {
    const item = new PortItem();
    item.protocol = 'TCP';
    this.ports.push(item);
  }

  /** type 切换时维护 ports 的默认行 */
  onTypeChange() {
    if (this.type === 'ExternalName') {
      return;
    }
    if (this.ports.length === 0) {
      this.addPort();
    }
  }

  onAddKV(list: KV[]) {
    list.push({'key': '', 'value': ''});
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

  /** 汇总表单输入为 Service 资源对象 */
  private buildObjFromForm(): any {
    const metadata: any = {
      name: this.name.trim() || 'demo-service',
      namespace: this.namespace || 'default'
    };
    const labels = this.compactKV(this.labels);
    const annotations = this.compactKV(this.annotations);
    if (Object.keys(labels).length > 0) {
      metadata.labels = labels;
    }
    if (Object.keys(annotations).length > 0) {
      metadata.annotations = annotations;
    }

    const spec: any = {type: this.type};
    if (this.type === 'ExternalName') {
      spec.externalName = this.externalName.trim() || 'db.example.com';
    } else {
      const selector = this.compactKV(this.selector);
      if (Object.keys(selector).length > 0) {
        spec.selector = selector;
      }
      const ports = this.buildPorts(true);
      if (ports.length > 0) {
        spec.ports = ports;
      }
    }
    return {apiVersion: 'v1', kind: 'Service', metadata: metadata, spec: spec};
  }

  /** 收集端口行；preview 为 true 时用占位值补齐空行（用于生成 YAML 预览） */
  private buildPorts(preview: boolean): any[] {
    const result = [];
    for (const item of this.ports) {
      const name = (item.name || '').trim();
      const port = (item.port || '').trim();
      const targetPort = (item.targetPort || '').trim();
      const nodePort = (item.nodePort || '').trim();
      if (!preview && !this.isPortNumValid(port)) {
        continue;
      }
      const entry: any = {};
      if (name) {
        entry.name = name;
      }
      entry.port = preview && !this.isPortNumValid(port) ? 80 : Number(port);
      if (targetPort) {
        entry.targetPort = Number.isInteger(Number(targetPort)) && targetPort !== '' ? Number(targetPort) : targetPort;
      }
      if (nodePort && (this.type === 'NodePort' || this.type === 'LoadBalancer') && this.isPortNumValid(nodePort)) {
        entry.nodePort = Number(nodePort);
      }
      if (item.protocol && item.protocol !== 'TCP') {
        entry.protocol = item.protocol;
      }
      result.push(entry);
    }
    return result;
  }

  /** 编辑模式：基于原对象克隆，更新表单可编辑字段（spec + labels/annotations） */
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

    if (!obj.spec) {
      obj.spec = {};
    }
    obj.spec.type = this.type;
    if (this.type === 'ExternalName') {
      obj.spec.externalName = this.externalName.trim();
      delete obj.spec.selector;
      delete obj.spec.ports;
    } else {
      delete obj.spec.externalName;
      const selector = this.compactKV(this.selector);
      if (Object.keys(selector).length > 0) {
        obj.spec.selector = selector;
      } else {
        delete obj.spec.selector;
      }
      const ports = this.buildPorts(false);
      if (ports.length > 0) {
        obj.spec.ports = ports;
      } else {
        delete obj.spec.ports;
      }
    }
    return obj;
  }

  private compactKV(list: KV[]): any {
    const result = {};
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
    this.selector = [];
    this.ports = [];
    this.externalName = '';
    this.type = 'ClusterIP';
    this.name = '';
    this.namespace = '';
    if (!obj) {
      return true;
    }
    if (obj.kind && obj.kind !== 'Service') {
      this.messageHandlerService.showError(`kind 为 ${obj.kind}，当前页面只支持创建 Service，已保留 YAML 模式`);
      return false;
    }
    if (obj.metadata) {
      this.name = obj.metadata.name || '';
      this.namespace = obj.metadata.namespace || '';
      this.labels = this.expandKV(obj.metadata.labels);
      this.annotations = this.expandKV(obj.metadata.annotations);
    }
    if (obj.spec) {
      if (obj.spec.type && SERVICE_TYPES.indexOf(obj.spec.type) > -1) {
        this.type = obj.spec.type;
      }
      this.externalName = obj.spec.externalName || '';
      this.selector = this.expandKV(obj.spec.selector);
      if (Array.isArray(obj.spec.ports)) {
        for (const p of obj.spec.ports) {
          if (!p) {
            continue;
          }
          const item = new PortItem();
          item.name = p.name ? String(p.name) : '';
          item.port = p.port !== undefined && p.port !== null ? String(p.port) : '';
          item.targetPort = p.targetPort !== undefined && p.targetPort !== null ? String(p.targetPort) : '';
          item.nodePort = p.nodePort !== undefined && p.nodePort !== null ? String(p.nodePort) : '';
          item.protocol = p.protocol || 'TCP';
          this.ports.push(item);
        }
      }
    }
    if (this.type !== 'ExternalName' && this.ports.length === 0) {
      this.addPort();
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
    // 编辑模式：表单更新 spec 与 labels/annotations，YAML 直接提交编辑器内容，统一走 save
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
        this.messageHandlerService.showError('Service 名称不符合 K8s 规范：仅限小写字母、数字和中划线，最长 63 字符');
        return;
      }
      if (!this.namespace) {
        this.messageHandlerService.showError('请选择所属命名空间');
        return;
      }
      if (this.type === 'ExternalName' && !this.externalName.trim()) {
        this.messageHandlerService.showError('ExternalName 类型需要填写外部域名（externalName）');
        return;
      }
      if (this.type !== 'ExternalName' && !this.hasValidPort()) {
        this.messageHandlerService.showError('至少填写一个有效端口（port 为 1-65535 的整数）');
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
      if (!obj.metadata.namespace) {
        this.messageHandlerService.showError('格式校验错误：缺少 metadata.namespace 字段（Service 是命名空间级资源）');
        return;
      }
    }
    this.isSubmitOnGoing = true;
    this.create.emit(obj);
    this.opened = false;
    this.isSubmitOnGoing = false;
  }
}
