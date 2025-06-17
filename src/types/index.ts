export interface LLMProvider {
  name: string;
  apiKey: string;
  baseUrl?: string;
  models: string[];
  defaultModel: string;
}

export interface CreativitySettings {
  level: number;
  preset: string;
  fieldSpecific: Record<string, number>;
}

export interface FieldInfo {
  element: HTMLElement;
  type: string;
  label: string;
  context: string;
  signature: string;
}

export interface CacheEntry {
  id: number;
  fieldSignature: string;
  fieldType: string;
  creativityLevel: number;
  generatedContent: string;
  createdAt: string;
  expiresAt: string;
}

export interface Settings {
  currentProvider: string;
  providers: Record<string, LLMProvider>;
  creativity: CreativitySettings;
  cache: {
    enabled: boolean;
    maxEntries: number;
    expirationDays: number;
  };
  ui: {
    showIcons: boolean;
    animationSpeed: number;
    theme: 'auto' | 'light' | 'dark';
  };
}

export interface ProviderResponse {
  content: string;
  cached: boolean;
  provider: string;
  model: string;
  creativityLevel: number;
}