import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Property, Task } from './types';
import { dataService } from './services/dataService';

function App() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data and generate any needed price review tasks
    const loadData = () => {
      const allProperties = dataService.getAllProperties();
      const allTasks = dataService.getAllTasks();
      
      // Generate price review tasks automatically
      dataService.generatePriceReviewTasks();
      
      setProperties(allProperties);
      setTasks(dataService.getAllTasks()); // Reload to include any new auto-generated tasks
      setLoading(false);
    };

    loadData();
  }, []);

  const handlePropertyUpdate = () => {
    setProperties(dataService.getAllProperties());
    setTasks(dataService.getAllTasks());
  };

  const handleTaskUpdate = () => {
    setTasks(dataService.getAllTasks());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Dashboard 
        properties={properties} 
        tasks={tasks}
        onPropertyUpdate={handlePropertyUpdate}
        onTaskUpdate={handleTaskUpdate}
      />
    </div>
  );
}

export default App;