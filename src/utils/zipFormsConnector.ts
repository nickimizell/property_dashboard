// ZipForms Connector Utility
// Since official API access is limited, this uses a hybrid approach

export class ZipFormsConnector {
  private static instance: ZipFormsConnector;
  private browserExtensionId?: string;

  private constructor() {
    // Check if browser extension is installed
    this.checkBrowserExtension();
  }

  static getInstance(): ZipFormsConnector {
    if (!ZipFormsConnector.instance) {
      ZipFormsConnector.instance = new ZipFormsConnector();
    }
    return ZipFormsConnector.instance;
  }

  // Check if our browser extension is installed
  private checkBrowserExtension() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Send message to extension to check if it's installed
      try {
        chrome.runtime.sendMessage(
          'YOUR_EXTENSION_ID_HERE',
          { type: 'ping' },
          (response) => {
            if (response && response.status === 'ok') {
              this.browserExtensionId = 'YOUR_EXTENSION_ID_HERE';
            }
          }
        );
      } catch (e) {
        console.log('ZipForms browser extension not detected');
      }
    }
  }

  // Method 1: Direct URL Integration with Pre-filled Data
  async launchZipFormsWithData(property: any, formType?: string) {
    // Build URL with embedded data
    const baseUrl = 'https://www.zipformplus.com';
    
    // Create a data payload that can be picked up by browser extension
    const transactionData = {
      property: {
        address: property.address,
        clientName: property.clientName,
        sellingAgent: property.sellingAgent,
        listPrice: property.currentListPrice || property.startingListPrice,
        propertyType: property.propertyType,
        // Add all relevant property fields
      },
      parties: property.parties || [],
      timestamp: new Date().toISOString(),
      returnUrl: window.location.href,
      sessionId: this.generateSessionId()
    };

    // Store data temporarily in localStorage for browser extension to pick up
    localStorage.setItem('zipforms_pending_transaction', JSON.stringify(transactionData));

    // If specific form requested, try to deep link
    let targetUrl = baseUrl;
    if (formType) {
      // These would be actual zipForms form IDs once we map them
      const formMap: { [key: string]: string } = {
        'listing-agreement': '/forms/listing-agreement',
        'purchase-agreement': '/forms/purchase-agreement',
        'disclosure': '/forms/property-disclosure',
        // Add more form mappings
      };
      targetUrl = baseUrl + (formMap[formType] || '');
    }

    // Open zipForms in new tab
    const zipFormsWindow = window.open(targetUrl, 'zipforms_integration');

    // Set up listener for data back from zipForms (via browser extension)
    this.setupReturnDataListener(transactionData.sessionId);

    return transactionData.sessionId;
  }

  // Method 2: Zapier Webhook Integration
  async syncViaZapier(propertyId: string) {
    const zapierWebhookUrl = process.env.REACT_APP_ZAPIER_ZIPFORMS_WEBHOOK;
    
    if (!zapierWebhookUrl) {
      throw new Error('Zapier webhook URL not configured');
    }

    const response = await fetch(zapierWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync_forms',
        propertyId: propertyId,
        timestamp: new Date().toISOString(),
        callbackUrl: `${window.location.origin}/api/zipforms/webhook`
      })
    });

    if (!response.ok) {
      throw new Error('Zapier sync failed');
    }

    return await response.json();
  }

  // Method 3: File-based Integration
  async importZipFormsFile(file: File): Promise<any> {
    // Parse zipForms file format (usually PDF with embedded data)
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'zipforms_import');

    const response = await fetch('/api/transaction/import-zipforms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to import zipForms file');
    }

    return await response.json();
  }

  // Listen for data coming back from zipForms
  private setupReturnDataListener(sessionId: string) {
    // Listen for postMessage from browser extension
    const messageHandler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'zipforms_data_return' && event.data.sessionId === sessionId) {
        // Process returned data
        this.processReturnedData(event.data);
        window.removeEventListener('message', messageHandler);
      }
    };

    window.addEventListener('message', messageHandler);

    // Also check localStorage periodically (backup method)
    const checkInterval = setInterval(() => {
      const returnData = localStorage.getItem(`zipforms_return_${sessionId}`);
      if (returnData) {
        this.processReturnedData(JSON.parse(returnData));
        localStorage.removeItem(`zipforms_return_${sessionId}`);
        clearInterval(checkInterval);
      }
    }, 2000);

    // Clean up after 10 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      window.removeEventListener('message', messageHandler);
    }, 600000);
  }

  private processReturnedData(data: any) {
    // Send to backend to update transaction_documents
    fetch('/api/transaction/process-zipforms-return', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(response => {
      if (response.ok) {
        // Trigger UI update
        window.dispatchEvent(new CustomEvent('zipforms_data_imported', { detail: data }));
      }
    });
  }

  private generateSessionId(): string {
    return `zf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get form templates available in zipForms (cached)
  async getAvailableFormTemplates(): Promise<any[]> {
    // This would ideally come from API, but we'll use a static list
    // based on common MLS forms
    return [
      {
        id: 'rpa-ca',
        name: 'Residential Purchase Agreement',
        category: 'Contract',
        state: 'CA',
        version: '2024.1'
      },
      {
        id: 'rla-ca',
        name: 'Residential Listing Agreement',
        category: 'Listing',
        state: 'CA',
        version: '2024.1'
      },
      {
        id: 'spq-ca',
        name: 'Seller Property Questionnaire',
        category: 'Disclosure',
        state: 'CA',
        version: '2024.1'
      },
      {
        id: 'counter-ca',
        name: 'Counter Offer',
        category: 'Contract',
        state: 'CA',
        version: '2024.1'
      },
      // Add more forms based on your MLS
    ];
  }

  // Check if browser extension is available
  hasBrowserExtension(): boolean {
    return !!this.browserExtensionId;
  }
}

export const zipFormsConnector = ZipFormsConnector.getInstance();