import { shouldActivate } from './hostname-checker';
import { FormDetector } from './form-detector';

let detector: FormDetector | null = null;

function init(): void {
  if (!shouldActivate()) {
    console.log('Fillo: Not activating on this domain');
    return;
  }

  console.log('Fillo: Activating on localhost');
  
  detector = new FormDetector();
  detector.start();

  // Listen for field changes
  document.addEventListener('fillo:fields-changed', (event: CustomEvent) => {
    console.log('Fillo: Fields detected:', event.detail.fields.length);
    // TODO: Inject UI components for detected fields
  });
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
});