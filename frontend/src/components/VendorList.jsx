import React, { useState } from 'react';
import { Search, Filter, ShieldCheck, AlertCircle, Clock, ChevronRight, FileCheck, ShieldAlert, Sparkles, Building2, Trash2 } from 'lucide-react';

export default function VendorList({ vendors, selectedVendorId, onSelectVendor, onDeleteVendor, currentFilter, onFilterChange }) {
  const [searchTerm, setSearchTerm] = useState('');

  const getCompanyPlacard = (name) => {
    const n = (name || '').toUpperCase();
    if (n.includes('VERTEX')) {
      return {
        brandName: 'VERTEX',
        tag: 'SOLUTIONS',
        bg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800',
        industry: 'IT & Cloud Solutions',
        accent: 'bg-blue-400',
      };
    }
    if (n.includes('ACME')) {
      return {
        brandName: 'ACME',
        tag: 'TECH',
        bg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-800',
        industry: 'Enterprise Software',
        accent: 'bg-emerald-300',
      };
    }
    if (n.includes('NEXUS')) {
      return {
        brandName: 'NEXUS',
        tag: 'INNOVATION',
        bg: 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-800',
        industry: 'Digital Innovations',
        accent: 'bg-purple-300',
      };
    }
    const words = n.split(' ').filter(Boolean);
    const brandName = words[0] || 'CORP';
    const tag = words[1] || 'LTD';
    return {
      brandName,
      tag,
      bg: 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900',
      industry: 'Private Limited Company',
      accent: 'bg-slate-400',
    };
  };

  const filteredVendors = vendors.filter((v) => {
    if (currentFilter === 'APPROVED' && v.status !== 'APPROVED') return false;
    if (currentFilter === 'MANUAL_REVIEW' && v.status !== 'MANUAL_REVIEW') return false;
    if (currentFilter === 'AWAITING_INFO' && !['AWAITING_INFO', 'REQUEST_ADDITIONAL_INFO'].includes(v.status)) return false;
    if (currentFilter === 'DISCREPANCIES' && (v.open_disc_count || 0) === 0) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (v.company_name || '').toLowerCase().includes(q) ||
      (v.vendor_id || '').toLowerCase().includes(q) ||
      (v.pan || '').toLowerCase().includes(q) ||
      (v.gstin || '').toLowerCase().includes(q) ||
      (v.cin || '').toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Approved
          </span>
        );
      case 'MANUAL_REVIEW':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            Review Required
          </span>
        );
      case 'AWAITING_INFO':
      case 'REQUEST_ADDITIONAL_INFO':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5"></span>
            Awaiting Info
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Search & Filter Status Header (Smaller duplicate tabs removed as requested) */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500 font-medium flex items-center space-x-2">
          <span>
            Showing <strong className="text-slate-800">{filteredVendors.length}</strong> of {vendors.length} vendors
          </span>
          {currentFilter !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 pl-2 border-l border-slate-200">
              <span className="text-slate-400">Filtered by:</span>
              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                {currentFilter.replace('_', ' ')}
              </span>
              <button
                onClick={() => onFilterChange('ALL')}
                className="text-slate-400 hover:text-slate-700 ml-1 underline text-[11px]"
              >
                Reset
              </button>
            </span>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vendor, PAN, GSTIN, CIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Vendor Company</th>
              <th className="py-3 px-4">Identifiers</th>
              <th className="py-3 px-4">Documents</th>
              <th className="py-3 px-4">Compliance Issues</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredVendors.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-400">
                  <p className="font-semibold text-slate-600 mb-1">No vendors match filter</p>
                  <p className="text-[11px]">Adjust your filter or search query.</p>
                </td>
              </tr>
            ) : (
              filteredVendors.map((v) => {
                const isSelected = selectedVendorId === v.vendor_id;
                const placard = getCompanyPlacard(v.company_name);

                return (
                  <tr
                    key={v.vendor_id}
                    onClick={() => onSelectVendor(v.vendor_id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/50'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Visual Company Placard (Inspired by UiUx Placards) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3.5">
                        <div className={`w-28 h-12 rounded-xl ${placard.bg} flex flex-col justify-between p-2 text-white shadow-xs relative overflow-hidden shrink-0 group`}>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-[12px] tracking-wider uppercase font-mono">{placard.brandName}</span>
                            <span className={`w-2 h-2 rounded-full ${placard.accent}`}></span>
                          </div>
                          <span className="text-[8px] font-semibold tracking-widest text-white/80 uppercase font-sans truncate">{placard.tag}</span>
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">
                            {v.company_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {v.vendor_id} • <span className="font-sans text-slate-400">{placard.industry}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Identifiers */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 space-y-0.5">
                      <div><span className="text-slate-400 font-sans text-[10px]">PAN:</span> {v.pan || '—'}</div>
                      <div><span className="text-slate-400 font-sans text-[10px]">GSTIN:</span> {v.gstin || '—'}</div>
                    </td>

                    {/* Docs */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center text-[11px] text-slate-700 font-medium">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-600 mr-1" />
                        {v.doc_count || 4} Files
                      </span>
                    </td>

                    {/* Discrepancies */}
                    <td className="py-3.5 px-4">
                      {(v.open_disc_count || 0) > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          <ShieldAlert className="w-3 h-3 mr-1 text-amber-600" />
                          {v.open_disc_count} Issue{v.open_disc_count > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center">
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                          Clear
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(v.status)}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center space-x-1.5 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVendor(v.vendor_id);
                          }}
                          className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span>View</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Permanently delete vendor ${v.company_name} (${v.vendor_id})? This will remove all verification records.`)) {
                              onDeleteVendor && onDeleteVendor(v.vendor_id);
                            }
                          }}
                          title="Delete Vendor Record"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
