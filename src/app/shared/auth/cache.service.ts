import { Injectable } from '@angular/core';
import { Namespace } from '../model/v1/namespace';
import { MessageHandlerService } from '../message-handler/message-handler.service';

@Injectable()
export class CacheService {
  namespaces: Namespace[];
  namespace: Namespace;
  appId: number;

  constructor(private messageHandlerService: MessageHandlerService) {
  }

  setAppId(appId: number) {
    this.appId = appId;
  }

  setNamespaces(namespaces: Namespace[]) {
    this.namespaces = namespaces;
  }

  setNamespace(namespace: Namespace) {
    localStorage.setItem('namespace', namespace.id.toString());
    if (namespace && namespace.metaData) {
      namespace.metaDataObj = JSON.parse(namespace.metaData);
    }
    this.namespace = namespace;
  }

  get currentNamespace(): Namespace {
    if (this.namespace) {
      return this.namespace;
    } else {
      // Return null instead of showing error, as dashboard page may not have namespace
      return null;
    }
  }

  get namespaceId(): number {
    if (this.namespace) {
      return this.namespace.id;
    } else {
      // Return null instead of showing error, as dashboard page may not have namespace
      return null;
    }
  }

  get kubeNamespace(): string {
    if (this.namespace) {
      return this.namespace.kubeNamespace;
    }
    return null;
  }

  alertError(err: string) {
    this.messageHandlerService.error(err);
    throw new Error(err);
  }
}
