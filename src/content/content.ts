import { shouldActivate } from './hostname-checker';
import { FormDetector } from './form-detector';
import { OverlayManager } from '../ui/overlay-manager';
import { StorageManager } from '../storage/storage';

let detector: FormDetector | null = null;
let overlayManager: OverlayManager | null = null;
let settings: any = null;

async function init(): Promise<void> {
  if (!shouldActivate()) {
    console.log('Fillo: Not activating on this domain');
    return;
  }

  console.log('Fillo: Activating on localhost');
  
  // Load settings
  const storage = StorageManager.getInstance();
  settings = await storage.getSettings();

  // Initialize overlay manager
  overlayManager = OverlayManager.getInstance();
  await overlayManager.initialize();

  // Start form detection
  detector = new FormDetector();
  detector.start();

  // Listen for field changes
  document.addEventListener('fillo:fields-changed', handleFieldsChanged);

  // Initial field setup
  const fields = detector.getFields();
  if (fields.length > 0) {
    handleFieldsChanged(new CustomEvent('fillo:fields-changed', { detail: { fields } }));
  }

  // Listen for settings changes
  chrome.storage.onChanged.addListener(handleStorageChanged);
}

function handleFieldsChanged(event: CustomEvent): void {
  if (!overlayManager || !settings) return;

  const { fields } = event.detail;
  console.log('Fillo: Fields detected:', fields.length);

  // Only show icons if enabled in settings
  if (!settings.ui.showIcons) {
    overlayManager.detachAll();
    return;
  }

  // Attach overlay to each field
  fields.forEach((fieldInfo: any) => {
    overlayManager.attachToField(fieldInfo.element, fieldInfo);
  });
}

async function handleStorageChanged(changes: any, namespace: string): Promise<void> {
  if (namespace !== 'local') return;

  // Reload settings if they changed
  if (changes.fillo_settings) {
    const storage = StorageManager.getInstance();
    settings = await storage.getSettings();

    // Re-apply field overlays based on new settings
    if (detector) {
      const fields = detector.getFields();
      handleFieldsChanged(new CustomEvent('fillo:fields-changed', { detail: { fields } }));
    }
  }
}

// Listen for keyboard commands
chrome.commands.onCommand.addListener((command) => {
  console.log('Fillo: Keyboard command received:', command);
  handleKeyboardCommand(command);
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fill-field') {
    // Handle field filling request
    console.log('Fillo: Received fill-field request', request);
    sendResponse({ success: true });
  } else if (request.action === 'keyboard-command') {
    // Handle keyboard command from background
    handleKeyboardCommand(request.command);
    sendResponse({ success: true });
  }
  return true;
});

async function handleKeyboardCommand(command: string): Promise<void> {
  if (!detector || !overlayManager || !settings) {
    console.log('Fillo: Not initialized, ignoring keyboard command');
    return;
  }

  switch (command) {
    case 'generate-focused':
      await handleGenerateFocused();
      break;
    case 'fill-all':
      await handleFillAll();
      break;
    case 'toggle-overlay':
      await handleToggleOverlay();
      break;
    default:
      console.log('Fillo: Unknown keyboard command:', command);
  }
}

async function handleGenerateFocused(): Promise<void> {
  const focusedElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
  
  if (!focusedElement || (!focusedElement.matches('input') && !focusedElement.matches('textarea'))) {
    console.log('Fillo: No form field focused');
    return;
  }

  const fields = detector!.getFields();
  const fieldInfo = fields.find(f => f.element === focusedElement);
  
  if (!fieldInfo) {
    console.log('Fillo: Focused element is not a detected form field');
    return;
  }

  console.log('Fillo: Generating content for focused field:', fieldInfo);
  
  // Trigger generation through overlay manager
  overlayManager!.generateContent(fieldInfo);
}

async function handleFillAll(): Promise<void> {
  console.log('Fillo: Filling all form fields');
  
  const fields = detector!.getFields();
  
  for (const fieldInfo of fields) {
    try {
      await overlayManager!.generateContent(fieldInfo);
      // Add small delay between generations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Fillo: Error filling field:', fieldInfo, error);
    }
  }
}

async function handleToggleOverlay(): Promise<void> {
  const storage = StorageManager.getInstance();
  const currentSettings = await storage.getSettings();
  
  // Toggle the showIcons setting
  currentSettings.ui.showIcons = !currentSettings.ui.showIcons;
  await storage.saveSettings(currentSettings);
  
  console.log('Fillo: Toggled overlay visibility:', currentSettings.ui.showIcons);
  
  // The storage change listener will handle re-applying overlays
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (detector) {
    detector.stop();
  }
  if (overlayManager) {
    overlayManager.detachAll();
  }
});