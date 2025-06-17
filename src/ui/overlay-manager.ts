import { FieldInfo, ProviderResponse } from '../types';
import { getTemperatureLabel } from '../settings/creativity-presets';

export interface OverlayOptions {
  showIcons: boolean;
  animationSpeed: number;
}

export class OverlayManager {
  private static instance: OverlayManager;
  private activeFields: Map<HTMLElement, FieldInfo> = new Map();
  private activeButtons: Map<HTMLElement, HTMLElement> = new Map();
  private activePanels: Map<HTMLElement, HTMLElement> = new Map();
  private stylesInjected = false;
  private hasProvider = false;

  private constructor() {}

  static getInstance(): OverlayManager {
    if (!OverlayManager.instance) {
      OverlayManager.instance = new OverlayManager();
    }
    return OverlayManager.instance;
  }

  async initialize(): Promise<void> {
    // Check if any provider is configured by checking encrypted storage
    try {
      const encryptedKeysResult = await chrome.storage.local.get(['fillo_encrypted_keys']);
      const encryptedKeys = encryptedKeysResult.fillo_encrypted_keys || {};
      
      // If we have any encrypted API keys, we have a provider configured
      this.hasProvider = Object.keys(encryptedKeys).length > 0;
      console.log('OverlayManager: Found encrypted keys for providers:', Object.keys(encryptedKeys));
    } catch (error) {
      console.error('OverlayManager: Failed to check encrypted keys:', error);
      this.hasProvider = false;
    }
    
    this.injectStyles();
  }

