import { StorageManager } from '../storage/storage';
import { Settings, FieldInfo } from '../types';
import { PageContext } from '../utils/context-extractor';
import { 
  BaseLLMProvider, 
  OpenAIProvider, 
  AnthropicProvider, 
  GoogleProvider, 
  OllamaProvider,
  LLMRequest,
  LLMResponse 
} from './providers';

export class ProviderManager {
  private static instance: ProviderManager;
  private providers: Map<string, BaseLLMProvider> = new Map();
  private storage: StorageManager;
  private currentSettings: Settings | null = null;

  private constructor() {
    this.storage = StorageManager.getInstance();
  }

  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  async initialize(): Promise<void> {
    this.currentSettings = await this.storage.getSettings();
    await this.updateProviders();
  }

  private async updateProviders(): Promise<void> {
    if (!this.currentSettings) return;

    for (const [providerName, config] of Object.entries(this.currentSettings.providers)) {
      const apiKey = await this.storage.getApiKey(providerName);
      
      if (apiKey) {
        let provider: BaseLLMProvider | null = null;

        switch (providerName) {
          case 'openai':
            provider = new OpenAIProvider(
              apiKey,
              config.baseUrl || 'https://api.openai.com/v1',
              config.defaultModel
            );
            break;
          case 'anthropic':
            provider = new AnthropicProvider(
              apiKey,
              config.baseUrl || 'https://api.anthropic.com/v1',
              config.defaultModel
            );
            break;
          case 'google':
            provider = new GoogleProvider(
              apiKey,
              config.baseUrl || 'https://generativelanguage.googleapis.com/v1',
              config.defaultModel
            );
            break;
          case 'ollama':
            provider = new OllamaProvider(
              apiKey,
              config.baseUrl || 'http://localhost:11434/v1',
              config.defaultModel
            );
            break;
        }

        if (provider) {
          this.providers.set(providerName, provider);
        }
      }
    }
  }

  async getCurrentProvider(): Promise<BaseLLMProvider | null> {
    if (!this.currentSettings) {
      await this.initialize();
    }

    if (!this.currentSettings) return null;

    const currentProviderName = this.currentSettings.currentProvider;
    const provider = this.providers.get(currentProviderName);

    if (provider) {
      return provider;
    }

    // Try to get the API key and create provider if not exists
    const apiKey = await this.storage.getApiKey(currentProviderName);
    if (apiKey) {
      await this.updateProviders();
      return this.providers.get(currentProviderName) || null;
    }

    return null;
  }

  async generateContent(fieldInfo: FieldInfo, context?: string, pageContext?: PageContext, previousGenerations?: string[]): Promise<LLMResponse | null> {
    const provider = await this.getCurrentProvider();
    if (!provider) {
      throw new Error('No LLM provider configured. Please add an API key in settings.');
    }

    if (!this.currentSettings) {
      throw new Error('Settings not loaded');
    }

    // Get creativity level for this field type
    const fieldSpecificCreativity = this.currentSettings.creativity.fieldSpecific[fieldInfo.type];
    const creativityLevel = fieldSpecificCreativity !== undefined 
      ? fieldSpecificCreativity 
      : this.currentSettings.creativity.level;

    const request: LLMRequest = {
      fieldInfo,
      creativityLevel,
      context,
      pageContext,
      previousGenerations
    };

    try {
      const response = await provider.generateResponse(request);
      return response;
    } catch (error) {
      console.error('Failed to generate content:', error);
      throw error;
    }
  }

  async testConnection(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      const apiKey = await this.storage.getApiKey(providerName);
      if (!apiKey) return false;
      
      await this.updateProviders();
      const updatedProvider = this.providers.get(providerName);
      if (!updatedProvider) return false;
      
      return updatedProvider.testConnection();
    }

    return provider.testConnection();
  }

  async refreshSettings(): Promise<void> {
    this.currentSettings = await this.storage.getSettings();
    await this.updateProviders();
  }

  getLoadedProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  hasConfiguredProvider(): boolean {
    return this.providers.size > 0;
  }
}