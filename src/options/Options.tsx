import { Component, createSignal } from 'solid-js';

const Options: Component = () => {
  const [activeTab, setActiveTab] = createSignal('providers');

  const tabs = [
    { id: 'providers', name: 'Providers', icon: '🔑' },
    { id: 'creativity', name: 'Creativity', icon: '🎨' },
    { id: 'cache', name: 'Cache', icon: '💾' },
    { id: 'general', name: 'General', icon: '⚙️' }
  ];

  return (
    <div class="options-container">
      <header class="header">
        <h1>Fillo Settings</h1>
        <p>Configure your intelligent form filler</p>
      </header>

      <div class="content">
        <nav class="tabs">
          {tabs.map(tab => (
            <button
              class={`tab ${activeTab() === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span class="tab-icon">{tab.icon}</span>
              <span class="tab-name">{tab.name}</span>
            </button>
          ))}
        </nav>

        <main class="tab-content">
          {activeTab() === 'providers' && (
            <div class="panel">
              <h2>LLM Providers</h2>
              <p>Configure your API keys and models for content generation.</p>
              <div class="coming-soon">
                🚧 Provider settings coming soon...
              </div>
            </div>
          )}

          {activeTab() === 'creativity' && (
            <div class="panel">
              <h2>Creativity Settings</h2>
              <p>Control how creative and varied the generated content should be.</p>
              <div class="coming-soon">
                🎨 Creativity controls coming soon...
              </div>
            </div>
          )}

          {activeTab() === 'cache' && (
            <div class="panel">
              <h2>Cache Management</h2>
              <p>Manage cached responses to reduce API calls.</p>
              <div class="coming-soon">
                💾 Cache settings coming soon...
              </div>
            </div>
          )}

          {activeTab() === 'general' && (
            <div class="panel">
              <h2>General Settings</h2>
              <p>UI preferences and general configuration.</p>
              <div class="coming-soon">
                ⚙️ General settings coming soon...
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Options;