import { Component, createSignal, createEffect, onMount } from 'solid-js';
import { Settings } from '../types';
import { StorageManager } from '../storage/storage';
import ProviderSettings from './components/ProviderSettings';
import CreativitySettings from './components/CreativitySettings';
import CacheSettings from './components/CacheSettings';
import GeneralSettings from './components/GeneralSettings';

const Options: Component = () => {
  const [activeTab, setActiveTab] = createSignal('providers');
  const [settings, setSettings] = createSignal<Settings | null>(null);
  const [loading, setLoading] = createSignal(true);

  const storage = StorageManager.getInstance();

  const tabs = [
    { id: 'providers', name: 'Providers', icon: '🔑' },
    { id: 'creativity', name: 'Creativity', icon: '🎨' },
    { id: 'cache', name: 'Cache', icon: '💾' },
    { id: 'general', name: 'General', icon: '⚙️' }
  ];

  onMount(async () => {
    try {
      const userSettings = await storage.getSettings();
      setSettings(userSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  });

  const handleSettingsChange = async (newSettings: Settings) => {
    try {
      await storage.saveSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

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
          {loading() ? (
            <div class="loading">
              <div class="loading-spinner"></div>
              <p>Loading settings...</p>
            </div>
          ) : settings() ? (
            <>
              {activeTab() === 'providers' && (
                <ProviderSettings 
                  settings={settings()!} 
                  onSettingsChange={handleSettingsChange}
                />
              )}

              {activeTab() === 'creativity' && (
                <CreativitySettings 
                  settings={settings()!} 
                  onSettingsChange={handleSettingsChange}
                />
              )}

              {activeTab() === 'cache' && (
                <CacheSettings 
                  settings={settings()!} 
                  onSettingsChange={handleSettingsChange}
                />
              )}

              {activeTab() === 'general' && (
                <GeneralSettings 
                  settings={settings()!} 
                  onSettingsChange={handleSettingsChange}
                />
              )}
            </>
          ) : (
            <div class="error">
              <p>Failed to load settings. Please refresh the page.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Options;