import React, { useEffect, useRef, useState } from 'react';
import { Property } from '../types';
import { MapPin, Home, Zap } from 'lucide-react';

interface OSMMapViewProps {
  properties: Property[];
  onPropertyClick: (property: Property) => void;
  getOutstandingTasksCount: (propertyId: string) => number;
}

export const OSMMapView: React.FC<OSMMapViewProps> = ({ 
  properties, 
  onPropertyClick,
  getOutstandingTasksCount 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [geocodingStatus, setGeocodingStatus] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const getMarkerColor = (outstandingTasks: number) => {
    if (outstandingTasks === 0) return '#10b981'; // green-500
    if (outstandingTasks <= 2) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const triggerBatchGeocode = async () => {
    setIsGeocoding(true);
    setGeocodingStatus('Starting geocoding...');
    
    try {
      const response = await fetch('/api/geocode/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setGeocodingStatus('✅ Geocoding completed successfully!');
        // Refresh the page to load updated coordinates
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setGeocodingStatus('❌ Geocoding failed. Please try again.');
      }
    } catch (error) {
      setGeocodingStatus('❌ Network error during geocoding.');
      console.error('Geocoding error:', error);
    }
    
    setIsGeocoding(false);
  };

  useEffect(() => {
    if (!mapContainerRef.current || properties.length === 0) return;

    // Calculate center point from properties
    const validProperties = properties.filter(p => 
      p.coordinates?.lat && p.coordinates?.lng && 
      p.coordinates.lat !== 0 && p.coordinates.lng !== 0
    );

    if (validProperties.length === 0) {
      return;
    }

    const centerLat = validProperties.reduce((sum, p) => sum + p.coordinates.lat, 0) / validProperties.length;
    const centerLng = validProperties.reduce((sum, p) => sum + p.coordinates.lng, 0) / validProperties.length;

    // Create Leaflet map using CDN
    const mapHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            body { margin: 0; padding: 0; }
            #map { height: 500px; width: 100%; }
            .property-popup {
              font-family: system-ui, -apple-system, sans-serif;
              min-width: 200px;
            }
            .property-popup h3 {
              margin: 0 0 8px 0;
              font-size: 14px;
              font-weight: 600;
              color: #374151;
            }
            .property-popup p {
              margin: 4px 0;
              font-size: 12px;
              color: #6b7280;
            }
            .task-badge {
              display: inline-block;
              background: #fee2e2;
              color: #dc2626;
              padding: 2px 6px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 500;
            }
            .status-badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 500;
              margin-top: 4px;
            }
            .status-active { background: #dcfce7; color: #16a34a; }
            .status-hold { background: #fef3c7; color: #d97706; }
            .status-under-contract { background: #dbeafe; color: #2563eb; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            // Initialize map
            const map = L.map('map').setView([${centerLat}, ${centerLng}], 12);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Add property markers
            const properties = ${JSON.stringify(validProperties)};
            const taskCounts = ${JSON.stringify(Object.fromEntries(validProperties.map(p => [p.id, getOutstandingTasksCount(p.id)])))};

            properties.forEach(property => {
              const taskCount = taskCounts[property.id] || 0;
              const markerColor = taskCount === 0 ? '#10b981' : taskCount <= 2 ? '#f59e0b' : '#ef4444';
              
              // Create custom icon
              const customIcon = L.divIcon({
                className: 'custom-marker',
                html: \`
                  <div style="
                    width: 24px; 
                    height: 24px; 
                    background: \${markerColor}; 
                    border: 3px solid white; 
                    border-radius: 50%; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                  ">
                    \${taskCount > 0 ? taskCount : ''}
                  </div>
                \`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });

              const marker = L.marker([property.coordinates.lat, property.coordinates.lng], {
                icon: customIcon
              }).addTo(map);

              // Create popup content
              const statusClass = property.status.toLowerCase().replace(' ', '-');
              const popupContent = \`
                <div class="property-popup">
                  <h3>\${property.address}</h3>
                  <p><strong>Client:</strong> \${property.clientName}</p>
                  <p><strong>Agent:</strong> \${property.sellingAgent}</p>
                  \${property.currentListPrice ? \`<p><strong>Price:</strong> $\${property.currentListPrice.toLocaleString()}</p>\` : ''}
                  <div class="status-badge status-\${statusClass}">\${property.status}</div>
                  \${taskCount > 0 ? \`<div class="task-badge">\${taskCount} pending task\${taskCount !== 1 ? 's' : ''}</div>\` : ''}
                </div>
              \`;

              marker.bindPopup(popupContent);

              // Handle marker click to notify parent
              marker.on('click', () => {
                window.parent.postMessage({
                  type: 'PROPERTY_CLICK',
                  property: property
                }, '*');
              });
            });

            // Fit map to show all markers
            if (properties.length > 1) {
              const group = new L.featureGroup(map._layers);
              map.fitBounds(group.getBounds().pad(0.1));
            }
          </script>
        </body>
      </html>
    `;

    // Create iframe with the map
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '500px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.srcdoc = mapHtml;

    // Clear container and add iframe
    mapContainerRef.current.innerHTML = '';
    mapContainerRef.current.appendChild(iframe);

    // Listen for property click messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'PROPERTY_CLICK') {
        onPropertyClick(event.data.property);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [properties, onPropertyClick, getOutstandingTasksCount]);

  // Check if any properties need geocoding
  const needsGeocoding = properties.some(p => 
    !p.coordinates?.lat || !p.coordinates?.lng || 
    p.coordinates.lat === 0 || p.coordinates.lng === 0 ||
    (p.coordinates.lat >= 38.6 && p.coordinates.lat <= 38.7 && 
     p.coordinates.lng >= -90.3 && p.coordinates.lng <= -90.1)
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Property Locations
        </h2>
        <div className="flex items-center space-x-4">
          {needsGeocoding && (
            <button
              onClick={triggerBatchGeocode}
              disabled={isGeocoding}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="h-4 w-4" />
              <span>{isGeocoding ? 'Geocoding...' : 'Update Coordinates'}</span>
            </button>
          )}
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
      </div>

      {geocodingStatus && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          geocodingStatus.includes('✅') ? 'bg-green-50 text-green-800' : 
          geocodingStatus.includes('❌') ? 'bg-red-50 text-red-800' : 
          'bg-blue-50 text-blue-800'
        }`}>
          {geocodingStatus}
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full">
        {properties.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No properties to display</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Property list overlay */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Home className="h-4 w-4 mr-2" />
          Properties ({properties.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
          {properties.map((property) => {
            const outstandingTasks = getOutstandingTasksCount(property.id);
            return (
              <div
                key={property.id}
                onClick={() => onPropertyClick(property)}
                className="p-3 bg-white rounded-md hover:bg-blue-50 cursor-pointer border border-gray-200 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      outstandingTasks === 0 ? 'bg-green-500' :
                      outstandingTasks <= 2 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {property.address.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500">{property.clientName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        property.status === 'Active' ? 'bg-green-100 text-green-800' :
                        property.status === 'Hold' ? 'bg-yellow-100 text-yellow-800' :
                        property.status === 'Under Contract' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {property.status}
                      </span>
                      {outstandingTasks > 0 && (
                        <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">
                          {outstandingTasks}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};