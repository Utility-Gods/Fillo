import { Settings } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'fillo_settings',
  ENCRYPTED_KEYS: 'fillo_encrypted_keys'
} as const;

export class StorageManager {
  private static instance: StorageManager;

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
    return result[STORAGE_KEYS.SETTINGS] || this.getDefaultSettings();
  }

  async saveSettings(settings: Settings): Promise<void> {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: settings
    });
  }

  async getApiKey(providerName: string): Promise<string | null> {
    const result = await chrome.storage.local.get([STORAGE_KEYS.ENCRYPTED_KEYS]);
    const encryptedKeys = result[STORAGE_KEYS.ENCRYPTED_KEYS] || {};
    
    if (encryptedKeys[providerName]) {
      return this.decrypt(encryptedKeys[providerName]);
    }
    
    return null;
  }

  async saveApiKey(providerName: string, apiKey: string): Promise<void> {
    const result = await chrome.storage.local.get([STORAGE_KEYS.ENCRYPTED_KEYS]);
    const encryptedKeys = result[STORAGE_KEYS.ENCRYPTED_KEYS] || {};
    
    encryptedKeys[providerName] = this.encrypt(apiKey);
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENCRYPTED_KEYS]: encryptedKeys
    });
  }

  async removeApiKey(providerName: string): Promise<void> {
    const result = await chrome.storage.local.get([STORAGE_KEYS.ENCRYPTED_KEYS]);
    const encryptedKeys = result[STORAGE_KEYS.ENCRYPTED_KEYS] || {};
    
    delete encryptedKeys[providerName];
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENCRYPTED_KEYS]: encryptedKeys
    });
  }

  private encrypt(text: string): string {
    // Simple XOR encryption for Chrome storage
    // In production, consider using WebCrypto API for better security
    const key = 'fillo_secret_key_2024';
    let encrypted = '';
    
    for (let i = 0; i < text.length; i++) {
      encrypted += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return btoa(encrypted);
  }

  private decrypt(encryptedText: string): string {
    try {
      const key = 'fillo_secret_key_2024';
      const encrypted = atob(encryptedText);
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return '';
    }
  }

  private getDefaultSettings(): Settings {
    return {
      currentProvider: 'openai',
      providers: {
        openai: {
          name: 'OpenAI',
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
          defaultModel: 'gpt-3.5-turbo'
        },
        anthropic: {
          name: 'Anthropic',
          apiKey: '',
          baseUrl: 'https://api.anthropic.com/v1',
          models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
          defaultModel: 'claude-3-haiku-20240307'
        },
        google: {
          name: 'Google',
          apiKey: '',
          baseUrl: 'https://generativelanguage.googleapis.com/v1',
          models: ['gemini-pro', 'gemini-pro-vision'],
          defaultModel: 'gemini-pro'
        },
        ollama: {
          name: 'Ollama',
          apiKey: '',
          baseUrl: 'http://localhost:11434/v1',
          models: ['llama2', 'codellama', 'mistral'],
          defaultModel: 'llama2'
        }
      },
      creativity: {
        level: 0.7,
        preset: 'balanced',
        fieldSpecific: {}
      },
      cache: {
        enabled: true,
        maxEntries: 10000,
        expirationDays: 7
      },
      ui: {
        showIcons: true,
        animationSpeed: 1,
        theme: 'auto'
      }
    };
  }

  async clearAllData(): Promise<void> {
    await chrome.storage.local.clear();
  }

  async exportSettings(): Promise<string> {
    const settings = await this.getSettings();
    // Remove sensitive data before export
    const exportableSettings = {
      ...settings,
      providers: Object.fromEntries(
        Object.entries(settings.providers).map(([key, provider]) => [
          key,
          { ...provider, apiKey: '' }
        ])
      )
    };
    
    return JSON.stringify(exportableSettings, null, 2);
  }

  async importSettings(settingsJson: string): Promise<void> {
    try {
      const settings = JSON.parse(settingsJson);
      // Merge with current settings to preserve API keys
      const currentSettings = await this.getSettings();
      
      const mergedSettings = {
        ...settings,
        providers: Object.fromEntries(
          Object.entries(settings.providers).map(([key, provider]: [string, any]) => [
            key,
            {
              ...provider,
              apiKey: currentSettings.providers[key]?.apiKey || ''
            }
          ])
        )
      };
      
      await this.saveSettings(mergedSettings);
    } catch (error) {
      throw new Error('Invalid settings format');
    }
  }
}