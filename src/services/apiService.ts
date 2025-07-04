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
}

export const apiService = ApiService.getInstance();