import React from 'react';
import {
  Newspaper,
  TrendUp as TrendingUp,
  Cloud,
  List as Menu,
  MagnifyingGlass as Search,
  User
} from '@phosphor-icons/react';

export const StealthOverlay: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[10000] bg-[#f2f2f7] flex flex-col animate-in fade-in duration-300">
            {/* Fake OS Status Bar Spacing */}
            <div className="h-safe pt-2 bg-white" />
            
            {/* Fake Header */}
            <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-200">
                <Menu className="text-gray-400" size={24} />
                <h1 className="text-xl font-serif font-black text-black italic">GLOBAL NEWS</h1>
                <User className="text-gray-400" size={24} />
            </header>

            {/* Fake Search */}
            <div className="px-4 py-3 bg-[#f2f2f7]">
                <div className="bg-white rounded-md px-4 py-2 flex items-center gap-2 border border-gray-200 shadow-sm">
                    <Search className="text-gray-400" size={16} />
                    <span className="text-gray-400 text-sm">Search markets and world news...</span>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto bg-white">
                <div className="p-6 border-b border-gray-100">
                    <span className="text-rose-600 text-[10px] font-bold uppercase tracking-widest">Live Updates</span>
                    <h2 className="text-2xl font-serif font-bold text-black mt-2 leading-tight">Global Market Resilience: Tech Sector Leads Quiet Recovery</h2>
                    <p className="text-gray-500 text-sm mt-3 leading-relaxed">Economic observers suggest that the recent shift in silicon manufacturing logistics has provided a much-needed buffer for emerging startups in the Pacific rim...</p>
                    <div className="mt-4 flex gap-2">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-bold">ECONOMY</span>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-bold">TECH</span>
                    </div>
                </div>

                <div className="p-6 border-b border-gray-100 flex gap-4">
                    <div className="flex-1">
                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Environment</span>
                        <h3 className="text-lg font-serif font-bold text-black mt-1 leading-snug">New Reforestation Initiative Launches in Scandinavian Archipelago</h3>
                    </div>
                    <div className="w-20 h-20 bg-gray-200 rounded-sm animate-pulse" />
                </div>

                <div className="p-6 border-b border-gray-100">
                    <div className="glass-card bg-emerald-50 p-4 rounded-sm border border-emerald-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Cloud className="text-emerald-600" size={24} />
                            <div>
                                <p className="text-xs font-bold text-emerald-800">Local Weather</p>
                                <p className="text-sm text-emerald-600">Partly Cloudy • 24°C</p>
                            </div>
                        </div>
                        <TrendingUp className="text-emerald-400" size={20} />
                    </div>
                </div>

                <div className="p-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Trending Headlines</h3>
                    <ul className="space-y-4">
                        <li className="flex gap-3 items-start">
                            <span className="text-rose-500 font-serif font-bold italic text-lg">01</span>
                            <p className="text-sm font-bold text-black">Architectural marvel completed in downtown Singapore</p>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="text-rose-500 font-serif font-bold italic text-lg">02</span>
                            <p className="text-sm font-bold text-black">Electric aviation prototype clears final safety hurdles</p>
                        </li>
                    </ul>
                </div>
            </main>

            {/* Fake Navigation Bar */}
            <nav className="bg-white border-t border-gray-200 px-8 py-4 pb-safe flex items-center justify-between">
                <Newspaper className="text-rose-600" size={24} />
                <Search className="text-gray-400" size={24} />
                <TrendingUp className="text-gray-400" size={24} />
                <div className="w-6 h-6 rounded-full bg-gray-200" />
            </nav>
        </div>
    );
};
