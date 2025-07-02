// Content script that runs on zipForms pages
console.log('OOTB zipForms Integration loaded');

// Check if we have pending data to fill
const checkForPendingData = () => {
  chrome.storage.local.get(['pending_transaction'], (result) => {
    if (result.pending_transaction) {
      const data = result.pending_transaction;
      console.log('Found pending transaction data:', data);
      
      // Auto-fill forms based on page type
      autoFillForms(data);
      
      // Clear the pending data
      chrome.storage.local.remove(['pending_transaction']);
    }
  });
};

// Auto-fill form fields based on our property data
const autoFillForms = (data) => {
  // Wait for form to be fully loaded
  const fillFormFields = () => {
    // Property Address fields (common patterns in zipForms)
    fillField(['property_address', 'address', 'property_street_address'], data.property.address);
    
    // Client/Seller Information
    fillField(['seller_name', 'client_name', 'seller'], data.property.clientName);
    
    // Agent Information
    fillField(['listing_agent', 'agent_name', 'selling_agent'], data.property.sellingAgent);
    
    // Price Information
    fillField(['list_price', 'listing_price', 'price'], data.property.listPrice);
    
    // Property Type
    fillField(['property_type', 'prop_type'], data.property.propertyType);
    
    // Try to fill party information if available
    if (data.parties && data.parties.length > 0) {
      data.parties.forEach((party, index) => {
        if (party.role === 'Buyer') {
          fillField(['buyer_name', 'purchaser_name'], party.name);
          fillField(['buyer_email', 'purchaser_email'], party.email);
          fillField(['buyer_phone', 'purchaser_phone'], party.phone);
        }
        if (party.role === 'Buyer Agent') {
          fillField(['buyer_agent', 'selling_agent_name'], party.name);
          fillField(['buyer_agent_email'], party.email);
          fillField(['buyer_agent_phone'], party.phone);
        }
      });
    }
  };

  // Try immediately and after delays (forms may load dynamically)
  fillFormFields();
  setTimeout(fillFormFields, 1000);
  setTimeout(fillFormFields, 3000);
};

// Helper function to fill fields by various possible names/IDs
const fillField = (possibleNames, value) => {
  if (!value) return;
  
  possibleNames.forEach(name => {
    // Try by ID
    let field = document.getElementById(name);
    
    // Try by name attribute
    if (!field) {
      field = document.querySelector(`[name="${name}"]`);
    }
    
    // Try by data attributes
    if (!field) {
      field = document.querySelector(`[data-field="${name}"], [data-name="${name}"]`);
    }
    
    // Try by label text
    if (!field) {
      const labels = document.querySelectorAll('label');
      labels.forEach(label => {
        if (label.textContent.toLowerCase().includes(name.replace(/_/g, ' '))) {
          const forAttr = label.getAttribute('for');
          if (forAttr) {
            field = document.getElementById(forAttr);
          } else {
            // Check next sibling
            field = label.nextElementSibling;
          }
        }
      });
    }
    
    if (field && field.tagName) {
      if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (field.tagName === 'SELECT') {
        // Try to find matching option
        const options = field.options;
        for (let i = 0; i < options.length; i++) {
          if (options[i].text.toLowerCase().includes(value.toLowerCase()) ||
              options[i].value.toLowerCase().includes(value.toLowerCase())) {
            field.selectedIndex = i;
            field.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      }
    }
  });
};

// Monitor for form completion/save
const monitorFormCompletion = () => {
  // Listen for save/submit buttons
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') {
      const text = target.textContent || target.value || '';
      if (text.toLowerCase().includes('save') || 
          text.toLowerCase().includes('submit') ||
          text.toLowerCase().includes('complete')) {
        
        // Capture form data after a delay
        setTimeout(() => {
          captureFormData();
        }, 1000);
      }
    }
  });
};

// Capture completed form data
const captureFormData = () => {
  const formData = {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    fields: {}
  };
  
  // Capture all form fields
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(field => {
    const name = field.name || field.id || field.getAttribute('data-field');
    if (name && field.value) {
      formData.fields[name] = field.value;
    }
  });
  
  // Send back to dashboard
  chrome.runtime.sendMessage({
    type: 'form_completed',
    data: formData
  });
};

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'fill_form') {
    autoFillForms(request.data);
    sendResponse({ status: 'ok' });
  } else if (request.type === 'capture_form') {
    captureFormData();
    sendResponse({ status: 'ok' });
  }
});

// Initialize
checkForPendingData();
monitorFormCompletion();

// Also check localStorage from dashboard (if same origin)
const checkLocalStorage = () => {
  const pendingData = localStorage.getItem('zipforms_pending_transaction');
  if (pendingData) {
    try {
      const data = JSON.parse(pendingData);
      autoFillForms(data);
      localStorage.removeItem('zipforms_pending_transaction');
    } catch (e) {
      console.error('Error parsing pending data:', e);
    }
  }
};

// Check on load and periodically
checkLocalStorage();
setInterval(checkLocalStorage, 2000);