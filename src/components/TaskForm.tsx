import React, { useState } from 'react';
import { Task } from '../types';
import { X, Save, Calendar, User, AlertCircle } from 'lucide-react';

interface TaskFormProps {
  propertyId: string;
  taskType: 'pre-listing' | 'under-contract';
  onClose: () => void;
  onSave: (task: Omit<Task, 'id'>) => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ 
  propertyId, 
  taskType, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    category: '',
    assignedTo: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Task description is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const task: Omit<Task, 'id'> = {
      propertyId,
      title: formData.title.trim(),
      description: formData.description.trim(),
      dueDate: formData.dueDate,
      priority: formData.priority,
      category: formData.category.trim(),
      assignedTo: formData.assignedTo.trim() || 'Unassigned',
      status: 'Pending',
      taskType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(task);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const priorityColors = {
    Low: 'bg-green-100 text-green-800',
    Medium: 'bg-yellow-100 text-yellow-800', 
    High: 'bg-orange-100 text-orange-800',
    Urgent: 'bg-red-100 text-red-800'
  };

  // Get category suggestions based on task type
  const getCategorySuggestions = () => {
    if (taskType === 'pre-listing') {
      return [
        'Property Preparation',
        'Marketing',
        'Photography',
        'Staging',
        'Repairs & Maintenance',
        'Legal & Documentation',
        'Pricing Analysis'
      ];
    } else {
      return [
        'Contract Review',
        'Inspections',
        'Financing',
        'Appraisal',
        'Title & Escrow',
        'Final Walkthrough',
        'Closing Preparation'
      ];
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add New Task</h2>
            <p className="text-sm text-gray-600 mt-1">
              {taskType === 'pre-listing' ? 'Pre-listing preparation task' : 'Contract management task'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Schedule professional photography"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Describe what needs to be done..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.category ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a category...</option>
              {getCategorySuggestions().map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
              <option value="Other">Other</option>
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Due Date *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => updateField('dueDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.dueDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => updateField('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
              <div className="mt-2">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${priorityColors[formData.priority]}`}>
                  {formData.priority} Priority
                </span>
              </div>
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Assigned To
            </label>
            <input
              type="text"
              value={formData.assignedTo}
              onChange={(e) => updateField('assignedTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., John Smith or leave blank for unassigned"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Create Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};