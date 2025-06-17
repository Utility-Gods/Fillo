import { Component } from 'solid-js';
import { Settings } from '../../types';
import { StorageManager } from '../../storage/storage';

interface GeneralSettingsProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

const GeneralSettings: Component<GeneralSettingsProps> = (props) => {
  const storage = StorageManager.getInstance();

  const handleShowIconsChange = (showIcons: boolean) => {
    const newSettings = {
      ...props.settings,
      ui: {
        ...props.settings.ui,
        showIcons
      }
    };
    props.onSettingsChange(newSettings);
  };

  const handleAnimationSpeedChange = (animationSpeed: number) => {
    const newSettings = {
      ...props.settings,
      ui: {
        ...props.settings.ui,
        animationSpeed
      }
    };
    props.onSettingsChange(newSettings);
  };

  const handleThemeChange = (theme: 'auto' | 'light' | 'dark') => {
    const newSettings = {
      ...props.settings,
      ui: {
        ...props.settings.ui,
        theme
      }
    };
    props.onSettingsChange(newSettings);
  };

  const exportSettings = async () => {
    try {
      const settingsJson = await storage.exportSettings();
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `fillo-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export settings:', error);
      alert('Failed to export settings');
    }
  };

  const importSettings = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    try {
      const text = await file.text();
      await storage.importSettings(text);
      
      // Reload settings
      const newSettings = await storage.getSettings();
      props.onSettingsChange(newSettings);
      
      alert('Settings imported successfully!');
    } catch (error) {
      console.error('Failed to import settings:', error);
      alert('Failed to import settings. Please check the file format.');
    }
    
    // Reset input
    input.value = '';
  };

  const resetSettings = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      try {
        await storage.clearAllData();
        const defaultSettings = await storage.getSettings();
        props.onSettingsChange(defaultSettings);
        alert('Settings reset successfully!');
      } catch (error) {
        console.error('Failed to reset settings:', error);
        alert('Failed to reset settings');
      }
    }
  };

  return (
    <div class="general-settings">
      <div class="ui-preferences">
        <h3>Interface Preferences</h3>
        
        <div class="form-group">
          <label class="toggle-label">
            <input
              type="checkbox"
              checked={props.settings.ui.showIcons}
              onChange={(e) => handleShowIconsChange(e.currentTarget.checked)}
              class="toggle-input"
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">Show generator icons on form fields</span>
          </label>
          <p class="help-text">
            Display small icons next to form fields that can be filled with AI-generated content.
          </p>
        </div>

        <div class="form-group">
          <label>Animation Speed</label>
          <div class="speed-control">
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={props.settings.ui.animationSpeed}
              onInput={(e) => handleAnimationSpeedChange(parseFloat(e.currentTarget.value))}
              class="speed-slider"
            />
            <span class="speed-value">{props.settings.ui.animationSpeed}x</span>
          </div>
          <div class="speed-labels">
            <span>Slow</span>
            <span>Normal</span>
            <span>Fast</span>
          </div>
        </div>

        <div class="form-group">
          <label>Theme</label>
          <select
            value={props.settings.ui.theme}
            onChange={(e) => handleThemeChange(e.currentTarget.value as 'auto' | 'light' | 'dark')}
            class="select"
          >
            <option value="auto">Auto (Follow System)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <div class="data-management">
        <h3>Data Management</h3>
        
        <div class="management-actions">
          <div class="action-group">
            <h4>Export Settings</h4>
            <p>Download your settings configuration (API keys are not included for security).</p>
            <button class="btn btn-secondary" onClick={exportSettings}>
              📥 Export Settings
            </button>
          </div>

          <div class="action-group">
            <h4>Import Settings</h4>
            <p>Upload a previously exported settings file to restore your configuration.</p>
            <input
              type="file"
              accept=".json"
              onChange={importSettings}
              style="display: none"
              id="import-file"
            />
            <label for="import-file" class="btn btn-secondary">
              📤 Import Settings
            </label>
          </div>

          <div class="action-group">
            <h4>Reset to Defaults</h4>
            <p>Reset all settings and clear all data. This will remove API keys and cached content.</p>
            <button class="btn btn-danger" onClick={resetSettings}>
              🔄 Reset All Settings
            </button>
          </div>
        </div>
      </div>

      <div class="about">
        <h3>About Fillo</h3>
        <div class="about-content">
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>Purpose:</strong> Intelligent form filling for localhost development</p>
          <p><strong>Security:</strong> Only works on localhost domains for safety</p>
          <p><strong>Privacy:</strong> All data stays local except for LLM API calls</p>
        </div>
        
        <div class="about-features">
          <h4>Features</h4>
          <ul>
            <li>✅ Multiple LLM providers (OpenAI, Anthropic, Google, Ollama)</li>
            <li>✅ Intelligent caching to reduce API calls</li>
            <li>✅ Adjustable creativity levels for varied content</li>
            <li>✅ Field-specific customization</li>
            <li>✅ Secure API key storage</li>
            <li>✅ Localhost-only operation for security</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;