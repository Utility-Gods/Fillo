chrome.runtime.onInstalled.addListener(() => {
  console.log('Fillo extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.url && isLocalhost(tab.url)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      files: ['src/content/content.js']
    });
  }
});

function isLocalhost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' ||
           hostname.endsWith('.localhost');
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkHostname') {
    const isValid = isLocalhost(request.url);
    sendResponse({ isValid });
  }
  return true;
});