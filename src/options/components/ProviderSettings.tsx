import { Component, createSignal, createEffect, For } from 'solid-js';
import { Settings, LLMProvider } from '../../types';
import { StorageManager } from '../../storage/storage';
import { SettingsValidator } from '../../settings/validation';

interface ProviderSettingsProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

const ProviderSettings: Component<ProviderSettingsProps> = (props) => {
  const [selectedProvider, setSelectedProvider] = createSignal(props.settings.currentProvider);
  const [apiKeys, setApiKeys] = createSignal<Record<string, string>>({});
  const [testing, setTesting] = createSignal<Record<string, boolean>>({});
  const [testResults, setTestResults] = createSignal<Record<string, { success: boolean; message: string }>>({});
  const [showApiKey, setShowApiKey] = createSignal<Record<string, boolean>>({});

  const storage = StorageManager.getInstance();

  // Load API keys when component mounts
  createEffect(async () => {
    const keys: Record<string, string> = {};
    for (const providerName of Object.keys(props.settings.providers)) {
      const key = await storage.getApiKey(providerName);
      if (key) {
        keys[providerName] = key;
      }
    }
    setApiKeys(keys);
  });

  const handleProviderChange = (providerName: string) => {
    setSelectedProvider(providerName);
    const newSettings = { ...props.settings, currentProvider: providerName };
    props.onSettingsChange(newSettings);
  };

  const handleApiKeyChange = async (providerName: string, value: string) => {
    setApiKeys({ ...apiKeys(), [providerName]: value });
    
    if (value.trim()) {
      await storage.saveApiKey(providerName, value);
    } else {
      await storage.removeApiKey(providerName);
    }
  };

  const handleModelChange = (providerName: string, model: string) => {
    const newSettings = {
      ...props.settings,
      providers: {
        ...props.settings.providers,
        [providerName]: {
          ...props.settings.providers[providerName],
          defaultModel: model
        }
      }
    };
    props.onSettingsChange(newSettings);
  };

  const handleBaseUrlChange = (providerName: string, baseUrl: string) => {
    const newSettings = {
      ...props.settings,
      providers: {
        ...props.settings.providers,
        [providerName]: {
          ...props.settings.providers[providerName],
          baseUrl
        }
      }
    };
    props.onSettingsChange(newSettings);
  };

  const testConnection = async (providerName: string) => {
    const provider = props.settings.providers[providerName];
    const apiKey = apiKeys()[providerName];

    if (!apiKey) {
      setTestResults({
        ...testResults(),
        [providerName]: { success: false, message: 'API key required' }
      });
      return;
    }

    setTesting({ ...testing(), [providerName]: true });

    try {
      const result = await SettingsValidator.testConnection(
        providerName,
        apiKey,
        provider.baseUrl || '',
        provider.defaultModel
      );

      setTestResults({
        ...testResults(),
        [providerName]: {
          success: result.isValid,
          message: result.isValid ? 'Connection successful!' : result.error || 'Connection failed'
        }
      });
    } catch (error) {
      setTestResults({
        ...testResults(),
        [providerName]: {
          success: false,
          message: error instanceof Error ? error.message : 'Connection failed'
        }
      });
    } finally {
      setTesting({ ...testing(), [providerName]: false });
    }
  };

  const toggleApiKeyVisibility = (providerName: string) => {
    setShowApiKey({
      ...showApiKey(),
      [providerName]: !showApiKey()[providerName]
    });
  };

  const getProviderIcon = (providerName: string): string => {
    const icons: Record<string, string> = {
      openai: '🤖',
      anthropic: '🧠',
      google: '🔍',
      ollama: '🦙'
    };
    return icons[providerName] || '⚡';
  };

  return (
    <div class="provider-settings">
      <div class="provider-selection">
        <h3>Active Provider</h3>
        <div class="provider-grid">
          <For each={Object.entries(props.settings.providers)}>
            {([providerName, provider]) => (
              <button
                class={`provider-card ${selectedProvider() === providerName ? 'active' : ''}`}
                onClick={() => handleProviderChange(providerName)}
              >
                <span class="provider-icon">{getProviderIcon(providerName)}</span>
                <span class="provider-name">{provider.name}</span>
                {apiKeys()[providerName] && <span class="provider-status">✓</span>}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="provider-config">
        <For each={Object.entries(props.settings.providers)}>
          {([providerName, provider]) => (
            <div class={`config-section ${selectedProvider() === providerName ? 'active' : ''}`}>
              <h3>
                {getProviderIcon(providerName)} {provider.name} Configuration
              </h3>

              <div class="form-group">
                <label>API Key</label>
                <div class="api-key-input">
                  <input
                    type={showApiKey()[providerName] ? 'text' : 'password'}
                    value={apiKeys()[providerName] || ''}
                    onInput={(e) => handleApiKeyChange(providerName, e.currentTarget.value)}
                    placeholder={`Enter your ${provider.name} API key`}
                    class="input"
                  />
                  <button
                    type="button"
                    class="btn-icon"
                    onClick={() => toggleApiKeyVisibility(providerName)}
                  >
                    {showApiKey()[providerName] ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label>Model</label>
                <select
                  value={provider.defaultModel}
                  onChange={(e) => handleModelChange(providerName, e.currentTarget.value)}
                  class="select"
                >
                  <For each={provider.models}>
                    {(model) => (
                      <option value={model}>{model}</option>
                    )}
                  </For>
                </select>
              </div>

              {(providerName === 'ollama' || providerName === 'custom') && (
                <div class="form-group">
                  <label>Base URL</label>
                  <input
                    type="url"
                    value={provider.baseUrl || ''}
                    onInput={(e) => handleBaseUrlChange(providerName, e.currentTarget.value)}
                    placeholder="http://localhost:11434/v1"
                    class="input"
                  />
                </div>
              )}

              <div class="form-group">
                <button
                  class={`btn ${testing()[providerName] ? 'btn-loading' : 'btn-primary'}`}
                  onClick={() => testConnection(providerName)}
                  disabled={testing()[providerName] || !apiKeys()[providerName]}
                >
                  {testing()[providerName] ? 'Testing...' : 'Test Connection'}
                </button>

                {testResults()[providerName] && (
                  <div class={`test-result ${testResults()[providerName].success ? 'success' : 'error'}`}>
                    {testResults()[providerName].message}
                  </div>
                )}
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default ProviderSettings;