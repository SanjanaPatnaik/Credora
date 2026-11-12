import React, { useState } from 'react';
import { 
  Building2, MapPin, Mail, Phone, RotateCcw, 
  CheckCircle2, AlertTriangle, ShieldCheck, FileText, 
  Layers, Landmark, Sparkles, Clock, ArrowLeft, ChevronRight,
  ExternalLink, Building, Trash2
} from 'lucide-react';

import PipelineVisualizer from './PipelineVisualizer';
import DiscrepancyCenter from './DiscrepancyCenter';
import CrossDocumentMatrix from './CrossDocumentMatrix';
import DocumentInspector from './DocumentInspector';
import VerificationRegistryView from './VerificationRegistryView';
import AuditTrailView from './AuditTrailView';
import DecisionModal from './DecisionModal';
import { reVerifyVendor } from '../api';

export default function VendorDetailsView({ vendorData, onBack, onRefresh, onDelete }) {
  const [activeTab, setActiveTab] = useState('discrepancies');
  const [isReverifying, setIsReverifying] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);

  if (!vendorData || !vendorData.vendor) return null;

  const { vendor, documents, extracted_fields, grouped_extracted, verification_results, discrepancies, decision, followups, audit_trail } = vendorData;

  const openDiscCount = (discrepancies || []).filter(d => d.resolution_status === 'OPEN').length;

  const handleReverifyAll = async () => {
    setIsReverifying(true);
    try {
      await reVerifyVendor(vendor.vendor_id);
      onRefresh();
    } catch (err) {
      alert('Error during re-verification: ' + err.message);
    } finally {
      setIsReverifying(false);
    }
  };

  // Helper for visual company logo placard (like Inspiration images)
  const getCompanyPlacard = (name) => {
    const n = (name || '').toUpperCase();
    if (n.includes('VERTEX')) {
      return {
        brandName: 'VERTEX',
        tag: 'SOLUTIONS',
        bg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800',
        industry: 'IT & Cloud Solutions',
        accent: 'bg-blue-300',
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

  const placard = getCompanyPlacard(vendor.company_name);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Approved</span>;
      case 'MANUAL_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">⚠ Review Required</span>;
      case 'AWAITING_INFO':
      case 'REQUEST_ADDITIONAL_INFO':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">⏱ Awaiting Vendor Action</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">✕ Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const sideTabs = [
    {
      id: 'discrepancies',
      label: 'Discrepancy Resolution',
      icon: Sparkles,
      count: openDiscCount > 0 ? `${openDiscCount} Action` : null,
      countColor: 'bg-rose-500 text-white font-bold',
    },
    {
      id: 'cross_doc',
      label: 'Cross-Document Matrix',
      icon: Layers,
    },
    {
      id: 'documents',
      label: 'Document & OCR Inspector',
      icon: FileText,
      count: `${(documents || []).length} Docs`,
      countColor: 'bg-slate-100 text-slate-600',
    },
    {
      id: 'external',
      label: 'Official Registries',
      icon: Landmark,
    },
    {
      id: 'audit',
      label: 'Evidence Audit Trail',
      icon: ShieldCheck,
      count: (audit_trail || []).length,
      countColor: 'bg-slate-100 text-slate-600',
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Top Breadcrumb & Controls (Simple English) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to All Vendors
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReverifyAll}
            disabled={isReverifying}
            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isReverifying ? 'animate-spin' : ''}`} />
            {isReverifying ? 'Re-running Checks...' : 'Re-run All Checks'}
          </button>

          <button
            onClick={() => setDecisionModalOpen(true)}
            className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            Decision Center
          </button>

          <button
            onClick={() => {
              if (window.confirm(`Permanently delete vendor ${vendor.company_name} (${vendor.vendor_id})? This will remove all verification records.`)) {
                onDelete && onDelete(vendor.vendor_id);
              }
            }}
            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all shadow-2xs"
            title="Delete this vendor record"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Vendor Profile Placard (Inspiration Image 2 & 3 style) */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-start sm:items-center space-x-4">
            {/* Visual Company Logo Placard (Inspired by UiUx Placards) */}
            <div className={`w-32 h-16 rounded-2xl ${placard.bg} flex flex-col justify-between p-2.5 text-white shadow-md relative overflow-hidden shrink-0`}>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm tracking-wider uppercase font-mono">{placard.brandName}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${placard.accent}`}></span>
              </div>
              <span className="text-[9px] font-semibold tracking-widest text-white/80 uppercase font-sans truncate">{placard.tag}</span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {vendor.company_name}
                </h2>
                {getStatusBadge(vendor.status)}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                <span>CIN: <strong className="text-slate-800">{vendor.cin || '—'}</strong></span>
                <span>PAN: <strong className="text-slate-800">{vendor.pan || '—'}</strong></span>
                <span>GSTIN: <strong className="text-slate-800">{vendor.gstin || '—'}</strong></span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                <span className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                  {vendor.registered_address || 'Registered Address'}
                </span>
                <span className="flex items-center">
                  <Mail className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                  {vendor.contact_email} ({vendor.contact_person})
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 flex items-center space-x-5 text-xs self-start lg:self-auto shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium uppercase">Documents</span>
              <span className="text-slate-800 font-bold text-sm">{(documents || []).length}/4 Verified</span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium uppercase">Open Issues</span>
              <span className={`text-sm font-bold ${openDiscCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {openDiscCount} Mismatch{openDiscCount === 1 ? '' : 'es'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Borderless Pipeline Visualizer (Green/Yellow Text Only) */}
      <PipelineVisualizer
        vendor={vendor}
        verificationResults={verification_results}
        discrepancies={discrepancies}
        decision={decision}
        activeTab={activeTab}
        onTabSelect={(tab) => setActiveTab(tab)}
      />

      {/* =================================================================== */}
      {/* SIDE TABS LAYOUT (Matching Inspiration Image 3) */}
      {/* =================================================================== */}
      <div className="flex flex-col md:flex-row gap-5 items-start">
        
        {/* Left Side Navigation Menu */}
        <aside className="w-full md:w-64 bg-white rounded-2xl p-2.5 border border-slate-100 shadow-sm shrink-0">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Workspace Views
          </div>
          <nav className="space-y-1">
            {sideTabs.map((t) => {
              const Icon = t.icon;
              const isSelected = activeTab === t.id;

              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span>{t.label}</span>
                  </div>
                  {t.count && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : t.countColor
                    }`}>
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Content Panel */}
        <main className="flex-1 min-w-0 w-full">
          {activeTab === 'discrepancies' && (
            <DiscrepancyCenter
              vendor={vendor}
              discrepancies={discrepancies}
              followups={followups}
              onRefresh={onRefresh}
            />
          )}

          {activeTab === 'cross_doc' && (
            <CrossDocumentMatrix
              vendor={vendor}
              groupedExtracted={grouped_extracted}
              verificationResults={verification_results}
              discrepancies={discrepancies}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentInspector
              documents={documents}
              extractedFields={extracted_fields}
              groupedExtracted={grouped_extracted}
            />
          )}

          {activeTab === 'external' && (
            <VerificationRegistryView
              verificationResults={verification_results}
            />
          )}

          {activeTab === 'audit' && (
            <AuditTrailView
              auditTrail={audit_trail}
              vendorId={vendor.vendor_id}
            />
          )}
        </main>

      </div>

      {/* Decision Modal */}
      <DecisionModal
        vendor={vendor}
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        onRefresh={onRefresh}
      />

    </div>
  );
}
