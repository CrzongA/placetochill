"use client"
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

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
        map.setView(center, 15);
    }, [center, map]);
    return null;
}

interface MapPickerProps {
    mapCenter: [number, number];
    coordinates: { lat: number; lng: number } | null;
    onSelect: (latlng: L.LatLng) => void;
}

export default function MapPicker({ mapCenter, coordinates, onSelect }: MapPickerProps) {
    return (
        <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <MapClickHandler onSelect={onSelect} />
            <ChangeView center={mapCenter} />
            {coordinates && (
                <Marker position={[coordinates.lat, coordinates.lng]} />
            )}
        </MapContainer>
    );
}
