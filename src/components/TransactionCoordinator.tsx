import React, { useState } from 'react';
import { Property } from '../types';
import { X, FileText, Users, CheckSquare, Calendar, Upload, Clock, AlertTriangle, Plus } from 'lucide-react';

interface TransactionCoordinatorProps {
  property: Property;
  mode: 'documents' | 'parties' | 'workflow' | 'timeline';
  onClose: () => void;
}

export const TransactionCoordinator: React.FC<TransactionCoordinatorProps> = ({
  property,
  mode,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState(mode);

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'documents': return <FileText className="h-4 w-4" />;
      case 'parties': return <Users className="h-4 w-4" />;
      case 'workflow': return <CheckSquare className="h-4 w-4" />;
      case 'timeline': return <Calendar className="h-4 w-4" />;
      default: return null;
    }
  };

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Document Management</h3>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Upload className="h-4 w-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Document Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Listing Agreement', count: 1, status: 'complete' },
          { name: 'Property Disclosures', count: 3, status: 'complete' },
          { name: 'Inspection Reports', count: 0, status: 'pending' },
          { name: 'Appraisal Documents', count: 0, status: 'pending' },
          { name: 'Contract & Amendments', count: 2, status: 'review' },
          { name: 'Title Documents', count: 0, status: 'pending' }
        ].map((category) => (
          <div key={category.name} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{category.name}</h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                category.status === 'complete' ? 'bg-green-100 text-green-800' :
                category.status === 'review' ? 'bg-amber-100 text-amber-800' :
                'bg-red-100 text-red-800'
              }`}>
                {category.count} docs
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {category.status === 'complete' ? 'All documents received' :
               category.status === 'review' ? 'Documents under review' :
               'Awaiting documents'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderParties = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Transaction Parties</h3>
        <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Plus className="h-4 w-4" />
          <span>Add Party</span>
        </button>
      </div>

      {/* Parties List */}
      <div className="space-y-4">
        {[
          { role: 'Seller', name: 'Trident Properties', email: 'contact@tridentprops.com', phone: '(314) 555-0123', status: 'active' },
          { role: 'Selling Agent', name: property.sellingAgent, email: 'agent@ootbproperties.com', phone: '(314) 555-0456', status: 'active' },
          { role: 'Buyer', name: 'Not assigned', email: '', phone: '', status: 'pending' },
          { role: 'Buyer Agent', name: 'Not assigned', email: '', phone: '', status: 'pending' },
          { role: 'Title Company', name: 'Not assigned', email: '', phone: '', status: 'pending' },
          { role: 'Lender', name: 'Not assigned', email: '', phone: '', status: 'pending' }
        ].map((party, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-gray-900">{party.role}</h4>
                <p className="text-sm text-gray-600">{party.name}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                party.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {party.status}
              </span>
            </div>
            {party.email && (
              <div className="space-y-1 text-sm text-gray-600">
                <p>📧 {party.email}</p>
                <p>📞 {party.phone}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderWorkflow = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Transaction Workflow</h3>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          {property.workflowType} Workflow
        </span>
      </div>

      {/* Workflow Phases */}
      <div className="space-y-4">
        {[
          { 
            phase: 'Pre-Listing', 
            tasks: [
              { name: 'Property Photos', status: 'complete' },
              { name: 'Market Analysis', status: 'complete' },
              { name: 'Listing Agreement', status: 'complete' },
              { name: 'MLS Listing', status: property.status === 'Active' ? 'complete' : 'pending' }
            ]
          },
          { 
            phase: 'Active Marketing', 
            tasks: [
              { name: 'Schedule Showings', status: property.status === 'Active' ? 'in-progress' : 'pending' },
              { name: 'Track Interest', status: property.status === 'Active' ? 'in-progress' : 'pending' },
              { name: 'Price Monitoring', status: property.status === 'Active' ? 'in-progress' : 'pending' }
            ]
          },
          { 
            phase: 'Under Contract', 
            tasks: [
              { name: 'Execute Contract', status: property.status === 'Under Contract' ? 'complete' : 'pending' },
              { name: 'Schedule Inspection', status: property.status === 'Under Contract' ? 'in-progress' : 'pending' },
              { name: 'Coordinate Appraisal', status: 'pending' },
              { name: 'Title Work', status: 'pending' }
            ]
          },
          { 
            phase: 'Closing', 
            tasks: [
              { name: 'Final Walkthrough', status: 'pending' },
              { name: 'Prepare Closing Docs', status: 'pending' },
              { name: 'Settlement', status: 'pending' },
              { name: 'Post-Closing Follow-up', status: 'pending' }
            ]
          }
        ].map((phase, phaseIndex) => (
          <div key={phaseIndex} className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">{phase.phase}</h4>
            <div className="space-y-2">
              {phase.tasks.map((task, taskIndex) => (
                <div key={taskIndex} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      task.status === 'complete' ? 'bg-green-500 border-green-500' :
                      task.status === 'in-progress' ? 'bg-blue-500 border-blue-500' :
                      'border-gray-300'
                    }`} />
                    <span className={`text-sm ${
                      task.status === 'complete' ? 'line-through text-gray-500' : 'text-gray-700'
                    }`}>
                      {task.name}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.status === 'complete' ? 'bg-green-100 text-green-800' :
                    task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.status.replace('-', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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
        {[
          { date: '2024-03-19', title: 'Property Listed', description: 'Listed on MLS at $129,900', status: 'complete', type: 'milestone' },
          { date: '2024-11-15', title: 'Price Reduction', description: 'Reduced to $99,900', status: 'complete', type: 'update' },
          { date: '2025-01-15', title: 'Showing Scheduled', description: 'Buyer showing at 2:00 PM', status: 'upcoming', type: 'event' },
          { date: '2025-02-01', title: 'Contract Review Due', description: 'Review market performance', status: 'upcoming', type: 'deadline' }
        ].map((event, index) => (
          <div key={index} className="flex items-start space-x-4 bg-white border border-gray-200 rounded-lg p-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              event.status === 'complete' ? 'bg-green-100' :
              event.status === 'upcoming' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              {event.type === 'milestone' ? <CheckSquare className="h-5 w-5 text-green-600" /> :
               event.type === 'deadline' ? <AlertTriangle className="h-5 w-5 text-red-600" /> :
               <Clock className="h-5 w-5 text-blue-600" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{event.title}</h4>
                <span className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{event.description}</p>
            </div>
          </div>
        ))}
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
          {renderContent()}
        </div>
      </div>
    </div>
  );
};