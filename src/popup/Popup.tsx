import { Component, createSignal, onMount } from 'solid-js';

const Popup: Component = () => {
  const [isActive, setIsActive] = createSignal(false);
  const [status, setStatus] = createSignal('Checking...');

  onMount(async () => {
    try {
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
    } catch (error) {
      setStatus('Error checking page');
    }
  });

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