import { Component, createSignal, onMount, Show } from 'solid-js';

interface ProviderInfo {
  name: string;
  model: string;
  connected: boolean;
}

interface CacheStats {
  totalEntries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
}

const Popup: Component = () => {
  const [isActive, setIsActive] = createSignal(false);
  const [status, setStatus] = createSignal('Checking...');
  const [provider, setProvider] = createSignal<ProviderInfo | null>(null);
  const [cacheStats, setCacheStats] = createSignal<CacheStats | null>(null);
  const [creativityLevel, setCreativityLevel] = createSignal<number>(0.7);

  onMount(async () => {
    try {
      // Check current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab?.url) {
        const hostname = new URL(currentTab.url).hostname;
        const isLocalhost = hostname === 'localhost' || 
                           hostname === '127.0.0.1' ||
                           hostname.endsWith('.localhost');
        
        setIsActive(isLocalhost);
        setStatus(isLocalhost ? 'Active on localhost' : 'Only works on localhost');
      }

      // Get settings and provider info
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      console.log('Popup: Settings response:', response);
      
      if (response.success && response.settings) {
        const settings = response.settings;
        console.log('Popup: Settings object:', settings);
        
        // Check encrypted API keys storage to find configured providers
        const encryptedKeysResult = await chrome.storage.local.get(['fillo_encrypted_keys']);
        const encryptedKeys = encryptedKeysResult.fillo_encrypted_keys || {};
        console.log('Popup: Encrypted keys found:', Object.keys(encryptedKeys));
        
        // Find the configured provider by checking encrypted storage
        for (const [providerName, config] of Object.entries(settings.providers || {})) {
          console.log(`Popup: Checking provider ${providerName}:`, config);
          console.log(`Popup: Has encrypted key: ${!!encryptedKeys[providerName]}`);
          
          if (encryptedKeys[providerName]) {
            console.log(`Popup: Found configured provider: ${providerName}`);
            setProvider({
              name: providerName.charAt(0).toUpperCase() + providerName.slice(1),
              model: config.defaultModel || config.model || 'Default',
              connected: true
            });
            break;
          }
        }

        // Set creativity level
        setCreativityLevel(settings.creativity?.level || 0.7);
      } else {
        console.log('Popup: Failed to get settings:', response);
      }

      // Get cache stats
      const statsResponse = await chrome.runtime.sendMessage({ action: 'getCacheStats' });
      if (statsResponse.success && statsResponse.stats) {
        setCacheStats(statsResponse.stats);
      }
      
    } catch (error) {
      setStatus('Error loading data');
    }
  });

  const getCreativityLabel = (level: number) => {
    if (level <= 0.3) return 'Predictable';
    if (level <= 0.7) return 'Balanced';
    if (level <= 1.2) return 'Creative';
    return 'Experimental';
  };

  return (
    <div class="popup-container">
      <div class="header">
        <h1>Fillo</h1>
        <p class="subtitle">Intelligent Form Filler</p>
      </div>
      
      <div class="status">
        <div class={`status-indicator ${isActive() ? 'active' : 'inactive'}`}></div>
        <span class="status-text">{status()}</span>
      </div>

      <Show when={provider()}>
        <div class="provider-info">
          <div class="info-section">
            <h3>Current Provider</h3>
            <div class="provider-details">
              <div class="provider-name">{provider()?.name}</div>
              <div class="provider-model">Model: {provider()?.model}</div>
            </div>
          </div>
        </div>
      </Show>

      <Show when={!provider()}>
        <div class="no-provider">
          <p>No AI provider configured</p>
        </div>
      </Show>

      <div class="creativity-info">
        <div class="info-section">
          <h3>Creativity Level</h3>
          <div class="creativity-display">
            <span class="creativity-label">{getCreativityLabel(creativityLevel())}</span>
            <span class="creativity-value">({creativityLevel().toFixed(1)})</span>
          </div>
        </div>
      </div>

      <Show when={cacheStats()}>
        <div class="cache-info">
          <div class="info-section">
            <h3>Cache Statistics</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Entries</span>
                <span class="stat-value">{cacheStats()?.totalEntries || 0}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Hit Rate</span>
                <span class="stat-value">{cacheStats()?.hitRate.toFixed(1) || '0'}%</span>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <div class="actions">
        <button 
          class="btn btn-primary"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          Settings
        </button>
      </div>

      <div class="footer">
        <p class="version">v1.0.0</p>
      </div>
    </div>
  );
};

export default Popup;