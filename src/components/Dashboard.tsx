import React, { useState, useEffect } from 'react';
import { Property, Task, DashboardStats } from '../types';
import { hybridDataService } from '../services/hybridDataService';
import { PropertyCard } from './PropertyCard';
import { OSMMapView } from './OSMMapView';
import { TaskList } from './TaskList';
import { PropertyForm } from './PropertyForm';
import { PropertyDetail } from './PropertyDetail';
import { StatsCards } from './StatsCards';
import { SearchAndFilter, PropertyFilters } from './SearchAndFilter';
import { TransactionCoordinator } from './TransactionCoordinator';
import { Plus, Map, List, BarChart3 } from 'lucide-react';

interface DashboardProps {
  properties: Property[];
  tasks: Task[];
  onPropertyUpdate: () => void;
  onTaskUpdate: () => void;
  dataSource: 'api' | 'localStorage';
}

export const Dashboard: React.FC<DashboardProps> = ({ properties, tasks, onPropertyUpdate, onTaskUpdate, dataSource }) => {
  const [view, setView] = useState<'grid' | 'map' | 'tasks'>('grid');
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(properties);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<PropertyFilters>({});
  const [transactionCoordinator, setTransactionCoordinator] = useState<{
    property: Property;
    mode: 'documents' | 'parties' | 'workflow' | 'timeline';
  } | null>(null);

  // Update filtered properties when properties, search, or filters change
  useEffect(() => {
    let result = properties;

    // Apply search first
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(property => 
        property.address.toLowerCase().includes(searchLower) ||
        property.clientName.toLowerCase().includes(searchLower) ||
        property.sellingAgent.toLowerCase().includes(searchLower) ||
        property.notes.toLowerCase().includes(searchLower)
      );
    }

    // Then apply filters
    if (Object.keys(activeFilters).length > 0) {
      if (activeFilters.status && activeFilters.status.length > 0) {
        result = result.filter(p => activeFilters.status!.includes(p.status));
      }

      if (activeFilters.propertyType && activeFilters.propertyType.length > 0) {
        result = result.filter(p => activeFilters.propertyType!.includes(p.propertyType));
      }

      if (activeFilters.isRented !== undefined) {
        result = result.filter(p => p.isRented === activeFilters.isRented);
      }

      if (activeFilters.priceRange) {
        result = result.filter(p => {
          const price = p.currentListPrice || p.startingListPrice || 0;
          const min = activeFilters.priceRange!.min || 0;
          const max = activeFilters.priceRange!.max || Infinity;
          return price >= min && price <= max;
        });
      }
    }

    setFilteredProperties(result);
  }, [properties, searchQuery, activeFilters]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilter = (filters: PropertyFilters) => {
    setActiveFilters(filters);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveFilters({});
    setFilteredProperties(properties);
  };

  const calculateStats = (): DashboardStats => {
    const totalProperties = properties.length;
    const activeListings = properties.filter(p => p.status === 'Active').length;
    const underContract = properties.filter(p => p.status === 'Under Contract').length;
    const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
    const urgentTasks = tasks.filter(t => t.priority === 'Urgent' && t.status !== 'Completed').length;
    
    const closedProperties = properties.filter(p => p.status === 'Closed');
    const avgDaysToClose = closedProperties.length > 0 
      ? closedProperties.reduce((sum, p) => {
          const created = new Date(p.createdAt);
          const updated = new Date(p.updatedAt);
          return sum + (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / closedProperties.length
      : 0;

    return {
      totalProperties,
      activeListings,
      underContract,
      pendingTasks,
      urgentTasks,
      avgDaysToClose: Math.round(avgDaysToClose)
    };
  };

  const stats = calculateStats();

  const getOutstandingTasksCount = (propertyId: string): number => {
    return tasks.filter(task => 
      task.propertyId === propertyId && 
      task.status !== 'Completed'
    ).length;
  };

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
  };

  const handleTransactionAction = (action: string, property: Property) => {
    console.log(`Transaction action: ${action} for property: ${property.address}`);
    
    // Set the transaction coordinator modal with the selected property and mode
    setTransactionCoordinator({
      property,
      mode: action as 'documents' | 'parties' | 'workflow' | 'timeline'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Property Management Dashboard</h1>
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-600">Real Estate Portfolio Overview</p>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  dataSource === 'api' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {dataSource === 'api' ? '🔗 Database Connected' : '💾 Local Storage'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Toggle */}
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    view === 'grid' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView('map')}
                  className={`p-2 rounded-md transition-colors ${
                    view === 'map' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Map className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView('tasks')}
                  className={`p-2 rounded-md transition-colors ${
                    view === 'tasks' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              
              {/* Add Property Button */}
              <button
                onClick={() => setShowPropertyForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Property</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Search and Filter */}
        {view !== 'tasks' && (
          <SearchAndFilter
            onSearch={handleSearch}
            onFilter={handleFilter}
            onClear={handleClearFilters}
          />
        )}

        {/* Content based on view */}
        {view === 'grid' && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Properties Overview
                {filteredProperties.length !== properties.length && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({filteredProperties.length} of {properties.length} properties)
                  </span>
                )}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  outstandingTasks={getOutstandingTasksCount(property.id)}
                  onClick={() => handlePropertyClick(property)}
                  onTransactionAction={handleTransactionAction}
                />
              ))}
              {filteredProperties.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500">No properties match the current search or filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'map' && (
          <div className="mt-8">
            <OSMMapView 
              properties={filteredProperties} 
              onPropertyClick={handlePropertyClick}
              getOutstandingTasksCount={getOutstandingTasksCount}
            />
          </div>
        )}

        {view === 'tasks' && (
          <div className="mt-8">
            <TaskList tasks={tasks} properties={properties} onTaskUpdate={onTaskUpdate} />
          </div>
        )}
      </main>

      {/* Modals */}
      {showPropertyForm && (
        <PropertyForm
          onClose={() => setShowPropertyForm(false)}
          onSave={async (property) => {
            try {
              console.log('🏠 Creating property:', property);
              const newProperty = await hybridDataService.createProperty(property);
              console.log('✅ Property created successfully:', newProperty);
              onPropertyUpdate();
              setShowPropertyForm(false);
              
              // Force a brief delay to ensure state updates
              setTimeout(() => {
                console.log('🔄 Triggering property update callback');
                onPropertyUpdate();
              }, 100);
            } catch (error) {
              console.error('Failed to create property:', error);
              alert('Failed to create property. Please try again.');
            }
          }}
        />
      )}

      {selectedProperty && (
        <PropertyDetail
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onSave={async (updatedProperty) => {
            try {
              await hybridDataService.updateProperty(selectedProperty.id, updatedProperty);
              onPropertyUpdate();
              setSelectedProperty(null);
            } catch (error) {
              console.error('Failed to update property:', error);
              alert('Failed to update property. Please try again.');
            }
          }}
        />
      )}

      {transactionCoordinator && (
        <TransactionCoordinator
          property={transactionCoordinator.property}
          mode={transactionCoordinator.mode}
          onClose={() => setTransactionCoordinator(null)}
        />
      )}
    </div>
  );
};