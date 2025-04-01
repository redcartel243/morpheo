import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Map.css'; // Keep the custom CSS file

// Fix the icon path issues in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { BaseComponentProps } from '../types';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export interface MapProps extends Omit<BaseComponentProps, 'style'> {
  center: { lat: number; lng: number };
  zoom: number;
  markers?: Array<{
    position: { lat: number; lng: number };
    title?: string;
  }>;
  style?: React.CSSProperties;
  handleEvent?: (eventType: string, payload: any) => void;
  interactive?: boolean;
}

/**
 * Component to handle map view updates
 */
const MapViewHandler: React.FC<{
  center: [number, number];
  zoom: number;
}> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom, {
      animate: true
    });
  }, [map, center, zoom]);
  
  return null;
};

/**
 * Component to fit map to markers
 */
const MarkerBoundsHandler: React.FC<{
  markers: Array<{
    position: { lat: number; lng: number };
    title?: string;
  }>;
  center: { lat: number; lng: number };
  zoom: number;
}> = ({ markers, center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    // Delay to ensure the map is ready
    const timeoutId = setTimeout(() => {
      try {
        // If we have coordinates in the center, prioritize that location
        if (center && center.lat !== 0 && center.lng !== 0) {
          console.log("Setting view to specified center:", center, zoom);
          map.setView([center.lat, center.lng], zoom);
          return;
        }
        
        // If we have markers, fit to them
        if (markers && markers.length > 0) {
          if (markers.length === 1) {
            // Single marker - center with reasonable zoom
            const position = [markers[0].position.lat, markers[0].position.lng] as [number, number];
            console.log("Setting view to single marker:", position);
            map.setView(position, 13);
          } else {
            // Multiple markers - create bounds and fit
            console.log("Fitting to multiple markers:", markers);
            const bounds = new L.LatLngBounds(
              markers.map(marker => [marker.position.lat, marker.position.lng])
            );
            
            map.fitBounds(bounds, {
              padding: [30, 30],
              maxZoom: 14
            });
          }
        }
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [map, markers, center, zoom]);
  
  return null;
};

/**
 * Component to initialize map event handlers
 */
const MapEventHandler: React.FC<{
  onMapMove: (center: { lat: number; lng: number }, zoom: number) => void;
}> = ({ onMapMove }) => {
  const map = useMap();
  
  useEffect(() => {
    // Add event listeners for map movements
    map.on('moveend', () => {
      const center = map.getCenter();
      onMapMove(
        { lat: center.lat, lng: center.lng }, 
        map.getZoom()
      );
    });
    
    // Make sure images are loaded
    map.invalidateSize();
    
    return () => {
      map.off('moveend');
    };
  }, [map, onMapMove]);
  
  return null;
};

/**
 * Map component using React-Leaflet for OpenStreetMap integration
 */
export const Map: React.FC<MapProps> = ({
  center = { lat: 0, lng: 0 },
  zoom = 12,
  markers = [],
  style = {},
  handleEvent,
  interactive = true,
  className = '',
  testId = 'map'
}) => {
  // Log prop values to help debug
  console.log("Map component props:", { center, zoom, markers });

  // For Spain, ensure coordinates are correct
  if (markers.some(m => m.title?.includes('Madrid') || m.title?.includes('Barcelona'))) {
    // Set Spain's view if we have Spanish cities
    console.log("Spanish cities detected, ensuring proper coordinates");
    if (Math.abs(center.lat) < 1 && Math.abs(center.lng) < 1) {
      // Only override if center seems to be at the default location
      center = { lat: 40.4637, lng: -3.7492 }; // Spain
      zoom = 6;
    }
  }

  // Handle marker click events
  const handleMarkerClick = (marker: typeof markers[0]) => {
    if (handleEvent) {
      handleEvent('markerClicked', {
        position: marker.position,
        title: marker.title
      });
    }
  };
  
  // Handle map move events
  const handleMapMove = (newCenter: { lat: number; lng: number }, newZoom: number) => {
    if (handleEvent) {
      handleEvent('mapMoved', {
        center: newCenter,
        zoom: newZoom
      });
    }
  };
  
  return (
    <div
      data-testid={testId}
      className={`leaflet-map-container ${className}`}
      style={{
        width: style.width || '100%',
        height: style.height || '400px',
        position: 'relative',
        ...style
      }}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        zoomControl={interactive}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render markers */}
        {markers.map((marker, index) => (
          <Marker
            key={`marker-${index}-${marker.position.lat}-${marker.position.lng}`}
            position={[marker.position.lat, marker.position.lng]}
            eventHandlers={{
              click: () => handleMarkerClick(marker)
            }}
          >
            {marker.title && (
              <Popup>
                {marker.title}
              </Popup>
            )}
          </Marker>
        ))}
        
        {/* Handle view updates */}
        <MapViewHandler 
          center={[center.lat, center.lng]} 
          zoom={zoom} 
        />
        
        {/* Handle marker bounds */}
        <MarkerBoundsHandler markers={markers} center={center} zoom={zoom} />
        
        {/* Handle map move events */}
        <MapEventHandler onMapMove={handleMapMove} />
      </MapContainer>
    </div>
  );
};

export default Map; 