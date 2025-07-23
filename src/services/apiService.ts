import { Property, Task } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

class ApiService {
  private static instance: ApiService;

  private constructor() {}

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Get authentication headers
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.warn('API health check failed:', error);
      return false;
    }
  }

  // Properties API
  async getAllProperties(): Promise<Property[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch properties');
      return await response.json();
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  }

  async getPropertyById(id: string): Promise<Property> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties/${id}`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Property not found');
      return await response.json();
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  }

  async createProperty(property: Omit<Property, 'id' | 'tasks' | 'createdAt' | 'updatedAt'>): Promise<Property> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(property),
      });
      if (!response.ok) throw new Error('Failed to create property');
      return await response.json();
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update property');
      return await response.json();
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  }

  async deleteProperty(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  }

  // Tasks API
  async getAllTasks(): Promise<Task[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  async getTasksByPropertyId(propertyId: string): Promise<Task[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks?propertyId=${propertyId}`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks for property:', error);
      throw error;
    }
  }

  async completeTask(taskId: string, completionNotes?: string): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ completionNotes }),
      });
      if (!response.ok) throw new Error('Failed to complete task');
      const result = await response.json();
      return result.task;
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(task),
      });
      if (!response.ok) throw new Error('Failed to create task');
      return await response.json();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Search API
  async searchProperties(query: string): Promise<Property[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties?search=${encodeURIComponent(query)}`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Search failed');
      return await response.json();
    } catch (error) {
      console.error('Error searching properties:', error);
      throw error;
    }
  }

  // Dashboard stats
  async getDashboardStats(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // Transaction Coordinator APIs
  async getTransactionDocuments(propertyId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaction/${propertyId}/documents`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      return await response.json();
    } catch (error) {
      console.error('Error fetching transaction documents:', error);
      throw error;
    }
  }

  async uploadDocument(propertyId: string, file: File, category: string, notes?: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('propertyId', propertyId);
      if (notes) formData.append('notes', notes);

      const headers = this.getAuthHeaders();
      delete headers['Content-Type']; // Let browser set multipart boundary

      const response = await fetch(`${API_BASE_URL}/api/transaction/${propertyId}/documents/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload document');
      return await response.json();
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  async getTransactionParties(propertyId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaction/${propertyId}/parties`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch parties');
      return await response.json();
    } catch (error) {
      console.error('Error fetching transaction parties:', error);
      throw error;
    }
  }

  async createTransactionParty(propertyId: string, party: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaction/${propertyId}/parties`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(party),
      });
      if (!response.ok) throw new Error('Failed to create party');
      return await response.json();
    } catch (error) {
      console.error('Error creating transaction party:', error);
      throw error;
    }
  }

  async updateTransactionParty(propertyId: string, partyId: string, updates: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaction/${propertyId}/parties/${partyId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update party');
      return await response.json();
    } catch (error) {
      console.error('Error updating transaction party:', error);
      throw error;
    }
  }

  async getTransactionWorkflow(propertyId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaction/${propertyId}/workflow`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch workflow');
      return await response.json();
    } catch (error) {
      console.error('Error fetching transaction workflow:', error);
      throw error;
    }
  }

  async updateWorkflowTask(taskId: string, updates: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaction/workflow/${taskId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update workflow task');
      return await response.json();
    } catch (error) {
      console.error('Error updating workflow task:', error);
      throw error;
    }
  }

  async getTransactionTimeline(propertyId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaction/${propertyId}/timeline`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch timeline');
      return await response.json();
    } catch (error) {
      console.error('Error fetching transaction timeline:', error);
      throw error;
    }
  }

  async addTimelineEvent(propertyId: string, event: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaction/${propertyId}/timeline`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(event),
      });
      if (!response.ok) throw new Error('Failed to add timeline event');
      return await response.json();
    } catch (error) {
      console.error('Error adding timeline event:', error);
      throw error;
    }
  }

  // Database migration
  async addFileContentColumn(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/database/add-file-content-column`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to add file content column');
      return await response.json();
    } catch (error) {
      console.error('Error adding file content column:', error);
      throw error;
    }
  }

  // Document view/download
  async viewDocument(documentId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaction/documents/${documentId}/view`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to get document view URL');
      
      // Open in new tab
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up the URL object after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error viewing document:', error);
      throw error;
    }
  }

  async downloadDocument(documentId: string, filename: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaction/documents/${documentId}/download`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to download document');
      
      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaction/documents/${documentId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete document');
      return await response.json();
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
}

export const apiService = ApiService.getInstance();