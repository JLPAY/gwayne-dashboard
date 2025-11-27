import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { Node } from 'app/shared/model/v1/kubernetes/node-list';
import { ClusterService } from 'app/shared/client/v1/cluster.service';
import { NgForm } from '@angular/forms';
import { MessageHandlerService } from 'app/shared/message-handler/message-handler.service';

@Component({
  selector: 'create-edit-drain',
  templateUrl: './create-edit-drain.component.html',
  styleUrls: ['./create-edit-drain.component.scss']
})
export class CreateEditDrainComponent implements OnInit {
  drainModalOpened = false;
  nodeName: string;
  clusterName: string;
  
  // 驱逐选项
  drainOptions = {
    force: false,
    ignoreDaemonSets: true,
    deleteEmptyDirData: false,
    gracePeriod: 30
  };

  drainForm: NgForm;
  @ViewChild('drainForm', { static: true })
  currentForm: NgForm;

  @Output() refresh = new EventEmitter<any>();

  constructor(
    private clusterService: ClusterService,
    private messageHandlerService: MessageHandlerService,
  ) { }

  ngOnInit() {
  }

  openModal(node: Node, cluster: string) {
    this.nodeName = node.name;
    this.clusterName = cluster;
    this.drainModalOpened = true;
    this.resetOptions();
  }

  resetOptions() {
    this.drainOptions = {
      force: false,
      ignoreDaemonSets: true,
      deleteEmptyDirData: false,
      gracePeriod: 30
    };
  }

  onCancel() {
    this.drainModalOpened = false;
  }

  onSubmit() {
    if (!this.currentForm.valid) {
      return;
    }

    // 调用驱逐API
    this.clusterService.drainNode(this.nodeName, this.clusterName, this.drainOptions).subscribe(
      response => {
        this.messageHandlerService.showSuccess(`节点 ${this.nodeName} 驱逐成功！`);
        this.drainModalOpened = false;
        this.refresh.emit();
      },
      error => {
        this.messageHandlerService.handleError(error);
      }
    );
  }

  public get isValid() {
    return this.currentForm && this.currentForm.valid;
  }
}
