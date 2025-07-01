import React, { useState } from 'react';
import { Property, Task } from '../types';
import { X, Edit, MapPin, User, DollarSign, Calendar, Home, FileText, Plus, TrendingDown, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

interface PropertyDetailProps {
  property: Property;
  onClose: () => void;
  onSave: (property: Property) => void;
}

export const PropertyDetail: React.FC<PropertyDetailProps> = ({ property, onClose, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(property.notes);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Under Contract':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-amber-100 text-amber-800';
      case 'Hold':
        return 'bg-purple-100 text-purple-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriceChangeIndicator = () => {
    if (!property.startingListPrice || !property.currentListPrice) return null;
    
    const difference = property.currentListPrice - property.startingListPrice;
    if (difference === 0) return null;
    
    return (
      <div className={`flex items-center space-x-1 text-sm ${
        difference > 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {difference > 0 ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        <span>${Math.abs(difference).toLocaleString()}</span>
      </div>
    );
  };

  // Filter tasks based on property status
  const getRelevantTasks = () => {
    if (property.status === 'Under Contract' || property.status === 'Pending') {
      return property.tasks?.filter(task => task.taskType === 'under-contract') || [];
    } else {
      return property.tasks?.filter(task => task.taskType === 'pre-listing') || [];
    }
  };

  const relevantTasks = getRelevantTasks();
  const pendingTasks = relevantTasks.filter(task => task.status !== 'Completed');
  const completedTasks = relevantTasks.filter(task => task.status === 'Completed');

  const getContingencyStatus = (date: string) => {
    const today = new Date();
    const contingencyDate = new Date(date);
    const daysUntil = Math.ceil((contingencyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      return { status: 'overdue', color: 'text-red-600 bg-red-50 border-red-200', text: `${Math.abs(daysUntil)}d overdue` };
    } else if (daysUntil === 0) {
      return { status: 'today', color: 'text-red-600 bg-red-50 border-red-200', text: 'Due today' };
    } else if (daysUntil <= 2) {
      return { status: 'urgent', color: 'text-red-600 bg-red-50 border-red-200', text: `${daysUntil}d remaining` };
    } else if (daysUntil <= 5) {
      return { status: 'warning', color: 'text-amber-600 bg-amber-50 border-amber-200', text: `${daysUntil}d remaining` };
    } else {
      return { status: 'normal', color: 'text-green-600 bg-green-50 border-green-200', text: `${daysUntil}d remaining` };
    }
  };

  const handleSaveNotes = () => {
    const updatedProperty = { ...property, notes };
    onSave(updatedProperty);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{property.address}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(property.status)}`}>
                {property.status}
              </span>
              <span className="text-sm text-gray-500">
                {property.propertyType}
                {property.isRented && ' • Rented'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Contingency Dates for Under Contract Properties */}
          {(property.status === 'Under Contract' || property.status === 'Pending') && property.contingencyDates && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Contract Contingency Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Earnest Money', date: property.contingencyDates.earnestMoney },
                  { name: 'Inspection', date: property.contingencyDates.inspection },
                  { name: 'Title', date: property.contingencyDates.title },
                  { name: 'Appraisal', date: property.contingencyDates.appraisal },
                  { name: 'Lending', date: property.contingencyDates.lending },
                  { name: 'Occupancy', date: property.contingencyDates.occupancy }
                ].filter(c => c.date).map((contingency) => {
                  const status = getContingencyStatus(contingency.date!);
                  return (
                    <div key={contingency.name} className={`p-3 rounded-lg border ${status.color}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{contingency.name}</span>
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="text-sm mt-1">
                        {new Date(contingency.date!).toLocaleDateString()}
                      </div>
                      <div className="text-xs mt-1 font-medium">
                        {status.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Property Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h3>
              
              <div className="space-y-4">
                {/* Address */}
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Address</p>
                    <p className="text-sm text-gray-900">{property.address}</p>
                  </div>
                </div>

                {/* Agent */}
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Selling Agent</p>
                    <p className="text-sm text-gray-900">{property.sellingAgent}</p>
                  </div>
                </div>

                {/* Financial Info */}
                {(property.loanNumber || property.basisPoints) && (
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Loan Information</p>
                      {property.loanNumber && (
                        <p className="text-sm text-gray-900">Loan #: {property.loanNumber}</p>
                      )}
                      {property.basisPoints && (
                        <p className="text-sm text-gray-900">Basis Points: {property.basisPoints}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Pricing Information */}
                <div className="flex items-start space-x-3">
                  <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Pricing</p>
                    
                    {/* List Prices */}
                    {(property.startingListPrice || property.currentListPrice) && (
                      <div className="bg-gray-50 rounded-md p-3 mt-2 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">List Price</span>
                          {getPriceChangeIndicator()}
                        </div>
                        
                        {property.startingListPrice && (
                          <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-gray-600">Starting:</span>
                            <span className="font-medium text-gray-900">
                              ${property.startingListPrice.toLocaleString()}
                            </span>
                          </div>
                        )}
                        
                        {property.currentListPrice && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Current:</span>
                            <span className="font-semibold text-gray-900">
                              ${property.currentListPrice.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contract Price */}
                    {property.underContractPrice && (
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">Contract Price:</span> ${property.underContractPrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Closing Date */}
                {property.closingDate && (
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Closing Date</p>
                      <p className="text-sm text-gray-900">
                        {new Date(property.closingDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Property Type */}
                <div className="flex items-start space-x-3">
                  <Home className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Property Details</p>
                    <p className="text-sm text-gray-900">
                      {property.propertyType}
                      {property.isRented && ' (Currently Rented)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-gray-900">Notes</h4>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
                
                {isEditing ? (
                  <div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add notes about this property..."
                    />
                    <div className="flex justify-end space-x-2 mt-3">
                      <button
                        onClick={() => {
                          setNotes(property.notes);
                          setIsEditing(false);
                        }}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-md p-4">
                    <p className="text-sm text-gray-700">
                      {notes || 'No notes added yet.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Tasks */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {property.status === 'Under Contract' || property.status === 'Pending' 
                    ? 'Contract Tasks' 
                    : 'Pre-Listing Tasks'
                  }
                </h3>
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
                </button>
              </div>

              {/* Task Type Indicator */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  {property.status === 'Under Contract' || property.status === 'Pending' 
                    ? 'Showing tasks for contract management and closing process.'
                    : 'Showing tasks for getting the property ready to list.'
                  }
                </p>
              </div>

              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Pending Tasks</h4>
                  <div className="space-y-3">
                    {pendingTasks.map((task) => (
                      <div key={task.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-900">{task.title}</h5>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            task.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                            task.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                            task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          <span>{task.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Completed Tasks</h4>
                  <div className="space-y-2">
                    {completedTasks.map((task) => (
                      <div key={task.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h5 className="text-sm font-medium text-gray-700 line-through">{task.title}</h5>
                        <p className="text-xs text-gray-500">
                          Completed: {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingTasks.length === 0 && completedTasks.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No {property.status === 'Under Contract' || property.status === 'Pending' ? 'contract' : 'pre-listing'} tasks assigned yet.
                  </p>
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Add the first task
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};