  private sendMessage(message: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });
  }

  private injectStyles(): void {
    if (this.stylesInjected) return;

    const style = document.createElement('style');
    style.id = 'fillo-overlay-styles';
    
    // Import the CSS content
    fetch(chrome.runtime.getURL('src/ui/overlay.css'))
      .then(response => response.text())
      .then(css => {
        style.textContent = css;
        document.head.appendChild(style);
      })
      .catch(error => {
        console.error('Failed to load overlay styles:', error);
      });

    this.stylesInjected = true;
  }

  attachToField(element: HTMLElement, fieldInfo: FieldInfo): void {
    // Don't attach if already attached
    if (this.activeFields.has(element)) return;

    this.activeFields.set(element, fieldInfo);
    
    // Create and inject the button
    const button = this.createFieldButton(element, fieldInfo);
    this.activeButtons.set(element, button);

    // Position the button
    this.positionButton(element, button);

    // Add resize observer to reposition on layout changes
    const resizeObserver = new ResizeObserver(() => {
      this.positionButton(element, button);
    });
    resizeObserver.observe(element);

    // Store observer for cleanup
    (element as any)._filloResizeObserver = resizeObserver;
  }

  detachFromField(element: HTMLElement): void {
    const button = this.activeButtons.get(element);
    const panel = this.activePanels.get(element);

    if (button) {
      button.remove();
      this.activeButtons.delete(element);
    }

    if (panel) {
      panel.remove();
      this.activePanels.delete(element);
    }

    // Clean up resize observer
    const observer = (element as any)._filloResizeObserver;
    if (observer) {
      observer.disconnect();
      delete (element as any)._filloResizeObserver;
    }

    this.activeFields.delete(element);
  }

  private createFieldButton(element: HTMLElement, fieldInfo: FieldInfo): HTMLElement {
    const button = document.createElement('button');
    button.className = 'fillo-field-button';
    button.innerHTML = '✨';
    button.title = 'Generate content with AI';

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Close any other open panels
      this.closeAllPanels();

      // Toggle panel for this field
      const existingPanel = this.activePanels.get(element);
      if (existingPanel) {
        this.closePanel(element);
      } else {
        await this.showSuggestionPanel(element, fieldInfo);
      }
    });

    // Append button to document body for proper positioning
    document.body.appendChild(button);

    return button;
  }

  private positionButton(element: HTMLElement, button: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const buttonSize = 28;
    const margin = 8;

    // Position absolutely relative to the viewport
    button.style.position = 'absolute';
    button.style.left = `${rect.right - buttonSize - margin + window.scrollX}px`;
    
    if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
      button.style.top = `${rect.top + margin + window.scrollY}px`;
    } else {
      button.style.top = `${rect.top + (rect.height - buttonSize) / 2 + window.scrollY}px`;
    }
  }

  private async showSuggestionPanel(element: HTMLElement, fieldInfo: FieldInfo): Promise<void> {
    const panel = document.createElement('div');
    panel.className = 'fillo-suggestion-panel';

    // Check if provider is configured
    if (!this.hasProvider) {
      panel.innerHTML = this.createNoProviderContent();
    } else {
      panel.innerHTML = this.createLoadingContent();
      
      try {
        // Generate content through background script
        const response = await this.sendMessage({
          action: 'generateContent',
          fieldInfo: {
            type: fieldInfo.type,
            label: fieldInfo.label,
            context: fieldInfo.context,
            signature: fieldInfo.signature
          },
          options: { useCache: true }
        });
        
        if (response.success && response.response) {
          panel.innerHTML = this.createSuggestionsContent([response.response], fieldInfo);
        } else {
          throw new Error(response.error || 'Failed to generate content');
        }
      } catch (error) {
        panel.innerHTML = this.createErrorContent(error);
      }
    }

    // Add event listeners
    this.attachPanelEventListeners(panel, element, fieldInfo);

    // Append panel to document body for proper positioning
    document.body.appendChild(panel);

    this.activePanels.set(element, panel);

    // Position the panel
    this.positionPanel(element, panel);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!panel.contains(e.target as Node) && e.target !== button) {
          this.closePanel(element);
        }
      }, { once: true });
    }, 0);
  }

  private positionPanel(element: HTMLElement, panel: HTMLElement): void {
    const button = this.activeButtons.get(element);
    if (!button) return;

    const buttonRect = button.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    // Position below the button
    panel.style.position = 'absolute';
    panel.style.top = `${buttonRect.bottom + 8 + window.scrollY}px`;

    // Align to right edge of button by default
    let left = buttonRect.right - panelRect.width + window.scrollX;

    // Check if panel goes off screen to the left
    if (left < 8) {
      left = buttonRect.left + window.scrollX;
    }

    // Check if panel goes off screen to the right
    if (left + panelRect.width > window.innerWidth - 8) {
      left = window.innerWidth - panelRect.width - 8 + window.scrollX;
    }

    panel.style.left = `${left}px`;
  }

  private createLoadingContent(): string {
    return `
      <div class="fillo-loading-message">
        <div class="fillo-loading-spinner"></div>
        <div>Generating content...</div>
      </div>
    `;
  }

  private createNoProviderContent(): string {
    return `
      <div class="fillo-no-provider">
        <div class="fillo-no-provider-message">
          No AI provider configured. Please add an API key in settings.
        </div>
        <a href="#" class="fillo-settings-link" data-action="open-settings">
          Open Settings
        </a>
      </div>
    `;
  }

  private createErrorContent(error: any): string {
    const message = error instanceof Error ? error.message : 'Failed to generate content';
    return `
      <div class="fillo-error-message">
        ${message}
      </div>
    `;
  }

  private createSuggestionsContent(suggestions: ProviderResponse[], fieldInfo: FieldInfo): string {
    const header = `
      <div class="fillo-panel-header">
        <h3 class="fillo-panel-title">AI Suggestions</h3>
        <button class="fillo-panel-close" data-action="close">✕</button>
      </div>
    `;

    const suggestionItems = suggestions.map((suggestion, index) => {
      const creativityClass = this.getCreativityClass(suggestion.creativityLevel);
      const creativityLabel = getTemperatureLabel(suggestion.creativityLevel);
      
      return `
        <div class="fillo-suggestion ${suggestion.cached ? 'cached' : ''}" data-index="${index}">
          <div class="fillo-suggestion-text">${this.escapeHtml(suggestion.content)}</div>
          <div class="fillo-suggestion-meta">
            <span class="fillo-creativity-badge ${creativityClass}">
              ${creativityLabel}
            </span>
            <span class="fillo-provider-badge">${suggestion.provider}</span>
          </div>
        </div>
      `;
    }).join('');

    const content = `
      <div class="fillo-panel-content">
        ${suggestionItems}
      </div>
    `;

    const regenerate = `
      <div class="fillo-regenerate-section">
        <button class="fillo-regenerate-button" data-action="regenerate">
          🔄 Generate New
        </button>
        <button class="fillo-regenerate-button secondary" data-action="regenerate-multiple">
          ✨ Generate Multiple
        </button>
      </div>
    `;

    return header + content + regenerate;
  }

  private attachPanelEventListeners(panel: HTMLElement, element: HTMLElement, fieldInfo: FieldInfo): void {
    // Close button
    const closeBtn = panel.querySelector('[data-action="close"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.closePanel(element);
      });
    }

    // Settings link
    const settingsLink = panel.querySelector('[data-action="open-settings"]');
    if (settingsLink) {
      settingsLink.addEventListener('click', async (e) => {
        e.preventDefault();
        // Send message to background script to open options page
        await this.sendMessage({ action: 'openOptionsPage' });
        this.closePanel(element);
      });
    }

    // Suggestion clicks
    const suggestions = panel.querySelectorAll('.fillo-suggestion');
    suggestions.forEach((suggestion) => {
      suggestion.addEventListener('click', () => {
        const text = suggestion.querySelector('.fillo-suggestion-text')?.textContent;
        if (text) {
          this.fillField(element, text);
          this.closePanel(element);
        }
      });
    });

    // Regenerate buttons
    const regenerateBtn = panel.querySelector('[data-action="regenerate"]');
    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.regenerateContent(panel, element, fieldInfo, false);
      });
    }

    const regenerateMultipleBtn = panel.querySelector('[data-action="regenerate-multiple"]');
    if (regenerateMultipleBtn) {
      regenerateMultipleBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.regenerateContent(panel, element, fieldInfo, true);
      });
    }
  }

  private async regenerateContent(panel: HTMLElement, element: HTMLElement, fieldInfo: FieldInfo, multiple: boolean): Promise<void> {
    const content = panel.querySelector('.fillo-panel-content');
    if (!content) return;

    content.innerHTML = this.createLoadingContent();

    try {
      const responses: ProviderResponse[] = [];
      
      if (multiple) {
        // Generate multiple suggestions with varying creativity
        for (let i = 0; i < 3; i++) {
          const response = await this.sendMessage({
            action: 'generateContent',
            fieldInfo: {
              type: fieldInfo.type,
              label: fieldInfo.label,
              context: fieldInfo.context,
              signature: fieldInfo.signature
            },
            options: { 
              useCache: false, 
              forceRegenerate: true,
              varyCreativity: true 
            }
          });
          
          if (response.success && response.response) {
            responses.push(response.response);
          }
        }
      } else {
        // Generate single new suggestion
        const response = await this.sendMessage({
          action: 'generateContent',
          fieldInfo: {
            type: fieldInfo.type,
            label: fieldInfo.label,
            context: fieldInfo.context,
            signature: fieldInfo.signature
          },
          options: { 
            useCache: false, 
            forceRegenerate: true 
          }
        });
        
        if (response.success && response.response) {
          responses.push(response.response);
        }
      }

      if (responses.length > 0) {
        panel.innerHTML = this.createSuggestionsContent(responses, fieldInfo);
        // Re-attach event listeners
        this.attachPanelEventListeners(panel, element, fieldInfo);
      } else {
        throw new Error('Failed to generate content');
      }
    } catch (error) {
      content.innerHTML = this.createErrorContent(error);
    }
  }

  private fillField(element: HTMLElement, value: string): void {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;
      
      // Trigger input event for React and other frameworks
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
      
      // Also trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      element.dispatchEvent(changeEvent);
    } else if (element instanceof HTMLSelectElement) {
      // For select elements, try to find a matching option
      const options = Array.from(element.options);
      const matchingOption = options.find(opt => 
        opt.text.toLowerCase() === value.toLowerCase() ||
        opt.value.toLowerCase() === value.toLowerCase()
      );
      
      if (matchingOption) {
        element.value = matchingOption.value;
        const changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);
      }
    }
  }

  private closePanel(element: HTMLElement): void {
    const panel = this.activePanels.get(element);
    if (panel) {
      panel.remove();
      this.activePanels.delete(element);
    }
  }

  private closeAllPanels(): void {
    this.activePanels.forEach((panel) => {
      panel.remove();
    });
    this.activePanels.clear();
  }

  private getCreativityClass(level: number): string {
    if (level <= 0.3) return 'low';
    if (level <= 0.7) return 'medium';
    if (level <= 1.2) return 'high';
    return 'very-high';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  detachAll(): void {
    this.activeFields.forEach((_, element) => {
      this.detachFromField(element);
    });
  }
}