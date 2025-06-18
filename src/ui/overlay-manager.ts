import { FieldInfo, ProviderResponse } from '../types';
import { ContextExtractor } from '../utils/context-extractor';

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
    // Ensure we're running in a browser context with DOM access
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.error('OverlayManager: Cannot initialize outside browser context');
      return;
    }

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
    
    if (typeof document === 'undefined') {
      console.error('OverlayManager: Cannot inject styles, document is not defined');
      return;
    }

    const style = document.createElement('style');
    style.id = 'fillo-overlay-styles';
    
    // Import the CSS content
    console.log('Fillo: Loading overlay styles from:', chrome.runtime.getURL('src/ui/overlay.css'));
    
    fetch(chrome.runtime.getURL('src/ui/overlay.css'))
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load CSS: ${response.status} ${response.statusText}`);
        }
        return response.text();
      })
      .then(css => {
        style.textContent = css;
        document.head.appendChild(style);
        console.log('Fillo: Overlay styles injected successfully');
      })
      .catch(error => {
        console.error('Fillo: Failed to load overlay styles:', error);
      });

    this.stylesInjected = true;
  }

  attachToField(element: HTMLElement, fieldInfo: FieldInfo): void {
    // Don't attach if already attached
    if (this.activeFields.has(element)) {
      console.log('Fillo: Field already has button attached');
      return;
    }

    console.log('Fillo: Attaching button to field:', {
      type: fieldInfo.type,
      label: fieldInfo.label,
      element: element.tagName,
      inputType: (element as HTMLInputElement).type
    });

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
    
    // Use different icon for image fields
    if (fieldInfo.type === 'image' || fieldInfo.type === 'file') {
      button.innerHTML = '🖼️';
      button.title = 'Generate image with AI';
    } else {
      button.innerHTML = '✨';
      button.title = 'Generate content with AI';
    }

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
    if (typeof window === 'undefined') {
      console.error('OverlayManager: window is not defined, cannot position button');
      return;
    }

    let rect = element.getBoundingClientRect();
    const buttonSize = 28;
    const margin = 8;

    // For file inputs with opacity 0, try to find a visible parent container
    if (element.tagName === 'INPUT' && (element as HTMLInputElement).type === 'file') {
      const style = window.getComputedStyle(element);
      if (style.opacity === '0' || parseFloat(style.opacity) < 0.1) {
        // Look for a visible parent container (label, div, etc.)
        let container = element.parentElement;
        while (container && container !== document.body) {
          const containerStyle = window.getComputedStyle(container);
          if (containerStyle.opacity !== '0' && parseFloat(containerStyle.opacity || '1') > 0.1) {
            const containerRect = container.getBoundingClientRect();
            if (containerRect.width > 0 && containerRect.height > 0) {
              rect = containerRect;
              console.log('Fillo: Using container rect for file input:', container);
              break;
            }
          }
          container = container.parentElement;
        }
      }
    }

    // Position absolutely relative to the viewport
    button.style.position = 'absolute';
    button.style.left = `${rect.right - buttonSize - margin + window.scrollX}px`;
    
    if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
      button.style.top = `${rect.top + margin + window.scrollY}px`;
    } else {
      button.style.top = `${rect.top + (rect.height - buttonSize) / 2 + window.scrollY}px`;
    }

    console.log('Fillo: Button positioned at:', {
      left: button.style.left,
      top: button.style.top,
      elementRect: rect,
      elementType: element.tagName,
      inputType: (element as HTMLInputElement).type || 'N/A',
      buttonVisible: button.offsetWidth > 0
    });
  }

  private async showSuggestionPanel(element: HTMLElement, fieldInfo: FieldInfo): Promise<void> {
    const panel = document.createElement('div');
    panel.className = 'fillo-suggestion-panel';

    // Add specific class for image panels to make them wider
    if (fieldInfo.type === 'image' || fieldInfo.type === 'file') {
      panel.classList.add('fillo-image-panel');
    }

    // Check if provider is configured
    if (!this.hasProvider) {
      panel.innerHTML = this.createNoProviderContent();
    } else {
      // Handle image fields differently
      if (fieldInfo.type === 'image' || fieldInfo.type === 'file') {
        await this.showImageGenerationPanel(panel, element, fieldInfo);
      } else {
        panel.innerHTML = this.createLoadingContent();
        
        try {
          // Extract page context for enhanced content generation
          const pageContext = ContextExtractor.extractPageContext(element);
          
          // Generate content through background script
          const response = await this.sendMessage({
            action: 'generateContent',
            fieldInfo: {
              type: fieldInfo.type,
              label: fieldInfo.label,
              context: fieldInfo.context,
              signature: fieldInfo.signature
            },
            options: { 
              useCache: true,
              pageContext 
            }
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
      const button = this.activeButtons.get(element);
      document.addEventListener('click', (e) => {
        if (!panel.contains(e.target as Node) && e.target !== button) {
          this.closePanel(element);
        }
      }, { once: true });
    }, 0);
  }

  private positionPanel(element: HTMLElement, panel: HTMLElement): void {
    if (typeof window === 'undefined') {
      console.error('OverlayManager: window is not defined, cannot position panel');
      return;
    }

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

  private async showImageGenerationPanel(panel: HTMLElement, element: HTMLElement, fieldInfo: FieldInfo): Promise<void> {
    panel.innerHTML = this.createImageGenerationContent(fieldInfo);
  }

  private createImageGenerationContent(fieldInfo: FieldInfo): string {
    const header = `
      <div class="fillo-panel-header">
        <h3 class="fillo-panel-title">AI Image Generation</h3>
        <button class="fillo-panel-close" data-action="close">✕</button>
      </div>
    `;

    const content = `
      <div class="fillo-panel-content">
        <div class="fillo-image-options">
          <div class="fillo-image-option">
            <label>Image Size:</label>
            <select class="fillo-image-size" data-setting="size">
              <option value="auto" selected>Auto (best for context)</option>
              <option value="1024x1024">Square (1024x1024)</option>
              <option value="1536x1024">Landscape (1536x1024)</option>
              <option value="1024x1536">Portrait (1024x1536)</option>
            </select>
          </div>
          <div class="fillo-image-option">
            <label>Quality:</label>
            <select class="fillo-image-quality" data-setting="quality">
              <option value="auto" selected>Auto</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div class="fillo-image-preview-area" id="image-preview">
            <div class="fillo-image-placeholder">
              Click "Generate Image" to create an AI image
            </div>
          </div>
        </div>
      </div>
    `;

    const actions = `
      <div class="fillo-image-actions">
        <button class="fillo-generate-image-button" data-action="generate-image">
          🎨 Generate Image
        </button>
      </div>
    `;

    return header + content + actions;
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
      const creativityLabel = this.getTemperatureLabel(suggestion.creativityLevel);
      
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

    // For image fields
    if (fieldInfo.type === 'image' || fieldInfo.type === 'file') {
      const generateImageBtn = panel.querySelector('[data-action="generate-image"]');
      if (generateImageBtn) {
        generateImageBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          await this.generateImage(panel, element, fieldInfo);
        });
      }
    } else {
      // For text fields
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
  }

  private async regenerateContent(panel: HTMLElement, element: HTMLElement, fieldInfo: FieldInfo, multiple: boolean): Promise<void> {
    const content = panel.querySelector('.fillo-panel-content');
    if (!content) return;

    content.innerHTML = this.createLoadingContent();

    try {
      // Extract page context for enhanced content generation
      const pageContext = ContextExtractor.extractPageContext(element);
      
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
              varyCreativity: true,
              pageContext 
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
            forceRegenerate: true,
            pageContext 
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

  private async generateImage(panel: HTMLElement, element: HTMLElement, fieldInfo: FieldInfo): Promise<void> {
    const previewArea = panel.querySelector('.fillo-image-preview-area');
    const generateBtn = panel.querySelector('[data-action="generate-image"]') as HTMLButtonElement;
    
    if (!previewArea || !generateBtn) return;

    // Get selected options
    const sizeSelect = panel.querySelector('[data-setting="size"]') as HTMLSelectElement;
    const qualitySelect = panel.querySelector('[data-setting="quality"]') as HTMLSelectElement;
    
    const size = sizeSelect?.value || '1024x1024';
    const quality = qualitySelect?.value || 'standard';

    // Show loading state
    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ Generating...';
    previewArea.innerHTML = '<div class="fillo-loading-spinner"></div><div>Generating image...</div>';

    try {
      // Send message to background script to generate image
      const response = await this.sendMessage({
        action: 'generateImage',
        fieldInfo: {
          type: fieldInfo.type,
          label: fieldInfo.label,
          context: fieldInfo.context,
          signature: fieldInfo.signature
        },
        options: {
          size,
          quality
        }
      });

      if (response.success && response.imageUrl) {
        // Show preview
        previewArea.innerHTML = `
          <img src="${response.imageUrl}" alt="Generated image" class="fillo-generated-image" />
          <div class="fillo-image-actions">
            <button class="fillo-use-image-button" data-action="use-image">
              ✅ Use This Image
            </button>
            <button class="fillo-regenerate-image-button" data-action="regenerate-image">
              🔄 Generate Another
            </button>
          </div>
        `;

        // Store the image data for later use
        (previewArea as any)._imageData = {
          url: response.imageUrl,
          filename: response.filename || `generated-${Date.now()}.png`
        };

        // Add event listeners for new buttons
        const useImageBtn = previewArea.querySelector('[data-action="use-image"]');
        if (useImageBtn) {
          useImageBtn.addEventListener('click', async () => {
            await this.fillImageField(element as HTMLInputElement, (previewArea as any)._imageData);
            this.closePanel(element);
          });
        }

        const regenerateBtn = previewArea.querySelector('[data-action="regenerate-image"]');
        if (regenerateBtn) {
          regenerateBtn.addEventListener('click', async () => {
            await this.generateImage(panel, element, fieldInfo);
          });
        }
      } else {
        throw new Error(response.error || 'Failed to generate image');
      }
    } catch (error) {
      previewArea.innerHTML = `<div class="fillo-error-message">${error instanceof Error ? error.message : 'Failed to generate image'}</div>`;
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = '🎨 Generate Image';
    }
  }

  private async fillImageField(input: HTMLInputElement, imageData: { url: string; filename: string }): Promise<void> {
    try {
      // Fetch the image as a blob
      const response = await fetch(imageData.url);
      const blob = await response.blob();
      
      // Create a File object
      const file = new File([blob], imageData.filename, { type: blob.type });
      
      // Create a DataTransfer object and add the file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // Set the files property of the input
      input.files = dataTransfer.files;
      
      // Trigger change event
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (error) {
      console.error('Failed to set image file:', error);
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

  private getTemperatureLabel(temperature: number): string {
    if (temperature <= 0.3) return 'Very Predictable';
    if (temperature <= 0.5) return 'Predictable';
    if (temperature <= 0.8) return 'Balanced';
    if (temperature <= 1.2) return 'Creative';
    if (temperature <= 1.5) return 'Very Creative';
    return 'Experimental';
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