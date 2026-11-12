import React from 'react';
import { ShieldCheck, ExternalLink, LogOut } from 'lucide-react';

export default function Navbar({ activeView, setActiveView, onOpenPortal, currentUser, onSignOut }) {
  const user = currentUser || {
    name: 'Sanjana Patnaik',
    role: 'Lead Procurement Officer',
    initials: 'SP'
  };

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveView('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                Credora
              </span>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Vendor Compliance Platform
              </p>
            </div>
          </div>

          {/* Middle: Kept Blank as requested */}
          <div className="flex-1"></div>

          {/* Right: User Profile (Sanjana Patnaik) */}
          <div className="flex items-center space-x-3 text-xs">
            
            {/* Officer Profile: Sanjana Patnaik */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                {user.initials || 'SP'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-semibold text-slate-800 text-xs">{user.name || 'Sanjana Patnaik'}</div>
                <div className="text-[10px] text-slate-400">{user.role || 'Lead Procurement Officer'}</div>
              </div>
              
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  title="Sign Out"
                  className="p-1.5 ml-1 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
