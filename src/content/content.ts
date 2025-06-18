import { shouldActivate } from './hostname-checker';
import { FormDetector } from './form-detector';
import { OverlayManager } from '../ui/overlay-manager';
import { StorageManager } from '../storage/storage';

let detector: FormDetector | null = null;
let overlayManager: OverlayManager | null = null;
let settings: any = null;

async function init(): Promise<void> {
  console.log('Fillo: Checking activation...', {
    hostname: window.location.hostname,
    readyState: document.readyState,
    shouldActivate: shouldActivate()
  });
  
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
  
  // Log field details for debugging
  fields.forEach((field: any, index: number) => {
    console.log(`Fillo: Field ${index}:`, {
      type: field.type,
      label: field.label,
      tagName: field.element.tagName,
      inputType: field.element.type
    });
  });

  // Only show icons if enabled in settings
  if (!settings.ui.showIcons) {
    console.log('Fillo: Icons disabled in settings');
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

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fill-field') {
    // Handle field filling request
    console.log('Fillo: Received fill-field request', request);
    sendResponse({ success: true });
  }
  return true;
});

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