// Background service worker for the extension
console.log('OOTB zipForms Integration background service started');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.type);
  
  if (request.type === 'form_completed') {
    // Forward completed form data to dashboard
    forwardToDashboard(request.data);
    sendResponse({ status: 'received' });
  } else if (request.type === 'ping') {
    // Response to dashboard checking if extension exists
    sendResponse({ status: 'ok', version: '1.0.0' });
  }
});

// Listen for external messages from the dashboard
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('External message from:', sender.origin);
  
  if (request.type === 'fill_zipforms') {
    // Store data and open zipForms
    chrome.storage.local.set({ pending_transaction: request.data }, () => {
      chrome.tabs.create({ 
        url: request.targetUrl || 'https://www.zipformplus.com',
        active: true 
      });
      sendResponse({ status: 'ok', message: 'Opening zipForms with data' });
    });
  }
});

// Forward completed form data back to dashboard
const forwardToDashboard = async (formData) => {
  try {
    // Get the dashboard URL from storage or use default
    const result = await chrome.storage.local.get(['dashboard_url']);
    const dashboardUrl = result.dashboard_url || 'http://localhost:3000';
    
    // Send to dashboard API
    const response = await fetch(`${dashboardUrl}/api/transaction/zipforms-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include any auth tokens if stored
      },
      body: JSON.stringify({
        type: 'form_completed',
        data: formData,
        source: 'browser_extension',
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      console.error('Failed to send data to dashboard');
    }
  } catch (error) {
    console.error('Error forwarding to dashboard:', error);
    
    // Fallback: store locally for manual retrieval
    chrome.storage.local.set({
      [`completed_form_${Date.now()}`]: formData
    });
  }
};

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('OOTB zipForms Integration installed');
  
  // Set default configuration
  chrome.storage.local.set({
    dashboard_url: 'http://localhost:3000',
    auto_fill_enabled: true,
    auto_capture_enabled: true
  });
});

// Monitor zipForms tabs for navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('zipform')) {
    // Inject content script if needed (backup for manifest)
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content-script.js']
    }).catch(err => console.log('Script already injected'));
  }
});