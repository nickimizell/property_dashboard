import { Property, Task } from '../types';
import { apiService } from './apiService';
import { dataService as localDataService } from './dataService';

class HybridDataService {
  private static instance: HybridDataService;
  private isApiAvailable: boolean = false;
  private apiChecked: boolean = false;

  private constructor() {}

  public static getInstance(): HybridDataService {
    if (!HybridDataService.instance) {
      HybridDataService.instance = new HybridDataService();
    }
    return HybridDataService.instance;
  }

  // Check API availability
  private async checkApiAvailability(): Promise<boolean> {
    if (this.apiChecked) {
      return this.isApiAvailable;
    }

    try {
      this.isApiAvailable = await apiService.healthCheck();
      this.apiChecked = true;
      console.log(`🔗 API Status: ${this.isApiAvailable ? 'Available' : 'Unavailable'} - Using ${this.isApiAvailable ? 'Database' : 'LocalStorage'}`);
      return this.isApiAvailable;
    } catch (error) {
      this.isApiAvailable = false;
      this.apiChecked = true;
      console.log('🔗 API Status: Unavailable - Using LocalStorage');
      return false;
    }
  }

  // Properties
  async getAllProperties(): Promise<Property[]> {
    const useApi = await this.checkApiAvailability();
    
    if (useApi) {
      try {
        return await apiService.getAllProperties();
      } catch (error) {
        console.warn('API failed, falling back to localStorage:', error);
        return localDataService.getAllProperties();
      }
    } else {
      return localDataService.getAllProperties();
    }
  }

  async getPropertyById(id: string): Promise<Property | null> {
    const useApi = await this.checkApiAvailability();
    
    if (useApi) {
      try {
        return await apiService.getPropertyById(id);
      } catch (error) {
        console.warn('API failed, falling back to localStorage:', error);
        return localDataService.getPropertyById(id);
      }
    } else {
      return localDataService.getPropertyById(id);
    }
  }

  async createProperty(propertyData: Omit<Property, 'id' | 'tasks' | 'createdAt' | 'updatedAt'>): Promise<Property> {
    const useApi = await this.checkApiAvailability();
    
    if (useApi) {
      try {
        return await apiService.createProperty(propertyData);
      } catch (error) {
        console.warn('API failed, falling back to localStorage:', error);
        return localDataService.createProperty(propertyData);
      }
    } else {
      return localDataService.createProperty(propertyData);
    }
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property | null> {
    const useApi = await this.checkApiAvailability();
    
    if (useApi) {
      try {
        return await apiService.updateProperty(id, updates);
      } catch (error) {
        console.warn('API failed, falling back to localStorage:', error);
        return localDataService.updateProperty(id, updates);
      }
    } else {
      return localDataService.updateProperty(id, updates);
    }
  }

  async deleteProperty(id: string): Promise<boolean> {
    const useApi = await this.checkApiAvailability();
    
    if (useApi) {
      try {
        return await apiService.deleteProperty(id);
      } catch (error) {
        console.warn('API failed, falling back to localStorage:', error);
        return localDataService.deleteProperty(id);
      }
    } else {
      return localDataService.deleteProperty(id);
    }
  }

  // Tasks
  async getAllTasks(): Promise<Task[]> {
    const useApi = await this.checkApiAvailability();
    
    if (useApi) {
      try {
        return await apiService.getAllTasks();
      } catch (error) {
        console.warn('API failed, falling back to localStorage:', error);
        return localDataService.getAllTasks();
      }
    } else {
      return localDataService.getAllTasks();
    }
  }

  async getTasksByPropertyId(propertyId: string): Promise<Task[]> {
    const useApi = await this.checkApiAvailability();
    
    if (useApi) {
      try {
        return await apiService.getTasksByPropertyId(propertyId);
      } catch (error) {
        console.warn('API failed, falling back to localStorage:', error);
        return localDataService.getTasksByPropertyId(propertyId);
      }
    } else {
      return localDataService.getTasksByPropertyId(propertyId);
    }
  }

  async completeTask(taskId: string, completionNotes?: string): Promise<Task | null> {
    const useApi = await this.checkApiAvailability();
    
    if (useApi) {
      try {
        return await apiService.completeTask(taskId, completionNotes);
      } catch (error) {
        console.warn('API failed, falling back to localStorage:', error);
        return localDataService.completeTask(taskId, completionNotes);
      }
    } else {
      return localDataService.completeTask(taskId, completionNotes);
    }
  }

  async createTask(taskData: Omit<Task, 'id'>): Promise<Task> {
    const useApi = await this.checkApiAvailability();
    
    if (useApi) {
      try {
        return await apiService.createTask(taskData);
      } catch (error) {
        console.warn('API failed, falling back to localStorage:', error);
        return localDataService.createTask(taskData);
      }
    } else {
      return localDataService.createTask(taskData);
    }
  }

  // Search and filter (enhanced for API)
  async searchProperties(query: string): Promise<Property[]> {
    const useApi = await this.checkApiAvailability();
    
    if (useApi) {
      try {
        return await apiService.searchProperties(query);
      } catch (error) {
        console.warn('API search failed, falling back to localStorage:', error);
        return localDataService.searchProperties(query);
      }
    } else {
      return localDataService.searchProperties(query);
    }
  }

  filterProperties(filters: any): Property[] {
    // For now, filtering stays local since it's complex to implement in API
    return localDataService.filterProperties(filters);
  }

  // Utility methods
  generatePriceReviewTasks(): Task[] {
    return localDataService.generatePriceReviewTasks();
  }

  exportData(): { properties: Property[]; tasks: Task[] } {
    return localDataService.exportData();
  }

  importData(data: { properties: Property[]; tasks: Task[] }): void {
    localDataService.importData(data);
  }

  clearAllData(): void {
    localDataService.clearAllData();
  }

  // Get current data source
  async getDataSource(): Promise<'api' | 'localStorage'> {
    const useApi = await this.checkApiAvailability();
    return useApi ? 'api' : 'localStorage';
  }
}

export const hybridDataService = HybridDataService.getInstance();