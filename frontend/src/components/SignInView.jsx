import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SignInView({ onSignIn }) {
  const [email, setEmail] = useState('sanjana.patnaik@credora.com');
  const [password, setPassword] = useState('••••••••••••');
  const [name, setName] = useState('Sanjana Patnaik');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onSignIn({
        name: name.trim() || 'Sanjana Patnaik',
        email: email.trim() || 'sanjana.patnaik@credora.com',
        role: 'Lead Procurement Officer',
        initials: 'SP'
      });
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Credora Operations Hub
          </h1>
          <p className="text-xs text-slate-500">
            Internal procurement & automated vendor compliance platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-150 p-7 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Sign In to Dashboard</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Authorized procurement officer access
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Officer Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Officer Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Procurement Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Role Badge */}
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-600">Assigned Role:</span>
              <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md shadow-2xs border border-indigo-100">
                Lead Procurement Officer
              </span>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>Sign In as {name || 'Sanjana Patnaik'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[11px] text-slate-400">
          Credora Enterprise Compliance • Secure Session
        </div>

      </div>
    </div>
  );
}

