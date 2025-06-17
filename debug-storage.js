// Debug script to inspect Fillo storage
// Run this in the browser console on any localhost page where Fillo is active

async function inspectFilloStorage() {
  console.log('=== Fillo Storage Inspector ===');
  
  try {
    // Check Chrome storage
    console.log('\n1. Chrome Storage (API Keys & Settings):');
    const chromeStorage = await chrome.storage.local.get();
    console.log('Chrome storage contents:', chromeStorage);
    
    // Check if Fillo settings exist
    if (chromeStorage.fillo_settings) {
      console.log('Fillo settings found:', chromeStorage.fillo_settings);
      console.log('Providers:', chromeStorage.fillo_settings.providers);
    } else {
      console.log('No Fillo settings found in Chrome storage');
    }
    
    // Check IndexedDB (Cache entries)
    console.log('\n2. IndexedDB (Cache entries):');
    const request = indexedDB.open('fillo_cache', 1);
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction(['responses'], 'readonly');
      const store = transaction.objectStore('responses');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = function() {
        const cacheEntries = getAllRequest.result;
        console.log(`Found ${cacheEntries.length} cache entries:`, cacheEntries);
        
        if (cacheEntries.length > 0) {
          console.log('Sample cache entry:', cacheEntries[0]);
        }
      };
    };
    
    request.onerror = function() {
      console.log('IndexedDB not found or error accessing it');
    };
    
    // Test settings via message
    console.log('\n3. Testing settings via background script:');
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    console.log('Settings via background script:', response);
    
  } catch (error) {
    console.error('Error inspecting storage:', error);
  }
}

// Run the inspection
inspectFilloStorage();