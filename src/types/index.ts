export interface Property {
  id: string;
  address: string;
  clientName: string;
  sellingAgent: string;
  loanNumber?: string;
  basisPoints?: number;
  closingDate?: string;
  underContractPrice?: number;
  startingListPrice?: number;
  currentListPrice?: number;
  status: 'Active' | 'Under Contract' | 'Pending' | 'Closed' | 'Hold';
  propertyType: 'Single Family' | 'Duplex' | 'Rental' | 'Commercial';
  workflowType: 'Conventional' | 'Investor'; // New field for task workflow
  isRented: boolean;
  notes: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  tasks: Task[];
  contingencyDates?: ContingencyDates;
  createdAt: string;
  updatedAt: string;
  listingDate?: string; // When property was first listed
  lastPriceReduction?: string; // Last time price was reduced
}

export interface ContingencyDates {
  earnestMoney?: string;
  inspection?: string;
  title?: string;
  appraisal?: string;
  lending?: string;
  occupancy?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed';
  category: 'Listing Prep' | 'Under Contract' | 'Closing Prep' | 'Price Review' | 'Other';
  assignedTo?: string;
  completedAt?: string;
  completionNotes?: string;
  propertyId: string;
  taskType: 'listing-prep' | 'under-contract' | 'closing-prep' | 'price-review' | 'custom';
  isAutoGenerated?: boolean; // For automatic price reduction tasks
  templateId?: string; // Reference to task template
  dependencies?: string[]; // Task IDs that must be completed first
  requiredFor?: 'MLS_LISTING' | 'CONTRACT' | 'CLOSING'; // Key milestones
  order?: number; // Order within category
}

export interface DashboardStats {
  totalProperties: number;
  activeListings: number;
  underContract: number;
  pendingTasks: number;
  urgentTasks: number;
  avgDaysToClose: number;
}