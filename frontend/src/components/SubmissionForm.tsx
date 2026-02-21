"use client"
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

// Helper to load Google Maps script
const loadGoogleMapsScript = (callback: () => void) => {
    if (window.google && window.google.maps) {
        callback();
        return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = callback;
    document.head.appendChild(script);
};

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

export default function SubmissionForm() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        landmark: '',
        description: '',
        tags: [] as string[],
    });
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([22.3193, 114.1694]); // Default to HK center
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [photo, setPhoto] = useState<File | null>(null);
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [googleLoaded, setGoogleLoaded] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        loadGoogleMapsScript(() => {
            setGoogleLoaded(true);
        });
    }, []);

    const handleSearch = async (query: string) => {
        if (!query || !googleLoaded) return;
        setIsSearching(true);
        setSearchError(null);
        console.log('Starting Google Places search for:', query);

        try {
            const autocompleteService = new google.maps.places.AutocompleteService();
            const request = {
                input: query,
                componentRestrictions: { country: 'hk' },
            };

            autocompleteService.getPlacePredictions(request, (predictions, status) => {
                setIsSearching(false);
                if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                    console.log('Google Predictions:', predictions);
                    setSearchResults(predictions);
                } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    setSearchError('No results found for this landmark in Hong Kong.');
                    setSearchResults([]);
                } else if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
                    setSearchError('Search limit exceeded. Please try again later or click the map manually.');
                    setSearchResults([]);
                } else if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
                    setSearchError('Search service is currently unavailable (Request Denied).');
                    setSearchResults([]);
                } else {
                    console.error('Autocomplete error status:', status);
                    setSearchError('Search failed. Please try clicking the map manually.');
                    setSearchResults([]);
                }
            });
        } catch (error: any) {
            console.error('Search error:', error);
            setSearchError('An unexpected search error occurred.');
            setIsSearching(false);
        }
    };

    const handleSelectResult = (prediction: google.maps.places.AutocompletePrediction) => {
        if (!googleLoaded) return;
        setSearchError(null);

        const dummyDiv = document.createElement('div');
        const service = new google.maps.places.PlacesService(dummyDiv);

        service.getDetails({
            placeId: prediction.place_id,
            fields: ['name', 'geometry', 'formatted_address']
        }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();

                setCoordinates({ lat, lng });
                setMapCenter([lat, lng]);
                setSearchResults([]);
                setFormData({
                    ...formData,
                    landmark: place.name || prediction.structured_formatting.main_text
                });
                console.log('Selected Place Details:', place);
            } else if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
                setSearchError('Rate limit exceeded fetching details. Please try manual pinning.');
            } else {
                console.error('Place details error status:', status);
                setSearchError(`Failed to fetch location details (Status: ${status}).`);
            }
        });
    };

    const availableTags = ["咖啡廳", "游樂場", "餐廳", "安靜", "有wifi"];

    const handleTagToggle = (tag: string) => {
        if (formData.tags.includes(tag)) {
            setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
        } else {
            setFormData({ ...formData, tags: [...formData.tags, tag] });
        }
    };

    const handleCustomTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim() !== '') {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (!formData.tags.includes(newTag)) {
                setFormData({ ...formData, tags: [...formData.tags, newTag] });
            }
            setTagInput('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let photoPath = null;

            // 1. Upload photo to Supabase Storage (if present)
            if (photo) {
                const fileExt = photo.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `submissions/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('photos')
                    .upload(filePath, photo);

                if (uploadError) {
                    throw new Error('Error uploading photo: ' + uploadError.message);
                }

                photoPath = filePath;
            }            // 2. Insert form data to Supabase locations table with approved: false
            const { error: insertError } = await supabase
                .from('locations')
                .insert({
                    place_name: formData.landmark,
                    google_maps_landmark: formData.landmark,
                    description: formData.description,
                    tags: formData.tags,
                    approved: false,
                    photo_url: photoPath,
                    // Use WKT format for PostGIS Point
                    coordinates: coordinates ? `POINT(${coordinates.lng} ${coordinates.lat})` : null,
                });
            if (insertError) {
                throw new Error('Error saving location details: ' + insertError.message);
            }

            alert('Place submitted successfully! Pending admin approval.');
            router.push('/');
        } catch (error: any) {
            console.error('Error submitting place:', error);
            alert(error.message || 'Failed to submit place. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="space-y-6">
                {/* Google Maps Landmark */}
                <div>
                    <label htmlFor="landmark" className="block text-sm font-medium text-slate-300 mb-2">
                        Google Maps Landmark / Location Name *
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            id="landmark"
                            required
                            placeholder="e.g. Victoria Park"
                            value={formData.landmark}
                            onChange={(e) => {
                                setFormData({ ...formData, landmark: e.target.value });
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSearch(formData.landmark);
                                }
                            }}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-12"
                        />
                        <button
                            type="button"
                            onClick={() => handleSearch(formData.landmark)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white transition-colors"
                            title="Search landmark"
                        >
                            {isSearching ? (
                                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl z-20 relative">
                            {searchResults.map((result, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleSelectResult(result)}
                                    className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700 last:border-0 transition-colors"
                                >
                                    <div className="font-bold">{result.structured_formatting.main_text}</div>
                                    <div className="text-[10px] text-slate-500">{result.structured_formatting.secondary_text}</div>
                                </button>
                            ))}
                        </div>
                    )}
                    {searchError && (
                        <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                            {searchError}
                        </div>
                    )}
                </div>

                {/* Map Picker */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Pin the Exact Spot on Map *
                    </label>
                    <div className="h-[300px] w-full bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden relative z-10">
                        {isMounted && (
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
                                <MapClickHandler onSelect={setCoordinates} />
                                <ChangeView center={mapCenter} />
                                {coordinates && (
                                    <Marker position={[coordinates.lat, coordinates.lng]} />
                                )}
                            </MapContainer>
                        )}
                        {!coordinates && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 pointer-events-none z-20">
                                <p className="text-sm text-slate-400 font-medium bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700">
                                    Search above or click on map to set position
                                </p>
                            </div>
                        )}
                    </div>
                    {coordinates && (
                        <p className="text-xs text-indigo-400 mt-2 font-medium">
                            Coordinates set: {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
                        </p>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                        Description *
                    </label>
                    <textarea
                        id="description"
                        required
                        rows={4}
                        placeholder="What makes this place chill?"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    />
                </div>

                {/* Tags */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Tags (Select or add your own)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {availableTags.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => handleTagToggle(tag)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${formData.tags.includes(tag)
                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/80'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {formData.tags.filter(t => !availableTags.includes(t)).map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => handleTagToggle(tag)}
                                className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-all"
                            >
                                {tag} ✕
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Type a custom tag and press Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleCustomTagAdd}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>

                {/* Custom Photo Upload */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Upload a Photo
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-700 border-dashed rounded-xl hover:border-indigo-500 transition-colors bg-slate-800/30">
                        <div className="space-y-1 text-center">
                            {photo ? (
                                <div className="text-sm font-medium text-indigo-400">
                                    {photo.name} ({Math.round(photo.size / 1024)} KB)
                                    <button
                                        type="button"
                                        onClick={() => setPhoto(null)}
                                        className="ml-2 text-slate-400 hover:text-white"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="flex text-sm text-slate-400 justify-center">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                            <span>Upload a file</span>
                                            <input
                                                id="file-upload"
                                                name="file-upload"
                                                type="file"
                                                className="sr-only"
                                                accept="image/*"
                                                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                                            />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        PNG, JPG, GIF up to 5MB
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                            }`}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Place for Approval'}
                    </button>
                </div>
            </div>
        </form>
    );
}
