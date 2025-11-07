import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { AceEditorBoxComponent } from './ace-editor-box/ace-editor-box.component';
import { ModalInfo } from './modalInfo';
import * as YAML from 'js-yaml';

interface Label {
  key: string;
  value: string;
}

interface Annotation {
  key: string;
  value: string;
}

@Component({
  selector: 'wayne-ace-editor',
  templateUrl: './ace-editor.component.html',
  styleUrls: ['./ace-editor.component.scss']
})
export class AceEditorComponent implements OnInit {

  modalOpened: boolean;
  title: string;
  hiddenFooter: boolean;
  isCreate: boolean;
  @ViewChild(AceEditorBoxComponent, { static: false }) box: AceEditorBoxComponent;

  @Input() warningMsg = '';
  @Output() outputObj = new EventEmitter<any>();
  // for create only
  @Output() createOutputObj = new EventEmitter<any>();

  // Form view mode for namespace
  showFormView: boolean = false;
  isNamespaceResource: boolean = false;
  
  // Namespace form data
  namespaceName: string = '';
  namespaceLabels: Label[] = [];
  namespaceAnnotations: Annotation[] = [];

  constructor() {
  }

  ngOnInit(): void {
  }

  onCancel() {
    this.modalOpened = false;
    // Reset form state
    this.showFormView = false;
    this.isNamespaceResource = false;
    this.namespaceName = '';
    this.namespaceLabels = [];
    this.namespaceAnnotations = [];
  }

