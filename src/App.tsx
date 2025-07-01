import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Property, Task } from './types';
import { hybridDataService } from './services/hybridDataService';

function App() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'api' | 'localStorage'>('localStorage');

  useEffect(() => {
    // Load data and generate any needed price review tasks
    const loadData = async () => {
      try {
        // Check data source
        const source = await hybridDataService.getDataSource();
        setDataSource(source);
        
        const allProperties = await hybridDataService.getAllProperties();
        const allTasks = await hybridDataService.getAllTasks();
        
        // Generate price review tasks automatically (only for localStorage for now)
        if (source === 'localStorage') {
          hybridDataService.generatePriceReviewTasks();
          const updatedTasks = await hybridDataService.getAllTasks();
          setTasks(updatedTasks);
        } else {
          setTasks(allTasks);
        }
        
        setProperties(allProperties);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handlePropertyUpdate = async () => {
    try {
      const allProperties = await hybridDataService.getAllProperties();
      const allTasks = await hybridDataService.getAllTasks();
      setProperties(allProperties);
      setTasks(allTasks);
    } catch (error) {
      console.error('Failed to update properties:', error);
    }
  };

  const handleTaskUpdate = async () => {
    try {
      const allTasks = await hybridDataService.getAllTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error('Failed to update tasks:', error);
    }
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
        dataSource={dataSource}
      />
    </div>
  );
}

export default App;