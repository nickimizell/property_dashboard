import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Property, Task } from '../types';
import { TaskForm } from './TaskForm';
import { X, Edit, Save, MapPin, User, DollarSign, Calendar, Home, FileText, Plus, TrendingDown, TrendingUp, Clock, CheckCircle2, Cancel } from 'lucide-react';

interface EditableFieldProps {
  label: string;
  value: any;
  field: keyof Property;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: string[];
  icon?: React.ReactNode;
  isEditing: boolean;
  onChange: (value: any) => void;
}

// Completely isolated EditableField to prevent re-renders
const EditableField = React.memo<EditableFieldProps>(({ 
  label, 
  value, 
  field, 
  type = 'text', 
  options, 
  icon, 
  isEditing, 
  onChange 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // Sync with prop changes only when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  const handleChange = useCallback((newValue: any) => {
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  const formatDateForInput = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  if (!isEditing) {
    if (!value && type !== 'number') return null;
    
    return (
      <div className="flex items-start space-x-3">
        {icon && <div className="text-gray-400 mt-0.5">{icon}</div>}
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-sm text-gray-900">
            {type === 'date' && value ? new Date(value).toLocaleDateString() :
             type === 'number' && value ? Math.round(value).toLocaleString() :
             value || 'Not set'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
        {icon && <div className="text-gray-400">{icon}</div>}
        <span>{label}</span>
      </label>
      {type === 'select' && options ? (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={localValue || ''}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue || ''}
          onChange={(e) => handleChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          value={type === 'date' ? formatDateForInput(localValue) : localValue || ''}
          onChange={(e) => {
            const newValue = type === 'number' ? (e.target.value ? Number(e.target.value) : null) :
                            type === 'date' ? (e.target.value || null) :
                            e.target.value;
            handleChange(newValue);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      )}
    </div>
  );
});

EditableField.displayName = 'EditableField';

interface PropertyDetailProps {
  property: Property;
  onClose: () => void;
  onSave: (property: Property) => void;
  onTaskCreate?: (task: Omit<Task, 'id'>) => void;
}

export const PropertyDetail: React.FC<PropertyDetailProps> = ({ property, onClose, onSave, onTaskCreate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProperty, setEditedProperty] = useState<Property>(property);
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Update edited property when prop changes (but not while editing)
  useEffect(() => {
    if (!isEditing) {
      setEditedProperty(property);
    }
  }, [property, isEditing]);

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
    if (!editedProperty.startingListPrice || !editedProperty.currentListPrice) return null;
    
    const difference = editedProperty.currentListPrice - editedProperty.startingListPrice;
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
        <span>${Math.abs(Math.round(difference)).toLocaleString()}</span>
      </div>
    );
  };

  const handleSave = () => {
    onSave(editedProperty);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProperty(property);
    setIsEditing(false);
  };

  // Create stable field update functions
  const createFieldUpdater = useCallback((field: keyof Property) => {
    return (value: any) => {
      setEditedProperty(prev => ({
        ...prev,
        [field]: value
      }));
    };
  }, []);

  // Filter tasks based on property status
  const getRelevantTasks = () => {
    if (editedProperty.status === 'Under Contract' || editedProperty.status === 'Pending') {
      return editedProperty.tasks?.filter(task => task.taskType === 'under-contract') || [];
    } else {
      return editedProperty.tasks?.filter(task => task.taskType === 'pre-listing') || [];
    }
  };

  const relevantTasks = getRelevantTasks();
  const pendingTasks = relevantTasks.filter(task => task.status !== 'Completed');
  const completedTasks = relevantTasks.filter(task => task.status === 'Completed');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editedProperty.address}
                  onChange={(e) => setEditedProperty(prev => ({ ...prev, address: e.target.value }))}
                  className="text-xl font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                  placeholder="Property address..."
                />
                <div className="flex items-center space-x-4">
                  <select
                    value={editedProperty.status}
                    onChange={(e) => setEditedProperty(prev => ({ ...prev, status: e.target.value }))}
                    className="px-3 py-1 rounded-full text-sm font-medium border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Hold">Hold</option>
                    <option value="Under Contract">Under Contract</option>
                    <option value="Pending">Pending</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <select
                    value={editedProperty.propertyType}
                    onChange={(e) => setEditedProperty(prev => ({ ...prev, propertyType: e.target.value }))}
                    className="text-sm text-gray-500 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Single Family">Single Family</option>
                    <option value="Duplex">Duplex</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Rental">Rental</option>
                  </select>
                  <label className="flex items-center space-x-2 text-sm text-gray-500">
                    <input
                      type="checkbox"
                      checked={editedProperty.isRented || false}
                      onChange={(e) => setEditedProperty(prev => ({ ...prev, isRented: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Rented</span>
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{editedProperty.address}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(editedProperty.status)}`}>
                    {editedProperty.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {editedProperty.propertyType}
                    {editedProperty.isRented && ' • Rented'}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-1 px-3 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Property Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h3>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <EditableField
                    label="Client Name"
                    value={editedProperty.clientName}
                    field="clientName"
                    icon={<User className="h-5 w-5" />}
                    isEditing={isEditing}
                    onChange={createFieldUpdater('clientName')}
                  />

                  <EditableField
                    label="Selling Agent"
                    value={editedProperty.sellingAgent}
                    field="sellingAgent"
                    icon={<User className="h-5 w-5" />}
                    isEditing={isEditing}
                    onChange={createFieldUpdater('sellingAgent')}
                  />

                  <EditableField
                    label="Workflow Type"
                    value={editedProperty.workflowType}
                    field="workflowType"
                    type="select"
                    options={['Conventional', 'Investor']}
                    icon={<FileText className="h-5 w-5" />}
                    isEditing={isEditing}
                    onChange={createFieldUpdater('workflowType')}
                  />
                </div>

                {/* Financial Information */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Financial Information</h4>
                  <div className="space-y-4">
                    <EditableField
                      label="Loan Number"
                      value={editedProperty.loanNumber}
                      field="loanNumber"
                      icon={<FileText className="h-5 w-5" />}
                      isEditing={isEditing}
                      onChange={createFieldUpdater('loanNumber')}
                    />

                    <EditableField
                      label="Basis Points"
                      value={editedProperty.basisPoints}
                      field="basisPoints"
                      type="number"
                      icon={<DollarSign className="h-5 w-5" />}
                      isEditing={isEditing}
                      onChange={createFieldUpdater('basisPoints')}
                    />

                    <EditableField
                      label="Starting List Price"
                      value={editedProperty.startingListPrice}
                      field="startingListPrice"
                      type="number"
                      icon={<DollarSign className="h-5 w-5" />}
                      isEditing={isEditing}
                      onChange={createFieldUpdater('startingListPrice')}
                    />

                    <EditableField
                      label="Current List Price"
                      value={editedProperty.currentListPrice}
                      field="currentListPrice"
                      type="number"
                      icon={<DollarSign className="h-5 w-5" />}
                      isEditing={isEditing}
                      onChange={createFieldUpdater('currentListPrice')}
                    />

                    <EditableField
                      label="Under Contract Price"
                      value={editedProperty.underContractPrice}
                      field="underContractPrice"
                      type="number"
                      icon={<DollarSign className="h-5 w-5" />}
                      isEditing={isEditing}
                      onChange={createFieldUpdater('underContractPrice')}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Important Dates</h4>
                  <div className="space-y-4">
                    <EditableField
                      label="Listing Date"
                      value={editedProperty.listingDate}
                      field="listingDate"
                      type="date"
                      icon={<Calendar className="h-5 w-5" />}
                      isEditing={isEditing}
                      onChange={createFieldUpdater('listingDate')}
                    />

                    <EditableField
                      label="Closing Date"
                      value={editedProperty.closingDate}
                      field="closingDate"
                      type="date"
                      icon={<Calendar className="h-5 w-5" />}
                      isEditing={isEditing}
                      onChange={createFieldUpdater('closingDate')}
                    />

                    <EditableField
                      label="Last Price Reduction"
                      value={editedProperty.lastPriceReduction}
                      field="lastPriceReduction"
                      type="date"
                      icon={<Calendar className="h-5 w-5" />}
                      isEditing={isEditing}
                      onChange={createFieldUpdater('lastPriceReduction')}
                    />
                  </div>
                </div>

                {/* Notes Section */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Notes</h4>
                  <EditableField
                    label="Property Notes"
                    value={editedProperty.notes}
                    field="notes"
                    type="textarea"
                    icon={<FileText className="h-5 w-5" />}
                    isEditing={isEditing}
                    onChange={createFieldUpdater('notes')}
                  />
                </div>

                {/* Price Change Indicator */}
                {!isEditing && getPriceChangeIndicator() && (
                  <div className="bg-gray-50 rounded-md p-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Price Change</span>
                      {getPriceChangeIndicator()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Tasks */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editedProperty.status === 'Under Contract' || editedProperty.status === 'Pending' 
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
                  {editedProperty.status === 'Under Contract' || editedProperty.status === 'Pending' 
                    ? 'Showing tasks for contract management and closing process.'
                    : 'Showing tasks for getting the property ready to list.'
                  }
                </p>
              </div>

              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Pending Tasks ({pendingTasks.length})</h4>
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
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Completed Tasks ({completedTasks.length})</h4>
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
                    No {editedProperty.status === 'Under Contract' || editedProperty.status === 'Pending' ? 'contract' : 'pre-listing'} tasks assigned yet.
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

      {/* Task Form Modal */}
      {showTaskForm && onTaskCreate && (
        <TaskForm
          propertyId={property.id}
          taskType={editedProperty.status === 'Under Contract' || editedProperty.status === 'Pending' ? 'under-contract' : 'pre-listing'}
          onClose={() => setShowTaskForm(false)}
          onSave={(task) => {
            onTaskCreate(task);
            setShowTaskForm(false);
          }}
        />
      )}
    </div>
  );
};