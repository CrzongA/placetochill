'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Database } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/client';

type Location = Database['public']['Tables']['locations']['Row'];

// Fix for default marker icons in Next.js + Leaflet
const DefaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const parseCoordinates = (coords: any): [number, number] | null => {
  if (!coords) return null;
  // Supabase PostGIS might return as GeoJSON object or string
  if (typeof coords === 'object' && coords.type === 'Point') {
    return [coords.coordinates[1], coords.coordinates[0]];
  }
  // If it's a string like "POINT(lng lat)"
  if (typeof coords === 'string') {
    const match = coords.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match) {
      return [parseFloat(match[2]), parseFloat(match[1])];
    }
  }
  return null;
};

interface MapProps {
  locations: Location[];
  selectedLocation: Location | null;
}

function MapViewHandler({ selectedLocation }: { selectedLocation: Location | null }) {
  const map = useMap();

  useEffect(() => {
    const coords = parseCoordinates(selectedLocation?.coordinates);
    if (coords) {
      map.flyTo(coords, 15, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [selectedLocation, map]);

  return null;
}

export default function AppMap({ locations, selectedLocation }: MapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="w-full h-full flex justify-center items-center bg-slate-900 text-slate-300">Loading Map...</div>;

  const getPublicUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from('photos').getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[22.3193, 114.1694]} // Center on Hong Kong
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />
        <MapViewHandler selectedLocation={selectedLocation} />

        {locations.map(loc => {
          const position = parseCoordinates(loc.coordinates) || [22.3193, 114.1694];

          return (
            <Marker key={loc.id} position={position}>
              <Popup>
                <div className="flex flex-col gap-3 p-1 min-w-[200px] max-w-[280px]">
                  {loc.photo_url && (
                    <div className="w-full aspect-video rounded-lg overflow-hidden border border-white/10 bg-slate-800">
                      <img
                        src={getPublicUrl(loc.photo_url) || ''}
                        alt={loc.place_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight mb-1">{loc.place_name}</h3>
                    <p className="text-xs text-indigo-400 font-medium mb-2">{loc.google_maps_landmark}</p>
                    <p className="text-sm text-slate-300 mb-3 leading-relaxed line-clamp-3">{loc.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {loc.tags?.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-bold border border-indigo-500/30 uppercase tracking-tighter">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