  openModal(value: any, title: string, edit: boolean, create?: boolean) {
    this.hiddenFooter = !edit;
    this.title = title;
    this.modalOpened = true;
    this.isCreate = create;
    
    // Check if this is a namespace resource
    this.isNamespaceResource = title && (title.includes('namespace') || title.includes('Namespace'));
    
    // Initialize form view for namespace (only for create mode)
    if (this.isNamespaceResource && create) {
      this.showFormView = true;
      this.initNamespaceForm(value);
    } else {
      this.showFormView = false;
      // Use setTimeout to ensure box is initialized
      setTimeout(() => {
        if (this.box) {
          const jsonValue = typeof value === 'string' ? 
            (value.trim() === '' ? '{}' : value) : 
            JSON.stringify(value || {}, null, 2);
          try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            this.box.setValue(JSON.stringify(parsed, null, 2));
          } catch (e) {
            this.box.setValue(jsonValue);
          }
        }
      }, 0);
    }
  }

  initNamespaceForm(value: any) {
    let namespaceObj: any = {};
    
    if (value && Object.keys(value).length > 0) {
      namespaceObj = typeof value === 'string' ? JSON.parse(value) : value;
    } else {
      // Default namespace structure
      namespaceObj = {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: '',
          labels: {},
          annotations: {}
        }
      };
    }

    this.namespaceName = (namespaceObj.metadata && namespaceObj.metadata.name) || '';
    this.namespaceLabels = [];
    this.namespaceAnnotations = [];

    if (namespaceObj.metadata && namespaceObj.metadata.labels) {
      Object.keys(namespaceObj.metadata.labels).forEach(key => {
        this.namespaceLabels.push({ key: key, value: namespaceObj.metadata.labels[key] });
      });
    }

    if (namespaceObj.metadata && namespaceObj.metadata.annotations) {
      Object.keys(namespaceObj.metadata.annotations).forEach(key => {
        this.namespaceAnnotations.push({ key: key, value: namespaceObj.metadata.annotations[key] });
      });
    }

    // Also update the editor with the current value (use setTimeout to ensure box is initialized)
    setTimeout(() => {
      this.updateEditorFromForm();
    }, 0);
  }

  toggleViewMode() {
    if (this.showFormView) {
      // Switch from form to editor
      if (this.box) {
        this.updateEditorFromForm();
      }
      this.showFormView = false;
    } else {
      // Switch from editor to form
      if (this.box && this.box.editor) {
        this.updateFormFromEditor();
      }
      this.showFormView = true;
    }
  }

  updateEditorFromForm() {
    if (!this.box) {
      return;
    }

    const namespaceObj = {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: this.namespaceName,
        labels: {},
        annotations: {}
      }
    };

    this.namespaceLabels.forEach(label => {
      if (label.key && label.value) {
        namespaceObj.metadata.labels[label.key] = label.value;
      }
    });

    this.namespaceAnnotations.forEach(annotation => {
      if (annotation.key && annotation.value) {
        namespaceObj.metadata.annotations[annotation.key] = annotation.value;
      }
    });

    // Remove empty objects
    if (Object.keys(namespaceObj.metadata.labels).length === 0) {
      delete namespaceObj.metadata.labels;
    }
    if (Object.keys(namespaceObj.metadata.annotations).length === 0) {
      delete namespaceObj.metadata.annotations;
    }

    const jsonString = JSON.stringify(namespaceObj, null, 2);
    this.box.setValue(jsonString);
  }

  updateFormFromEditor() {
    if (!this.box || !this.box.editor) {
      return;
    }

    try {
      let namespaceObj: any;
      const editorValue = this.box.editor.getValue().trim();
      if (editorValue === '') {
        // Empty editor, reset form
        this.namespaceName = '';
        this.namespaceLabels = [];
        this.namespaceAnnotations = [];
        return;
      }

      if (this.box.aceMode === 'ace/mode/json') {
        namespaceObj = JSON.parse(editorValue);
      } else {
        namespaceObj = YAML.load(editorValue);
      }

      this.namespaceName = (namespaceObj.metadata && namespaceObj.metadata.name) || '';
      this.namespaceLabels = [];
      this.namespaceAnnotations = [];

      if (namespaceObj.metadata && namespaceObj.metadata.labels) {
        Object.keys(namespaceObj.metadata.labels).forEach(key => {
          this.namespaceLabels.push({ key: key, value: namespaceObj.metadata.labels[key] });
        });
      }

      if (namespaceObj.metadata && namespaceObj.metadata.annotations) {
        Object.keys(namespaceObj.metadata.annotations).forEach(key => {
          this.namespaceAnnotations.push({ key: key, value: namespaceObj.metadata.annotations[key] });
        });
      }
    } catch (e) {
      console.error('Failed to parse editor content:', e);
      // On error, keep current form values
    }
  }

  addLabel() {
    this.namespaceLabels.push({ key: '', value: '' });
  }

  removeLabel(index: number) {
    this.namespaceLabels.splice(index, 1);
  }

  addAnnotation() {
    this.namespaceAnnotations.push({ key: '', value: '' });
  }

  removeAnnotation(index: number) {
    this.namespaceAnnotations.splice(index, 1);
  }

  modalInfo(info: ModalInfo) {
    Object.getOwnPropertyNames(info).map(key => {
      if (info[key]) {
        this[key] = info[key];
      }
    });
  }

  onSubmit() {
    // If in form view, update editor first
    if (this.showFormView && this.isNamespaceResource) {
      this.updateEditorFromForm();
    }

    if (this.box && this.box.editor) {
      if (this.box.aceMode === 'ace/mode/json') {
        if (this.isCreate) {
          this.createOutputObj.emit(JSON.parse(this.box.editor.getValue()));
        } else {
          this.outputObj.emit(JSON.parse(this.box.editor.getValue()));
        }

      } else {
        if (this.isCreate) {
          this.createOutputObj.emit(YAML.load(this.box.editor.getValue()));
        } else {
          this.outputObj.emit(YAML.load(this.box.editor.getValue()));
        }
      }
    }
    
    this.modalOpened = false;
    // Reset form state
    this.showFormView = false;
    this.isNamespaceResource = false;
    this.namespaceName = '';
    this.namespaceLabels = [];
    this.namespaceAnnotations = [];
  }

  get isValid(): boolean {
    // If in form view, validate form fields
    if (this.showFormView && this.isNamespaceResource) {
      return this.namespaceName.trim() !== '' && 
             /^[a-z]([-a-z0-9]*[a-z0-9])?$/.test(this.namespaceName);
    }

    // Otherwise validate editor content
    try {
      if (this.box && this.box.editor) {
        if (this.box.aceMode === 'ace/mode/json') {
          JSON.parse(this.box.editor.getValue());
        } else {
          YAML.load(this.box.editor.getValue());
        }
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
    return true;
  }
}
