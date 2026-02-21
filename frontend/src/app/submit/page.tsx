import SubmissionForm from '@/components/SubmissionForm';
import Link from 'next/link';

export default function SubmitPage() {
    return (
        <main className="w-full min-h-screen relative bg-slate-900 overflow-y-auto">
            {/* Top Navigation Bar with Glassmorphism */}
            <header className="sticky top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-20 flex items-center justify-between px-6">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                        W
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
                        WhereToChill
                    </h1>
                </Link>
                <div className="text-sm font-medium text-slate-300">
                    Submit Place
                </div>
            </header>

            {/* Main Content Area */}
            <div className="relative z-0 px-4 py-12 md:py-20 flex justify-center items-start min-h-[calc(100vh-4rem)]">
                <div className="w-full max-w-2xl">
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
                            Found a chill spot?
                        </h2>
                        <p className="text-slate-400 text-lg">
                            Share it with the community. Your submission will be reviewed by our team before appearing on the map.
                        </p>
                    </div>
                    <SubmissionForm />
                </div>
            </div>
        </main>
    );
}
