import React, { useState, useEffect } from 'react';
import { Mail, Play, Square, RefreshCw, AlertCircle, CheckCircle, Clock, Database, Zap } from 'lucide-react';
import { apiService } from '../services/apiService';

interface EmailSystemStatus {
  isRunning: boolean;
  emailsProcessed: number;
  propertyMatches: number;
  documentsStored: number;
  tasksCreated: number;
  errors: number;
  lastProcessed?: string;
  queueSize?: number;
}

export const EmailSystemControl: React.FC = () => {
  const [status, setStatus] = useState<EmailSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await apiService.getEmailProcessingStatus();
      setStatus(response);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load email system status:', err);
      setError(err.message || 'Failed to load status');
      // Set default status for display purposes
      setStatus({
        isRunning: false,
        emailsProcessed: 0,
        propertyMatches: 0,
        documentsStored: 0,
        tasksCreated: 0,
        errors: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const startEmailProcessing = async () => {
    try {
      setActionLoading(true);
      await apiService.startEmailProcessing();
      showNotification('success', 'Email processing started successfully');
      await loadStatus(); // Refresh status
    } catch (err: any) {
      console.error('Failed to start email processing:', err);
      showNotification('error', err.message || 'Failed to start email processing');
    } finally {
      setActionLoading(false);
    }
  };

  const stopEmailProcessing = async () => {
    try {
      setActionLoading(true);
      await apiService.stopEmailProcessing();
      showNotification('success', 'Email processing stopped successfully');
      await loadStatus(); // Refresh status
    } catch (err: any) {
      console.error('Failed to stop email processing:', err);
      showNotification('error', err.message || 'Failed to stop email processing');
    } finally {
      setActionLoading(false);
    }
  };

  const runDatabaseMigration = async () => {
    try {
      setActionLoading(true);
      await apiService.migrateEmailProcessing();
      showNotification('success', 'Database migration completed successfully');
    } catch (err: any) {
      console.error('Database migration failed:', err);
      showNotification('error', err.message || 'Database migration failed');
    } finally {
      setActionLoading(false);
    }
  };

  const processEmailsManually = async () => {
    try {
      setActionLoading(true);
      const result = await apiService.processEmailsManually();
      showNotification('success', `Manual processing completed. Processed ${result.status?.emailsProcessed || 0} emails.`);
      await loadStatus(); // Refresh status
    } catch (err: any) {
      console.error('Manual email processing failed:', err);
      showNotification('error', err.message || 'Manual email processing failed');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Refresh status every 30 seconds when system is running
    const interval = setInterval(() => {
      if (status?.isRunning) {
        loadStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [status?.isRunning]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading email system status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg border-l-4 max-w-md ${
          notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
          'bg-blue-50 border-blue-400 text-blue-800'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {notification.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
            {notification.type === 'info' && <AlertCircle className="h-5 w-5 text-blue-600" />}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Mail className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Email Processing System</h2>
              <p className="text-sm text-gray-600">Monitor and control automated email processing</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              status?.isRunning 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                status?.isRunning ? 'bg-green-600' : 'bg-gray-600'
              }`} />
              {status?.isRunning ? 'Running' : 'Stopped'}
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-amber-800 text-sm">
              <strong>System Status:</strong> {error}
            </p>
          </div>
          <p className="text-amber-700 text-xs mt-1">
            The system may not be fully configured. Check that GROK_API_KEY is set in environment variables.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Controls</h3>
        
        <div className="flex flex-wrap gap-3">
          {!status?.isRunning ? (
            <button
              onClick={startEmailProcessing}
              disabled={actionLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4" />
              <span>{actionLoading ? 'Starting...' : 'Start Email Processing'}</span>
            </button>
          ) : (
            <button
              onClick={stopEmailProcessing}
              disabled={actionLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square className="h-4 w-4" />
              <span>{actionLoading ? 'Stopping...' : 'Stop Email Processing'}</span>
            </button>
          )}
          
          <button
            onClick={loadStatus}
            disabled={actionLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>

          <button
            onClick={processEmailsManually}
            disabled={actionLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="h-4 w-4" />
            <span>Process Now</span>
          </button>

          <button
            onClick={runDatabaseMigration}
            disabled={actionLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Database className="h-4 w-4" />
            <span>Run DB Migration</span>
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>Testing Mode:</strong> The email system runs manually when started. It will process existing emails in the queue and then stop. 
            This prevents continuous polling until you're ready for production use.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Statistics</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{status?.emailsProcessed || 0}</div>
            <div className="text-sm text-gray-600">Emails Processed</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{status?.propertyMatches || 0}</div>
            <div className="text-sm text-gray-600">Property Matches</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{status?.documentsStored || 0}</div>
            <div className="text-sm text-gray-600">Documents Stored</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{status?.tasksCreated || 0}</div>
            <div className="text-sm text-gray-600">Tasks Created</div>
          </div>
        </div>

        {status?.errors && status.errors > 0 && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">{status.errors} Processing Errors</span>
            </div>
          </div>
        )}

        {status?.lastProcessed && (
          <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Last processed: {new Date(status.lastProcessed).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Configuration Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Status</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Email Account</span>
            <span className="text-sm font-medium">transaction.coordinator.agent@gmail.com</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">GROK API</span>
            <span className={`text-sm font-medium ${error ? 'text-red-600' : 'text-green-600'}`}>
              {error ? 'Not Configured' : 'Configured'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Database Schema</span>
            <span className="text-sm font-medium text-green-600">Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};