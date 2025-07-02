import React, { useState } from 'react';
import { FileText, ExternalLink, Download, Upload, RefreshCw } from 'lucide-react';
import { Property } from '../types';

interface ZipFormsIntegrationProps {
  property: Property;
  onClose: () => void;
}

export const ZipFormsIntegration: React.FC<ZipFormsIntegrationProps> = ({ property, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Common real estate forms that might be in zipForms
  const commonForms = [
    { id: 'listing-agreement', name: 'Listing Agreement', category: 'Listing' },
    { id: 'property-disclosure', name: 'Property Disclosure Statement', category: 'Disclosure' },
    { id: 'purchase-agreement', name: 'Residential Purchase Agreement', category: 'Contract' },
    { id: 'counter-offer', name: 'Counter Offer', category: 'Contract' },
    { id: 'inspection-notice', name: 'Inspection Notice', category: 'Inspection' },
    { id: 'addendum', name: 'Addendum', category: 'Contract' },
  ];

  const handleLaunchZipForms = () => {
    // Open zipForms in new tab with property data in URL params
    const zipFormsUrl = 'https://www.zipformplus.com';
    const params = new URLSearchParams({
      address: property.address,
      client: property.clientName,
      agent: property.sellingAgent,
      // Add other relevant property data
    });
    
    window.open(`${zipFormsUrl}?${params.toString()}`, '_blank');
  };

  const handleImportFromZipForms = async () => {
    setLoading(true);
    setSyncStatus('syncing');
    
    try {
      // In a real implementation, this would:
      // 1. Use Zapier webhook or browser extension to fetch forms
      // 2. Import form data and PDFs
      // 3. Update transaction_documents table
      
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSyncStatus('success');
      
      // Show success message
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Import failed:', error);
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportToZipForms = async (formId: string) => {
    // This would export property data to pre-fill a zipForms template
    console.log('Exporting to zipForms:', formId);
    
    // In real implementation:
    // 1. Gather property data
    // 2. Format for zipForms
    // 3. Use browser extension or API to populate form
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">zipForms Integration</h2>
            <p className="text-sm text-gray-600 mt-1">{property.address}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Actions */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-3">Quick Actions</h3>
            <div className="flex space-x-3">
              <button
                onClick={handleLaunchZipForms}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open in zipForms</span>
              </button>
              
              <button
                onClick={handleImportFromZipForms}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>Import Forms</span>
              </button>
            </div>
            
            {/* Sync Status */}
            {syncStatus !== 'idle' && (
              <div className={`mt-3 text-sm ${
                syncStatus === 'success' ? 'text-green-600' :
                syncStatus === 'error' ? 'text-red-600' :
                'text-blue-600'
              }`}>
                {syncStatus === 'syncing' && 'Syncing with zipForms...'}
                {syncStatus === 'success' && '✓ Forms imported successfully'}
                {syncStatus === 'error' && '✗ Import failed. Please try again.'}
              </div>
            )}
          </div>

          {/* Available Forms */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Available Form Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {commonForms.map((form) => (
                <div key={form.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{form.name}</p>
                        <p className="text-xs text-gray-500">{form.category}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExportToZipForms(form.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Integration Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Integration Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Connection Method:</span>
                <span className="font-medium">Zapier Webhook</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Sync:</span>
                <span className="font-medium">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Auto-sync:</span>
                <span className="font-medium text-green-600">Enabled</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">How it works:</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Click "Open in zipForms" to launch with pre-filled property data</li>
              <li>Complete your forms in zipForms as usual</li>
              <li>Click "Import Forms" to sync completed documents back to dashboard</li>
              <li>Documents will appear in the Transaction Coordinator</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add this to TransactionCoordinator as a new button
export const ZipFormsButton: React.FC<{ property: Property }> = ({ property }) => {
  const [showIntegration, setShowIntegration] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowIntegration(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        <FileText className="h-4 w-4" />
        <span>zipForms</span>
      </button>

      {showIntegration && (
        <ZipFormsIntegration
          property={property}
          onClose={() => setShowIntegration(false)}
        />
      )}
    </>
  );
};