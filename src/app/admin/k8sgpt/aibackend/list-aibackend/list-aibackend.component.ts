import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AIBackend } from '../../../../shared/model/v1/aibackend';

@Component({
  selector: 'list-aibackend',
  templateUrl: 'list-aibackend.component.html'
})
export class ListAIBackendComponent implements OnInit {

  @Input() backends: AIBackend[];

  @Output() delete = new EventEmitter<AIBackend>();
  @Output() edit = new EventEmitter<AIBackend>();
  @Output() setDefault = new EventEmitter<AIBackend>();

  constructor() {
  }

  ngOnInit(): void {
  }

  deleteBackend(backend: AIBackend) {
    this.delete.emit(backend);
  }

  editBackend(backend: AIBackend) {
    this.edit.emit(backend);
  }

  setDefaultBackend(backend: AIBackend) {
    this.setDefault.emit(backend);
  }

  getProviderName(provider: string): string {
    const providerMap: { [key: string]: string } = {
      'openai': 'OpenAI',
      'azureopenai': 'Azure OpenAI',
      'ollama': 'Ollama',
      'localai': 'LocalAI',
      'cohere': 'Cohere',
      'amazonbedrock': 'Amazon Bedrock',
      'googlegenai': 'Google GenAI',
      'googlevertexai': 'Google Vertex AI',
      'huggingface': 'Hugging Face',
      'ocigenai': 'OCI GenAI',
      'watsonxai': 'IBM Watsonx AI',
      'noopai': 'Other AI'
    };
    return providerMap[provider] || provider;
  }
}

