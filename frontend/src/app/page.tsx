'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/database.types';

type Location = Database['public']['Tables']['locations']['Row'];

// Dynamically import the Map component with ssr: false
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex justify-center items-center bg-slate-900 text-slate-400">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-4 border-slate-700 border-t-indigo-500 animate-spin"></div>
        <p className="font-medium tracking-wide">Loading Map...</p>
      </div>
    </div>
  )
});

export default function Home() {
  const supabase = createClient();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    setLoading(true);
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching locations:', error);
    } else {
      setLocations(data || []);
    }
    setLoading(false);
  }

  const filteredLocations = activeFilter === 'All'
    ? locations
    : locations.filter(loc => loc.tags?.includes(activeFilter));

  const handleSelectLocation = (loc: Location) => {
    setSelectedLocation(loc);
  };

  return (
    <main className="w-full h-screen overflow-hidden flex flex-col relative bg-slate-900">
      {/* Top Navigation Bar */}
      <header className="absolute top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-md border-b border-white/10 z-20 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
            W
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
            WhereToChill
          </h1>
        </div>

        <nav className="flex items-center gap-4">
          <Link href="/submit" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Submit Place
          </Link>
          {/* <button className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Locations
          </button>
          <Link href="/admin" className="px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/5 rounded-full transition-all text-white backdrop-blur-sm shadow-sm inline-block">
            Admin Login
          </Link> */}
        </nav>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full pt-16 flex flex-col md:flex-row relative z-0">

        {/* Locations Panel */}
        <div className="w-full md:w-[400px] h-[40%] md:h-full bg-slate-900/95 backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/10 z-10 flex flex-col order-2 md:order-1 shrink-0 overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-white/5 bg-slate-900/50">
            <h2 className="text-xl font-bold text-white">Found Places</h2>
            <p className="text-sm text-slate-400 mt-1">
              {loading ? '...' : filteredLocations.length} chill spots {activeFilter !== 'All' ? `tagged "${activeFilter}"` : 'near you'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-20 md:pb-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-6 h-6 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-xs text-slate-500 font-medium">Loading spots...</p>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-slate-500 text-sm">No spots found. Be the first to submit one!</p>
              </div>
            ) : (
              filteredLocations.map(loc => (
                <div
                  key={loc.id}
                  onClick={() => handleSelectLocation(loc)}
                  className={`border rounded-2xl p-5 transition-all cursor-pointer group shadow-lg text-left ${selectedLocation?.id === loc.id
                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-indigo-500/10'
                    : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/50 hover:shadow-indigo-500/10'
                    }`}
                >
                  <h3 className={`font-bold text-lg transition-colors ${selectedLocation?.id === loc.id ? 'text-indigo-400' : 'text-white group-hover:text-indigo-400'
                    }`}>
                    {loc.place_name}
                  </h3>
                  <p className="text-sm text-slate-300 mt-2 line-clamp-2 leading-relaxed">{loc.description}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {loc.tags?.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-slate-950/50 text-slate-300 rounded-lg text-xs font-medium border border-slate-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 h-[60%] md:h-full relative z-0 order-1 md:order-2">
          {!loading && <Map locations={filteredLocations} selectedLocation={selectedLocation} />}

          {/* Floating Filter Bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-6 z-10 w-[90%] md:w-auto flex justify-center pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl flex items-center gap-2 overflow-x-auto pointer-events-auto max-w-full">
              {["All", "咖啡廳", "游樂場", "餐廳", "安靜", "有wifi"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeFilter === filter
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}

