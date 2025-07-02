import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './components/LoginPage';
import { UserManagement } from './components/UserManagement';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Property, Task } from './types';
import { hybridDataService } from './services/hybridDataService';
import { Settings, LogOut, Users } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'api' | 'localStorage'>('localStorage');
  const [currentView, setCurrentView] = useState<'dashboard' | 'users'>('dashboard');

  useEffect(() => {
    if (isAuthenticated) {
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
          setDataLoading(false);
        } catch (error) {
          console.error('Failed to load data:', error);
          setDataLoading(false);
        }
      };

      loadData();
    }
  }, [isAuthenticated]);

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

  const handleLogin = (token: string, userData: any) => {
    // Call the AuthContext login function
    login(token, userData);
    setCurrentView('dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (dataLoading) {
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
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">OOTB Properties</h1>
              <nav className="flex space-x-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dashboard
                </button>
                {user?.role === 'Admin' && (
                  <button
                    onClick={() => setCurrentView('users')}
                    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 ${
                      currentView === 'users'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Users</span>
                  </button>
                )}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.name}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                user?.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                user?.role === 'Agent' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {user?.role}
              </span>
              <button
                onClick={logout}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {currentView === 'dashboard' ? (
        <Dashboard 
          properties={properties} 
          tasks={tasks}
          onPropertyUpdate={handlePropertyUpdate}
          onTaskUpdate={handleTaskUpdate}
          dataSource={dataSource}
        />
      ) : (
        <UserManagement />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;