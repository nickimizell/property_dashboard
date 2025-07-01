import { Property, Task } from '../types';
import { mockProperties, mockTasks } from '../data/mockData';

class DataService {
  private static instance: DataService;
  private readonly PROPERTIES_KEY = 'ootb_properties';
  private readonly TASKS_KEY = 'ootb_tasks';
  private readonly NEXT_PROPERTY_ID_KEY = 'ootb_next_property_id';
  private readonly NEXT_TASK_ID_KEY = 'ootb_next_task_id';

  private constructor() {
    this.initializeData();
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  private initializeData(): void {
    // Initialize with mock data if localStorage is empty
    if (!localStorage.getItem(this.PROPERTIES_KEY)) {
      localStorage.setItem(this.PROPERTIES_KEY, JSON.stringify(mockProperties));
      localStorage.setItem(this.NEXT_PROPERTY_ID_KEY, '6');
    }
    
    if (!localStorage.getItem(this.TASKS_KEY)) {
      localStorage.setItem(this.TASKS_KEY, JSON.stringify(mockTasks));
      localStorage.setItem(this.NEXT_TASK_ID_KEY, '11');
    }
  }

  // Property CRUD operations
  public getAllProperties(): Property[] {
    const data = localStorage.getItem(this.PROPERTIES_KEY);
    return data ? JSON.parse(data) : [];
  }

  public getPropertyById(id: string): Property | null {
    const properties = this.getAllProperties();
    return properties.find(p => p.id === id) || null;
  }

  public createProperty(propertyData: Omit<Property, 'id' | 'tasks' | 'createdAt' | 'updatedAt'>): Property {
    const properties = this.getAllProperties();
    const nextId = localStorage.getItem(this.NEXT_PROPERTY_ID_KEY) || '1';
    
    const newProperty: Property = {
      ...propertyData,
      id: nextId,
      tasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    properties.push(newProperty);
    localStorage.setItem(this.PROPERTIES_KEY, JSON.stringify(properties));
    localStorage.setItem(this.NEXT_PROPERTY_ID_KEY, (parseInt(nextId) + 1).toString());

    return newProperty;
  }

  public updateProperty(id: string, updates: Partial<Property>): Property | null {
    const properties = this.getAllProperties();
    const index = properties.findIndex(p => p.id === id);
    
    if (index === -1) return null;

    properties[index] = {
      ...properties[index],
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(this.PROPERTIES_KEY, JSON.stringify(properties));
    return properties[index];
  }

  public deleteProperty(id: string): boolean {
    const properties = this.getAllProperties();
    const filteredProperties = properties.filter(p => p.id !== id);
    
    if (filteredProperties.length === properties.length) return false;

    // Also delete associated tasks
    const tasks = this.getAllTasks();
    const filteredTasks = tasks.filter(t => t.propertyId !== id);
    localStorage.setItem(this.TASKS_KEY, JSON.stringify(filteredTasks));

    localStorage.setItem(this.PROPERTIES_KEY, JSON.stringify(filteredProperties));
    return true;
  }

  // Task CRUD operations
  public getAllTasks(): Task[] {
    const data = localStorage.getItem(this.TASKS_KEY);
    return data ? JSON.parse(data) : [];
  }

  public getTaskById(id: string): Task | null {
    const tasks = this.getAllTasks();
    return tasks.find(t => t.id === id) || null;
  }

  public getTasksByPropertyId(propertyId: string): Task[] {
    const tasks = this.getAllTasks();
    return tasks.filter(t => t.propertyId === propertyId);
  }

  public createTask(taskData: Omit<Task, 'id'>): Task {
    const tasks = this.getAllTasks();
    const nextId = localStorage.getItem(this.NEXT_TASK_ID_KEY) || '1';
    
    const newTask: Task = {
      ...taskData,
      id: nextId
    };

    tasks.push(newTask);
    localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks));
    localStorage.setItem(this.NEXT_TASK_ID_KEY, (parseInt(nextId) + 1).toString());

    return newTask;
  }

  public updateTask(id: string, updates: Partial<Task>): Task | null {
    const tasks = this.getAllTasks();
    const index = tasks.findIndex(t => t.id === id);
    
    if (index === -1) return null;

    tasks[index] = {
      ...tasks[index],
      ...updates,
      id // Ensure ID doesn't change
    };

    localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks));
    return tasks[index];
  }

  public completeTask(id: string, completionNotes?: string): Task | null {
    return this.updateTask(id, {
      status: 'Completed',
      completedAt: new Date().toISOString(),
      completionNotes
    });
  }

  public deleteTask(id: string): boolean {
    const tasks = this.getAllTasks();
    const filteredTasks = tasks.filter(t => t.id !== id);
    
    if (filteredTasks.length === tasks.length) return false;

    localStorage.setItem(this.TASKS_KEY, JSON.stringify(filteredTasks));
    return true;
  }

  // Search and filter operations
  public searchProperties(query: string): Property[] {
    const properties = this.getAllProperties();
    const lowercaseQuery = query.toLowerCase();
    
    return properties.filter(property => 
      property.address.toLowerCase().includes(lowercaseQuery) ||
      property.clientName.toLowerCase().includes(lowercaseQuery) ||
      property.sellingAgent.toLowerCase().includes(lowercaseQuery) ||
      property.notes.toLowerCase().includes(lowercaseQuery)
    );
  }

  public filterProperties(filters: {
    status?: string[];
    propertyType?: string[];
    isRented?: boolean;
    priceRange?: { min?: number; max?: number };
  }): Property[] {
    let properties = this.getAllProperties();

    if (filters.status && filters.status.length > 0) {
      properties = properties.filter(p => filters.status!.includes(p.status));
    }

    if (filters.propertyType && filters.propertyType.length > 0) {
      properties = properties.filter(p => filters.propertyType!.includes(p.propertyType));
    }

    if (filters.isRented !== undefined) {
      properties = properties.filter(p => p.isRented === filters.isRented);
    }

    if (filters.priceRange) {
      properties = properties.filter(p => {
        const price = p.currentListPrice || p.startingListPrice || 0;
        const min = filters.priceRange!.min || 0;
        const max = filters.priceRange!.max || Infinity;
        return price >= min && price <= max;
      });
    }

    return properties;
  }

  // Auto-generate price review tasks
  public generatePriceReviewTasks(): Task[] {
    const properties = this.getAllProperties();
    const tasks = this.getAllTasks();
    const newTasks: Task[] = [];

    properties.forEach(property => {
      if (property.status !== 'Active' || !property.listingDate) return;

      const listingDate = new Date(property.listingDate);
      const now = new Date();
      const daysOnMarket = Math.floor((now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24));

      // Check if we need 30-day or 60-day review tasks
      const needs30DayReview = daysOnMarket >= 30;
      const needs60DayReview = daysOnMarket >= 60;

      if (needs30DayReview) {
        const existing30Day = tasks.find(t => 
          t.propertyId === property.id && 
          t.taskType === 'price-review' && 
          t.title.includes('30 Days')
        );

        if (!existing30Day) {
          const nextId = localStorage.getItem(this.NEXT_TASK_ID_KEY) || '1';
          localStorage.setItem(this.NEXT_TASK_ID_KEY, (parseInt(nextId) + 1).toString());

          newTasks.push({
            id: nextId,
            title: 'Price Review - 30 Days on Market',
            description: 'Property has been on market for 30 days. Consider price reduction or document reason for maintaining current price.',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due in 7 days
            priority: 'High',
            status: 'Pending',
            category: 'Price Review',
            propertyId: property.id,
            taskType: 'price-review',
            isAutoGenerated: true
          });
        }
      }

      if (needs60DayReview) {
        const existing60Day = tasks.find(t => 
          t.propertyId === property.id && 
          t.taskType === 'price-review' && 
          t.title.includes('60 Days')
        );

        if (!existing60Day) {
          const nextId = localStorage.getItem(this.NEXT_TASK_ID_KEY) || '1';
          localStorage.setItem(this.NEXT_TASK_ID_KEY, (parseInt(nextId) + 1).toString());

          newTasks.push({
            id: nextId,
            title: 'Price Review - 60 Days on Market',
            description: 'Property has been on market for 60 days. Strong recommendation for price adjustment or enhanced marketing strategy.',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due in 3 days
            priority: 'Urgent',
            status: 'Pending',
            category: 'Price Review',
            propertyId: property.id,
            taskType: 'price-review',
            isAutoGenerated: true
          });
        }
      }
    });

    if (newTasks.length > 0) {
      const allTasks = [...tasks, ...newTasks];
      localStorage.setItem(this.TASKS_KEY, JSON.stringify(allTasks));
    }

    return newTasks;
  }

  // Backup and restore
  public exportData(): { properties: Property[]; tasks: Task[] } {
    return {
      properties: this.getAllProperties(),
      tasks: this.getAllTasks()
    };
  }

  public importData(data: { properties: Property[]; tasks: Task[] }): void {
    localStorage.setItem(this.PROPERTIES_KEY, JSON.stringify(data.properties));
    localStorage.setItem(this.TASKS_KEY, JSON.stringify(data.tasks));
    
    // Update next IDs
    const maxPropertyId = Math.max(...data.properties.map(p => parseInt(p.id)), 0);
    const maxTaskId = Math.max(...data.tasks.map(t => parseInt(t.id)), 0);
    
    localStorage.setItem(this.NEXT_PROPERTY_ID_KEY, (maxPropertyId + 1).toString());
    localStorage.setItem(this.NEXT_TASK_ID_KEY, (maxTaskId + 1).toString());
  }

  public clearAllData(): void {
    localStorage.removeItem(this.PROPERTIES_KEY);
    localStorage.removeItem(this.TASKS_KEY);
    localStorage.removeItem(this.NEXT_PROPERTY_ID_KEY);
    localStorage.removeItem(this.NEXT_TASK_ID_KEY);
    this.initializeData();
  }
}

export const dataService = DataService.getInstance();