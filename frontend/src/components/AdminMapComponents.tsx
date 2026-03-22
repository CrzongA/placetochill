'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
if (typeof window !== 'undefined') {
    const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
    });
    L.Marker.prototype.options.icon = DefaultIcon;
}

function MapClickHandler({ onSelect }: { onSelect: (latlng: L.LatLng) => void }) {
    useMapEvents({
        click(e) {
            onSelect(e.latlng);
        },
    });
    return null;
}

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        if (center[0] !== 0 && center[1] !== 0) {
            map.setView(center, 15);
        }
    }, [center, map]);
    return null;
}

interface AdminMapProps {
    coordinates: any;
    editingId: string | null;
    onMapClick: (latlng: L.LatLng) => void;
}

function parseCoordinates(coords: any): { lat: number, lng: number } | null {
    if (!coords) return null;
    if (typeof coords === 'object' && coords.type === 'Point') {
        return { lat: coords.coordinates[1], lng: coords.coordinates[0] };
    }
    const match = coords.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match) {
        return { lat: parseFloat(match[2]), lng: parseFloat(match[1]) };
    }
    return null;
}

export default function AdminMap({ coordinates, editingId, onMapClick }: AdminMapProps) {
    const parsedCoords = parseCoordinates(coordinates);
    const center: [number, number] = parsedCoords
        ? [parsedCoords.lat, parsedCoords.lng]
        : [22.3193, 114.1694];

    return (
        <MapContainer
            center={center}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; CARTO'
            />
            {editingId && (
                <MapClickHandler onSelect={onMapClick} />
            )}
            {parsedCoords && (
                <>
                    <Marker position={[parsedCoords.lat, parsedCoords.lng]} />
                    <ChangeView center={[parsedCoords.lat, parsedCoords.lng]} />
                </>
            )}
        </MapContainer>
    );
}
