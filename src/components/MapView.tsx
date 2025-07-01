import React from 'react';
import { Property } from '../types';
import { MapPin, Home } from 'lucide-react';

interface MapViewProps {
  properties: Property[];
  onPropertyClick: (property: Property) => void;
  getOutstandingTasksCount: (propertyId: string) => number;
}

export const MapView: React.FC<MapViewProps> = ({ 
  properties, 
  onPropertyClick,
  getOutstandingTasksCount 
}) => {
  const getMarkerColor = (outstandingTasks: number) => {
    if (outstandingTasks === 0) return 'text-green-500';
    if (outstandingTasks <= 2) return 'text-amber-500';
    return 'text-red-500';
  };

  // Calculate map bounds
  const lats = properties.map(p => p.coordinates.lat);
  const lngs = properties.map(p => p.coordinates.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  // Map dimensions and scaling
  const mapWidth = 800;
  const mapHeight = 600;
  const padding = 50;

  const scaleX = (lng: number) => 
    ((lng - minLng) / (maxLng - minLng)) * (mapWidth - 2 * padding) + padding;
  
  const scaleY = (lat: number) => 
    mapHeight - (((lat - minLat) / (maxLat - minLat)) * (mapHeight - 2 * padding) + padding);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Property Locations</h2>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">No tasks</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-gray-600">Few tasks</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">Many tasks</span>
          </div>
        </div>
      </div>

      {/* Simplified Map Visualization */}
      <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ height: '600px' }}>
        <svg width="100%" height="100%" className="absolute inset-0">
          {/* Grid lines for reference */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Property markers with address labels */}
          {properties.map((property) => {
            const outstandingTasks = getOutstandingTasksCount(property.id);
            const x = scaleX(property.coordinates.lng);
            const y = scaleY(property.coordinates.lat);
            const shortAddress = property.address.split(',')[0]; // Just street address
            
            return (
              <g key={property.id}>
                {/* Marker circle */}
                <circle
                  cx={x}
                  cy={y}
                  r="8"
                  className={`cursor-pointer ${getMarkerColor(outstandingTasks)} fill-current opacity-80 hover:opacity-100`}
                  onClick={() => onPropertyClick(property)}
                />
                
                {/* Address label */}
                <rect
                  x={x + 15}
                  y={y - 10}
                  width={shortAddress.length * 6 + 8}
                  height="20"
                  rx="3"
                  className="fill-white stroke-gray-300"
                  strokeWidth="1"
                />
                <text
                  x={x + 19}
                  y={y + 3}
                  className="text-xs fill-gray-700 font-medium"
                  style={{ fontSize: '11px' }}
                >
                  {shortAddress}
                </text>
                
                {/* Task count badge */}
                {outstandingTasks > 0 && (
                  <g>
                    <circle
                      cx={x + 12}
                      cy={y - 8}
                      r="8"
                      className="fill-red-500"
                    />
                    <text
                      x={x + 12}
                      y={y - 5}
                      textAnchor="middle"
                      className="text-xs fill-white font-medium"
                    >
                      {outstandingTasks}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        
        {/* Property list overlay */}
        <div className="absolute right-4 top-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Home className="h-4 w-4 mr-2" />
            Properties
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {properties.map((property) => {
              const outstandingTasks = getOutstandingTasksCount(property.id);
              return (
                <div
                  key={property.id}
                  onClick={() => onPropertyClick(property)}
                  className="p-2 rounded-md hover:bg-gray-50 cursor-pointer border border-gray-100"
                >
                  <div className="flex items-center space-x-2">
                    <div 
                      className={`w-2 h-2 rounded-full ${
                        outstandingTasks === 0 ? 'bg-green-500' :
                        outstandingTasks <= 2 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {property.address.split(',')[0]}
                      </p>
                      <p className="text-xs text-gray-500">{property.clientName}</p>
                      <p className="text-xs text-gray-500">{property.status}</p>
                    </div>
                    {outstandingTasks > 0 && (
                      <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">
                        {outstandingTasks}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};