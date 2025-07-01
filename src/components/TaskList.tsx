import React, { useState } from 'react';
import { Task, Property } from '../types';
import { hybridDataService } from '../services/hybridDataService';
import { Calendar, User, AlertTriangle, CheckCircle, Clock, Filter, MessageSquare, Check } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  properties: Property[];
  onTaskUpdate: () => void;
}

interface TaskCompletionModalProps {
  task: Task;
  onClose: () => void;
  onComplete: (taskId: string, notes?: string) => void;
}

const TaskCompletionModal: React.FC<TaskCompletionModalProps> = ({ task, onClose, onComplete }) => {
  const [notes, setNotes] = useState('');
  const [requiresNotes, setRequiresNotes] = useState(task.taskType === 'price-review');

  const handleComplete = () => {
    if (requiresNotes && !notes.trim()) {
      alert('Please provide notes for this task completion.');
      return;
    }
    onComplete(task.id, notes.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Task</h3>
          
          <div className="mb-4">
            <h4 className="font-medium text-gray-900">{task.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
          </div>

          {task.taskType === 'price-review' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800 font-medium">
                Price Review Required
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Please document if price was reduced or explain why no reduction was made.
              </p>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Completion Notes {requiresNotes && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={
                task.taskType === 'price-review' 
                  ? "e.g., 'Reduced price by $10,000' or 'No reduction - comparable sales still support current price'"
                  : "Optional notes about task completion..."
              }
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Check className="h-4 w-4" />
              <span>Complete Task</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TaskList: React.FC<TaskListProps> = ({ tasks, properties, onTaskUpdate }) => {
  const [filter, setFilter] = useState<'all' | 'pre-listing' | 'under-contract' | 'price-review' | 'urgent' | 'overdue'>('all');
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? property.address.split(',')[0] : 'Unknown Property';
  };

  const getPropertyStatus = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? property.status : 'Unknown';
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const handleCompleteTask = async (taskId: string, notes?: string) => {
    try {
      await hybridDataService.completeTask(taskId, notes);
      onTaskUpdate();
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert('Failed to complete task. Please try again.');
    }
  };

  const filteredTasks = tasks.filter(task => {
    switch (filter) {
      case 'pre-listing':
        return task.taskType === 'pre-listing';
      case 'under-contract':
        return task.taskType === 'under-contract';
      case 'price-review':
        return task.taskType === 'price-review';
      case 'urgent':
        return task.priority === 'Urgent' && task.status !== 'Completed';
      case 'overdue':
        return isOverdue(task.dueDate) && task.status !== 'Completed';
      default:
        return true;
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case 'pre-listing':
        return 'bg-purple-100 text-purple-800';
      case 'under-contract':
        return 'bg-blue-100 text-blue-800';
      case 'price-review':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskTypeLabel = (taskType: string) => {
    switch (taskType) {
      case 'pre-listing':
        return 'Pre-Listing';
      case 'under-contract':
        return 'Under Contract';
      case 'price-review':
        return 'Price Review';
      default:
        return 'Other';
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Task Management</h2>
            
            {/* Filter buttons */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <div className="flex rounded-lg bg-gray-100 p-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pre-listing', label: 'Pre-Listing' },
                  { key: 'under-contract', label: 'Under Contract' },
                  { key: 'price-review', label: 'Price Review' },
                  { key: 'urgent', label: 'Urgent' },
                  { key: 'overdue', label: 'Overdue' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as any)}
                    className={`px-3 py-1 rounded-md text-sm transition-colors ${
                      filter === key 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="divide-y divide-gray-200">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No tasks match the current filter</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  {/* Status icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(task.status)}
                  </div>

                  {/* Task details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskTypeColor(task.taskType)}`}>
                        {getTaskTypeLabel(task.taskType)}
                      </span>
                      {task.isAutoGenerated && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Auto
                        </span>
                      )}
                      {isOverdue(task.dueDate) && task.status !== 'Completed' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Overdue
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    
                    {task.completionNotes && (
                      <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-green-800">Completion Notes:</p>
                            <p className="text-sm text-green-700">{task.completionNotes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Property: {getPropertyAddress(task.propertyId)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Status: {getPropertyStatus(task.propertyId)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Category: {task.category}</span>
                      </div>
                      {task.assignedTo && (
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{task.assignedTo}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="flex-shrink-0">
                    {task.status !== 'Completed' && (
                      <button
                        onClick={() => setCompletingTask(task)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                      >
                        <Check className="h-4 w-4" />
                        <span>Complete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Task completion modal */}
      {completingTask && (
        <TaskCompletionModal
          task={completingTask}
          onClose={() => setCompletingTask(null)}
          onComplete={handleCompleteTask}
        />
      )}
    </>
  );
};