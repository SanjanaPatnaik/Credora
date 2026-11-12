import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsCards from './components/StatsCards';
import VendorList from './components/VendorList';
import VendorDetailsView from './components/VendorDetailsView';
import VendorIntakePortal from './components/VendorIntakePortal';
import SignInView from './components/SignInView';
import { fetchStats, fetchVendors, fetchVendorDetails, loadDemoScenario, deleteVendor } from './api';
import { Loader2, Plus, RefreshCw, ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react';

export default function App() {
  const isInitialPortalPath = typeof window !== 'undefined' && 
    (window.location.pathname.startsWith('/portal') || window.location.pathname.startsWith('/intake'));

  const [viewMode, setViewMode] = useState(isInitialPortalPath ? 'portal' : 'dashboard');
  
  // Auth state for Sanjana Patnaik
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('credora_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('ALL');
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [vendorDetails, setVendorDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Load initial data
  const loadDashboardData = async () => {
    try {
      const [sData, vData] = await Promise.all([fetchStats(), fetchVendors()]);
      setStats(sData);
      setVendors(vData);

      // If database is empty on first boot, seed initial vendors quietly
      if (vData.length === 0) {
        await loadDemoScenario('HAPPY_PATH');
        await loadDemoScenario('BENEFICIARY_MISMATCH');
        const [newS, newV] = await Promise.all([fetchStats(), fetchVendors()]);
        setStats(newS);
        setVendors(newV);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Listen to browser popstate for /portal navigation
    const handlePopState = () => {
      const isPortal = window.location.pathname.startsWith('/portal') || window.location.pathname.startsWith('/intake');
      setViewMode(isPortal ? 'portal' : 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openPortalWebsite = () => {
    setViewMode('portal');
    window.history.pushState({}, '', '/portal');
  };

  const handleSignIn = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('credora_auth_user', JSON.stringify(user));
    } catch {}
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('credora_auth_user');
    } catch {}
  };

  // Fetch full details when a vendor is selected
  const handleSelectVendor = async (vendorId) => {
    setSelectedVendorId(vendorId);
    setDetailsLoading(true);
    try {
      const details = await fetchVendorDetails(vendorId);
      setVendorDetails(details);
    } catch (err) {
      alert('Failed to load vendor details: ' + err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRefreshVendor = async () => {
    if (selectedVendorId) {
      await handleSelectVendor(selectedVendorId);
    }
    const [sData, vData] = await Promise.all([fetchStats(), fetchVendors()]);
    setStats(sData);
    setVendors(vData);
  };

  const handleDeleteVendor = async (vendorId) => {
    try {
      await deleteVendor(vendorId);
      if (selectedVendorId === vendorId) {
        setSelectedVendorId(null);
        setVendorDetails(null);
      }
      await loadDashboardData();
    } catch (err) {
      alert('Error deleting vendor: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 flex flex-col font-sans">
      
      {/* =================================================================== */}
      {/* STANDALONE VENDOR INTAKE PORTAL WEBSITE (STRICTLY VENDOR FACING) */}
      {/* =================================================================== */}
      {viewMode === 'portal' ? (
        <div className="min-h-screen flex flex-col">
          
          {/* Vendor Portal Website Header - No links to operations hub */}
          <header className="bg-white border-b border-slate-150 sticky top-0 z-50 shadow-2xs">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                
                {/* Brand */}
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-lg text-slate-900 tracking-tight">
                      Credora
                    </span>
                    <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Vendor Registration Portal
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-medium">
                  Official Onboarding System
                </div>

              </div>
            </div>
          </header>

          {/* Portal Body */}
          <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
              <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">
                Vendor Self-Service Intake
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Vendor Onboarding & Compliance Portal
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Please complete your corporate profile and submit your 4 mandatory registration documents 
                (Company PAN, GST Certificate, Cancelled Cheque, and Certificate of Incorporation) for verification.
              </p>
            </div>

            <VendorIntakePortal 
              onIntakeComplete={() => {
                loadDashboardData();
              }}
            />
          </main>

          {/* Vendor Portal Footer */}
          <footer className="bg-white border-t border-slate-100 py-4 mt-auto text-xs text-slate-400">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[11px]">
              Credora Encrypted Vendor Intake Gateway • Compliant with Indian Procurement Regulations
            </div>
          </footer>

        </div>
      ) : (

        /* =================================================================== */
        /* INTERNAL CREDORA PROCUREMENT OPERATIONS DASHBOARD (SIGN-IN PROTECTED) */
        /* =================================================================== */
        !currentUser ? (
          <SignInView onSignIn={handleSignIn} />
        ) : (
          <>
            <Navbar
              activeView="dashboard"
              setActiveView={() => {
                setSelectedVendorId(null);
                setVendorDetails(null);
              }}
              onOpenPortal={openPortalWebsite}
              currentUser={currentUser}
              onSignOut={handleSignOut}
              vendorCount={vendors.length}
            />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
              
              {loading ? (
                <div className="py-24 text-center">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-700">Connecting to Credora Verification Engine...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Detail View */}
                  {selectedVendorId && vendorDetails ? (
                    detailsLoading ? (
                      <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
                        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">Loading vendor verification workspace...</p>
                      </div>
                    ) : (
                      <VendorDetailsView
                        vendorData={vendorDetails}
                        onBack={() => {
                          setSelectedVendorId(null);
                          setVendorDetails(null);
                        }}
                        onRefresh={handleRefreshVendor}
                        onDelete={handleDeleteVendor}
                      />
                    )
                  ) : (
                    <>
                      {/* Header Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Vendor Compliance Operations
                          </h1>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Verification queue, external registry checks, and compliance discrepancy management.
                          </p>
                        </div>

                        <div className="flex items-center space-x-2.5">
                          <button
                            onClick={loadDashboardData}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-colors"
                            title="Refresh Queue"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          
                          {/* Distinct button to open external Vendor Portal */}
                          <button
                            onClick={openPortalWebsite}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all hover:scale-[1.01]"
                          >
                            <Plus className="w-4 h-4 mr-1.5" />
                            <span>Open Vendor Intake Portal</span>
                            <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-80" />
                          </button>
                        </div>
                      </div>

                      {/* Stats Metrics (Filters table when clicked) */}
                      <StatsCards
                        stats={stats}
                        currentFilter={currentFilter}
                        onFilterSelect={(f) => setCurrentFilter(f)}
                      />

                      {/* Vendor Roster Table (Zero smaller redundant tabs, zero risk score) */}
                      <VendorList
                        vendors={vendors}
                        selectedVendorId={selectedVendorId}
                        onSelectVendor={handleSelectVendor}
                        onDeleteVendor={handleDeleteVendor}
                        currentFilter={currentFilter}
                        onFilterChange={setCurrentFilter}
                      />
                    </>
                  )}
                </div>
              )}

            </main>

            {/* Clean Enterprise Footer */}
            <footer className="bg-white border-t border-slate-100 py-4 mt-auto text-xs text-slate-400">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">Credora</span>
                  <span>• Corporate Vendor Onboarding & Compliance Management</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Officer: <strong className="text-slate-700">{currentUser.name}</strong> • Encrypted & Audited Enterprise Verification Platform
                </div>
              </div>
            </footer>
          </>
        )
      )}

    </div>
  );
}
