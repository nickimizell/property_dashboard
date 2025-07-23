import React, { useState, useEffect, useRef } from 'react';
import { Property } from '../types';
import { X, FileText, Users, CheckSquare, Calendar, Upload, Clock, AlertTriangle, Plus, Check, Phone, Mail, Building, Download, Eye, Trash2 } from 'lucide-react';
import { apiService } from '../services/apiService';

interface TransactionCoordinatorProps {
  property: Property;
  mode: 'documents' | 'parties' | 'workflow' | 'timeline';
  onClose: () => void;
}

interface TransactionData {
  documents: { [category: string]: any[] };
  parties: any[];
  workflow: { [phase: string]: any[] };
  timeline: any[];
}

export const TransactionCoordinator: React.FC<TransactionCoordinatorProps> = ({
  property,
  mode,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState(mode);
  const [transactionData, setTransactionData] = useState<TransactionData>({
    documents: {},
    parties: [],
    workflow: {},
    timeline: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Document upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Party management state
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [editingParty, setEditingParty] = useState<any>(null);
  const [partyForm, setPartyForm] = useState({
    role: '',
    name: '',
    email: '',
    phone: '',
    company: ''
  });
  
  // Timeline event state
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventType: 'update',
    eventDate: new Date().toISOString().split('T')[0]
  });
  
  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch transaction data when component mounts or property changes
  useEffect(() => {
    const fetchTransactionData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('auth_token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch all transaction data in parallel
        const [documentsRes, partiesRes, workflowRes, timelineRes] = await Promise.all([
          fetch(`/api/transaction/${property.id}/documents`, { headers }),
          fetch(`/api/transaction/${property.id}/parties`, { headers }),
          fetch(`/api/transaction/${property.id}/workflow`, { headers }),
          fetch(`/api/transaction/${property.id}/timeline`, { headers })
        ]);

        if (!documentsRes.ok || !partiesRes.ok || !workflowRes.ok || !timelineRes.ok) {
          throw new Error('Failed to fetch transaction data');
        }

        const [documents, parties, workflow, timeline] = await Promise.all([
          documentsRes.json(),
          partiesRes.json(),
          workflowRes.json(),
          timelineRes.json()
        ]);

        setTransactionData({
          documents: documents || {},
          parties: parties || [],
          workflow: workflow || {},
          timeline: timeline || []
        });
      } catch (err) {
        console.error('Error fetching transaction data:', err);
        // Set empty data instead of error for better UX
        setTransactionData({
          documents: {},
          parties: [],
          workflow: {},
          timeline: []
        });
        setError('Transaction data is being set up. Some features may be limited.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionData();
  }, [property.id]);

  // Document upload handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadCategory) return;
    
    setUploading(true);
    try {
      await apiService.uploadDocument(property.id, file, uploadCategory, uploadNotes);
      
      // Refresh documents
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/transaction/${property.id}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const documents = await response.json();
      setTransactionData(prev => ({ ...prev, documents }));
      
      // Show success message
      showNotification('success', `Document "${file.name}" uploaded successfully to ${uploadCategory}`);
      
      // Reset form after a brief delay
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadCategory('');
        setUploadNotes('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      showNotification('error', 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  // Party management handlers
  const handleAddParty = async () => {
    try {
      await apiService.createTransactionParty(property.id, partyForm);
      
      // Refresh parties
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/transaction/${property.id}/parties`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const parties = await response.json();
      setTransactionData(prev => ({ ...prev, parties }));
      
      // Show success message
      showNotification('success', `${partyForm.role} "${partyForm.name}" added successfully`);
      
      // Reset form
      setShowPartyModal(false);
      setPartyForm({ role: '', name: '', email: '', phone: '', company: '' });
    } catch (err) {
      console.error('Add party error:', err);
      showNotification('error', 'Failed to add party. Please try again.');
    }
  };
  
  // Workflow task handlers
  const handleUpdateTask = async (taskId: string, updates: any) => {
    try {
      await apiService.updateWorkflowTask(taskId, updates);
      
      // Refresh workflow
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/transaction/${property.id}/workflow`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const workflow = await response.json();
      setTransactionData(prev => ({ ...prev, workflow }));
      showNotification('success', 'Task updated successfully');
    } catch (err) {
      console.error('Update task error:', err);
      showNotification('error', 'Failed to update task. Please try again.');
    }
  };
  
  // Timeline handlers
  const handleAddEvent = async () => {
    try {
      await apiService.addTimelineEvent(property.id, eventForm);
      
      // Refresh timeline
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/transaction/${property.id}/timeline`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const timeline = await response.json();
      setTransactionData(prev => ({ ...prev, timeline }));
      
      // Show success message
      showNotification('success', `Timeline event "${eventForm.title}" added successfully`);
      
      // Reset form
      setShowEventModal(false);
      setEventForm({
        title: '',
        description: '',
        eventType: 'update',
        eventDate: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('Add event error:', err);
      showNotification('error', 'Failed to add timeline event. Please try again.');
    }
  };

  // Document deletion handler
  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to delete "${docName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteDocument(docId);
      
      // Refresh documents
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/transaction/${property.id}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const documents = await response.json();
      setTransactionData(prev => ({ ...prev, documents }));
      
      showNotification('success', `Document "${docName}" deleted successfully`);
    } catch (err) {
      console.error('Delete document error:', err);
      showNotification('error', 'Failed to delete document. Please try again.');
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'documents': return <FileText className="h-4 w-4" />;
      case 'parties': return <Users className="h-4 w-4" />;
      case 'workflow': return <CheckSquare className="h-4 w-4" />;
      case 'timeline': return <Calendar className="h-4 w-4" />;
      default: return null;
    }
  };

  const renderDocuments = () => {
    const categories = ['Listing Agreement', 'Property Disclosures', 'Inspection Reports', 'Appraisal Documents', 'Contract & Amendments', 'Title Documents'];
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Document Management</h3>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* Document Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((categoryName) => {
            const docs = transactionData.documents[categoryName] || [];
            const completeCount = docs.filter(doc => doc.status === 'complete').length;
            const reviewCount = docs.filter(doc => doc.status === 'review').length;
            const pendingCount = docs.filter(doc => doc.status === 'pending').length;
            
            let status = 'pending';
            if (docs.length > 0 && completeCount === docs.length) status = 'complete';
            else if (reviewCount > 0) status = 'review';
            
            return (
              <div key={categoryName} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{categoryName}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    status === 'complete' ? 'bg-green-100 text-green-800' :
                    status === 'review' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {docs.length} docs
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {status === 'complete' ? 'All documents received' :
                   status === 'review' ? 'Documents under review' :
                   'Awaiting documents'}
                </p>
                {docs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {docs.map((doc, index) => (
                      <div key={index} className="flex items-center p-2 bg-white rounded border border-gray-200 hover:border-gray-300">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0 max-w-[180px]">
                            <p className="text-sm font-medium text-gray-900 truncate" title={doc.document_name || doc.documentName || 'Untitled Document'}>
                              {doc.document_name || doc.documentName || 'Untitled Document'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {doc.file_type || 'Unknown type'} • {doc.file_size ? `${Math.round(doc.file_size / 1024)}KB` : 'Unknown size'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            doc.status === 'complete' ? 'bg-green-100 text-green-800' :
                            doc.status === 'review' ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {doc.status}
                          </span>
                          <button 
                            onClick={() => apiService.viewDocument(doc.id)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="View document"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => apiService.downloadDocument(doc.id, doc.document_name || doc.documentName || 'document')}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Download document"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteDocument(doc.id, doc.document_name || doc.documentName || 'document')}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderParties = () => {
    const allRoles = ['Seller', 'Selling Agent', 'Buyer', 'Buyer Agent', 'Title Company', 'Lender', 'Inspector', 'Appraiser'];
    const partiesByRole = transactionData.parties.reduce((acc, party) => {
      acc[party.role] = party;
      return acc;
    }, {} as { [key: string]: any });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Transaction Parties</h3>
          <button 
            onClick={() => setShowPartyModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Party</span>
          </button>
        </div>

        {/* Parties List */}
        <div className="space-y-4">
          {allRoles.map((role) => {
            const party = partiesByRole[role] || {
              role,
              name: 'Not assigned',
              email: '',
              phone: '',
              company: '',
              status: 'pending'
            };

            return (
              <div key={role} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{party.role}</h4>
                    <p className="text-sm text-gray-600">{party.name}</p>
                    {party.company && (
                      <p className="text-xs text-gray-500">{party.company}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    party.status === 'active' ? 'bg-green-100 text-green-800' : 
                    party.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {party.status}
                  </span>
                </div>
                {party.email && (
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>📧 {party.email}</p>
                    {party.phone && <p>📞 {party.phone}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWorkflow = () => {
    const phases = ['Pre-Listing', 'Active Marketing', 'Under Contract', 'Closing'];
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Transaction Workflow</h3>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {property.workflowType || 'Conventional'} Workflow
          </span>
        </div>

        {/* Workflow Phases */}
        <div className="space-y-4">
          {phases.map((phaseName) => {
            const phaseTasks = transactionData.workflow[phaseName] || [];
            
            return (
              <div key={phaseName} className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">{phaseName}</h4>
                <div className="space-y-2">
                  {phaseTasks.length > 0 ? (
                    phaseTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            task.status === 'complete' ? 'bg-green-500 border-green-500' :
                            task.status === 'in-progress' ? 'bg-blue-500 border-blue-500' :
                            'border-gray-300'
                          }`} />
                          <span className={`text-sm ${
                            task.status === 'complete' ? 'line-through text-gray-500' : 'text-gray-700'
                          }`}>
                            {task.taskName}
                          </span>
                          {task.assignedTo && (
                            <span className="text-xs text-gray-500">({task.assignedTo})</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {task.dueDate && (
                            <span className="text-xs text-gray-500">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.status === 'complete' ? 'bg-green-100 text-green-800' :
                            task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 italic">No tasks defined for this phase</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTimeline = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Transaction Timeline</h3>
        <button className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
          <Calendar className="h-4 w-4" />
          <span>Schedule Event</span>
        </button>
      </div>

      {/* Timeline Events */}
      <div className="space-y-4">
        {transactionData.timeline.length > 0 ? (
          transactionData.timeline.map((event) => (
            <div key={event.id} className="flex items-start space-x-4 bg-white border border-gray-200 rounded-lg p-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                event.status === 'complete' ? 'bg-green-100' :
                event.status === 'upcoming' ? 'bg-blue-100' : 
                event.status === 'overdue' ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                {event.eventType === 'milestone' ? <CheckSquare className="h-5 w-5 text-green-600" /> :
                 event.eventType === 'deadline' ? <AlertTriangle className="h-5 w-5 text-red-600" /> :
                 event.eventType === 'update' ? <Clock className="h-5 w-5 text-blue-600" /> :
                 <Calendar className="h-5 w-5 text-blue-600" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{event.title}</h4>
                  <span className="text-sm text-gray-500">
                    {new Date(event.eventDate).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                {event.createdBy && (
                  <p className="text-xs text-gray-500 mt-1">
                    Added by {event.createdBy}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No timeline events yet</p>
            <p className="text-gray-400 text-sm">Events will appear here as the transaction progresses</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'documents': return renderDocuments();
      case 'parties': return renderParties();
      case 'workflow': return renderWorkflow();
      case 'timeline': return renderTimeline();
      default: return renderDocuments();
    }
  };

  const handleZipFormsIntegration = async () => {
    // ZipForms integration temporarily disabled
    alert('ZipForms integration is currently being updated. Please check back later.');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Transaction Data</h3>
            <p className="text-gray-600">Please wait while we fetch the transaction information...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't show error modal for setup issues, just show warning in UI
  const showError = error && !error.includes('being set up');

  if (showError) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Transaction Coordinator</h2>
            <p className="text-sm text-gray-600 mt-1">{property.address}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {[
              { id: 'documents', label: 'Documents' },
              { id: 'parties', label: 'Parties' },
              { id: 'workflow', label: 'Workflow' },
              { id: 'timeline', label: 'Timeline' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {getTabIcon(tab.id)}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && error.includes('being set up') && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <p className="text-amber-800 text-sm">
                  {error} The database tables will be created automatically when the server restarts.
                </p>
              </div>
            </div>
          )}
          {renderContent()}
        </div>

        {/* ZipForms Integration Button */}
        <div className="absolute top-6 right-20">
          <button
            onClick={() => handleZipFormsIntegration()}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span>Open in zipForms</span>
          </button>
        </div>

        {/* Upload Document Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category...</option>
                    <option value="Listing Agreement">Listing Agreement</option>
                    <option value="Property Disclosures">Property Disclosures</option>
                    <option value="Inspection Reports">Inspection Reports</option>
                    <option value="Appraisal Documents">Appraisal Documents</option>
                    <option value="Contract & Amendments">Contract & Amendments</option>
                    <option value="Title Documents">Title Documents</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadCategory('');
                    setUploadNotes('');
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!uploadCategory || uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Select & Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Party Modal */}
        {showPartyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Party</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={partyForm.role}
                    onChange={(e) => setPartyForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select role...</option>
                    <option value="Seller">Seller</option>
                    <option value="Selling Agent">Selling Agent</option>
                    <option value="Buyer">Buyer</option>
                    <option value="Buyer Agent">Buyer Agent</option>
                    <option value="Title Company">Title Company</option>
                    <option value="Lender">Lender</option>
                    <option value="Inspector">Inspector</option>
                    <option value="Appraiser">Appraiser</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={partyForm.name}
                    onChange={(e) => setPartyForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={partyForm.email}
                    onChange={(e) => setPartyForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={partyForm.phone}
                    onChange={(e) => setPartyForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={partyForm.company}
                    onChange={(e) => setPartyForm(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowPartyModal(false);
                    setPartyForm({ role: '', name: '', email: '', phone: '', company: '' });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddParty}
                  disabled={!partyForm.role || !partyForm.name}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Party
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg border-l-4 max-w-md ${
            notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
            'bg-blue-50 border-blue-400 text-blue-800'
          }`}>
            <div className="flex items-center space-x-2">
              {notification.type === 'success' && <Check className="h-5 w-5 text-green-600" />}
              {notification.type === 'error' && <X className="h-5 w-5 text-red-600" />}
              {notification.type === 'info' && <AlertTriangle className="h-5 w-5 text-blue-600" />}
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};