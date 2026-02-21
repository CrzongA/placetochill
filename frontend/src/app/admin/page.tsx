'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Database } from '@/lib/database.types';
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
        if (center[0] !== 0 && center[1] !== 0) {
            map.setView(center, 15);
        }
    }, [center, map]);
    return null;
}

type Location = Database['public']['Tables']['locations']['Row'];

export default function AdminDashboard() {
    const supabase = createClient();
    const router = useRouter();
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<Location>>({});
    const [view, setView] = useState<'pending' | 'approved'>('pending');
    const [filterTag, setFilterTag] = useState<string | null>(null);

    useEffect(() => {
        fetchLocations();
    }, [view]);

    async function fetchLocations() {
        setLoading(true);
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('approved', view === 'approved')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching locations:', error);
        } else {
            setLocations(data || []);
        }
        setLoading(false);
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const handleApprove = async (id: string) => {
        const { error } = await supabase
            .from('locations')
            .update({ approved: true })
            .eq('id', id);

        if (error) {
            alert('Error approving location: ' + error.message);
        } else {
            setLocations(locations.filter(loc => loc.id !== id));
        }
    };

    const handleUnapprove = async (id: string) => {
        const { error } = await supabase
            .from('locations')
            .update({ approved: false })
            .eq('id', id);

        if (error) {
            alert('Error unapproving location: ' + error.message);
        } else {
            setLocations(locations.filter(loc => loc.id !== id));
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('Are you sure you want to delete this location?')) return;

        const { error } = await supabase
            .from('locations')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Error deleting location: ' + error.message);
        } else {
            setLocations(locations.filter(loc => loc.id !== id));
        }
    };

    const handleStartEdit = (loc: Location) => {
        setEditingId(loc.id);
        setEditFormData({ ...loc });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditFormData({});
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;

        const { error } = await supabase
            .from('locations')
            .update(editFormData)
            .eq('id', editingId);

        if (error) {
            alert('Error saving changes: ' + error.message);
        } else {
            setLocations(locations.map(loc => loc.id === editingId ? { ...loc, ...editFormData } as Location : loc));
            setEditingId(null);
            setEditFormData({});
        }
    };

    const parseCoordinates = (coords: any): { lat: number, lng: number } | null => {
        if (!coords) return null;
        if (typeof coords === 'object' && coords.type === 'Point') {
            return { lat: coords.coordinates[1], lng: coords.coordinates[0] };
        }
        const match = coords.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
        if (match) {
            return { lat: parseFloat(match[2]), lng: parseFloat(match[1]) };
        }
        return null;
    };

    const getPublicUrl = (path: string | null) => {
        if (!path) return null;
        const { data } = supabase.storage.from('photos').getPublicUrl(path);
        return data.publicUrl;
    };

    // Get unique tags for filtering in approved view
    const allTags = Array.from(new Set(locations.flatMap(loc => loc.tags || []))).sort();

    const filteredLocations = filterTag
        ? locations.filter(loc => loc.tags?.includes(filterTag))
        : locations;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-screen">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Moderation
                    </h2>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <button
                        onClick={() => { setView('pending'); setFilterTag(null); }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${view === 'pending'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Pending</span>
                        </div>
                        {view === 'pending' && <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full font-bold">{loading ? '...' : locations.length}</span>}
                    </button>

                    <button
                        onClick={() => { setView('approved'); setFilterTag(null); }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${view === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Approved</span>
                        </div>
                    </button>
                </nav>

                <div className="p-6 border-t border-slate-800 space-y-4">
                    <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-2 bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 hover:border-rose-500/20 transition flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 ml-64 p-8">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {view === 'pending' ? 'Pending Submissions' : 'Approved Locations'}
                        </h1>
                        <p className="text-slate-400">
                            {view === 'pending'
                                ? 'Review and approve crowdsourced chill spots before they go live.'
                                : 'Manage and curate the collection of published chill spots.'}
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center gap-2 font-semibold"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-7-7 7-7M2 13h22" />
                        </svg>
                        Main Map
                    </Link>
                </header>

                {view === 'approved' && allTags.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filter by Tag</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setFilterTag(null)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterTag === null
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                All Places
                            </button>
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tag === filterTag
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800'
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <main className="space-y-6">
                    {loading ? (
                        <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
                            <p className="text-slate-500 animate-pulse">Fetching locations from database...</p>
                        </div>
                    ) : filteredLocations.length === 0 ? (
                        <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
                            <p className="text-slate-500">
                                {filterTag ? `No locations found with tag "${filterTag}"` : `No ${view} locations found.`}
                            </p>
                            {filterTag && (
                                <button onClick={() => setFilterTag(null)} className="mt-4 text-indigo-400 text-sm hover:underline">Clear filter</button>
                            )}
                        </div>
                    ) : (
                        filteredLocations.map(loc => (
                            <div key={loc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6 group hover:border-slate-700 transition-colors">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        {editingId === loc.id ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Place Name</label>
                                                    <input
                                                        type="text"
                                                        value={editFormData.place_name || ''}
                                                        onChange={(e) => setEditFormData({ ...editFormData, place_name: e.target.value })}
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Landmark</label>
                                                    <input
                                                        type="text"
                                                        value={editFormData.google_maps_landmark || ''}
                                                        onChange={(e) => setEditFormData({ ...editFormData, google_maps_landmark: e.target.value })}
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-indigo-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xl text-white font-bold mb-1">{loc.place_name}</h3>
                                                    {view === 'approved' && (
                                                        <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-500/20">Published</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-indigo-400 font-medium">{loc.google_maps_landmark}</p>
                                            </>
                                        )}
                                        <span className="text-xs text-slate-500 mt-2 block italic">
                                            {view === 'pending' ? 'Submitted: ' : 'Approved on: '}
                                            {new Date(loc.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        {editingId === loc.id ? (
                                            <>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 transition text-sm font-medium"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition text-sm font-medium"
                                                >
                                                    Save Changes
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleStartEdit(loc)}
                                                    className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 transition text-sm font-medium"
                                                >
                                                    Edit
                                                </button>
                                                {view === 'pending' ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleReject(loc.id)}
                                                            className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition text-sm font-medium"
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(loc.id)}
                                                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition text-sm font-medium"
                                                        >
                                                            Approve
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUnapprove(loc.id)}
                                                            className="px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition text-sm font-medium"
                                                        >
                                                            Unpublish
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(loc.id)}
                                                            className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition text-sm font-medium"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="bg-slate-800/20 rounded-xl p-4 border border-slate-800/50">
                                            <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Description</h4>
                                            {editingId === loc.id ? (
                                                <textarea
                                                    value={editFormData.description || ''}
                                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                                    rows={4}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                                                />
                                            ) : (
                                                <p className="text-sm text-slate-300 leading-relaxed font-light">{loc.description}</p>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Tags</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {editingId === loc.id ? (
                                                    <input
                                                        type="text"
                                                        value={editFormData.tags?.join(', ') || ''}
                                                        onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '') })}
                                                        placeholder="Comma separated tags..."
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                                    />
                                                ) : (
                                                    <>
                                                        {loc.tags?.map(tag => (
                                                            <span key={tag} className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-xs font-medium border border-slate-800 group-hover:border-slate-700 group-hover:text-slate-300 transition-colors">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {(!loc.tags || loc.tags.length === 0) && (
                                                            <span className="text-xs text-slate-600 italic">No tags associated</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {loc.photo_url && (
                                        <div className="relative group">
                                            <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Submitted Photo</h4>
                                            <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-800/30 flex items-center justify-center">
                                                <img
                                                    src={getPublicUrl(loc.photo_url) || ''}
                                                    alt={loc.place_name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="md:col-span-2">
                                        <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Location Verification</h4>
                                        <div className="h-[250px] w-full bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden relative z-10 transition-shadow hover:shadow-2xl">
                                            <MapContainer
                                                center={parseCoordinates(editingId === loc.id ? editFormData.coordinates : loc.coordinates) ? [parseCoordinates(editingId === loc.id ? editFormData.coordinates : loc.coordinates)!.lat, parseCoordinates(editingId === loc.id ? editFormData.coordinates : loc.coordinates)!.lng] : [22.3193, 114.1694]}
                                                zoom={15}
                                                style={{ height: '100%', width: '100%' }}
                                                zoomControl={false}
                                            >
                                                <TileLayer
                                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                                    attribution='&copy; CARTO'
                                                />
                                                {editingId === loc.id && (
                                                    <MapClickHandler onSelect={(latlng) => setEditFormData({
                                                        ...editFormData,
                                                        coordinates: `POINT(${latlng.lng} ${latlng.lat})`
                                                    })} />
                                                )}
                                                {parseCoordinates(editingId === loc.id ? editFormData.coordinates : loc.coordinates) && (
                                                    <>
                                                        <Marker position={[parseCoordinates(editingId === loc.id ? editFormData.coordinates : loc.coordinates)!.lat, parseCoordinates(editingId === loc.id ? editFormData.coordinates : loc.coordinates)!.lng]} />
                                                        <ChangeView center={[parseCoordinates(editingId === loc.id ? editFormData.coordinates : loc.coordinates)!.lat, parseCoordinates(editingId === loc.id ? editFormData.coordinates : loc.coordinates)!.lng]} />
                                                    </>
                                                )}
                                            </MapContainer>
                                            {editingId === loc.id && (
                                                <div className="absolute top-2 right-2 z-20 bg-indigo-500 text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-tighter shadow-lg">
                                                    Click map to relocate
                                                </div>
                                            )}
                                        </div>
                                        {parseCoordinates(editingId === loc.id ? editFormData.coordinates : loc.coordinates) && (
                                            <p className="text-[10px] text-slate-600 mt-2 font-mono">
                                                COORDS: {parseCoordinates(editingId === loc.id ? editFormData.coordinates : loc.coordinates)!.lat.toFixed(6)},
                                                {parseCoordinates(editingId === loc.id ? editFormData.coordinates : loc.coordinates)!.lng.toFixed(6)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </main>
            </div>
        </div>
    );
}

