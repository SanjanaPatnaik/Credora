import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Play, Loader2, Mail, RotateCcw } from 'lucide-react';
import { loadDemoScenario } from '../api';

export default function DemoShowcase({ onSelectScenarioVendor }) {
  const [loadingScenario, setLoadingScenario] = useState(null);

  const handleRunScenario = async (scenario) => {
    setLoadingScenario(scenario);
    try {
      const res = await loadDemoScenario(scenario);
      if (res.vendor_id) {
        onSelectScenarioVendor(res.vendor_id);
      }
    } catch (err) {
      alert('Error launching demo: ' + err.message);
    } finally {
      setLoadingScenario(null);
    }
  };

  const scenarios = [
    {
      id: 'HAPPY_PATH',
      title: 'Demo 1: Happy Path (100% Compliant Onboarding)',
      company: 'Acme Technologies Private Limited',
      cin: 'U72900KA2020PTC134567',
      pan: 'AABCA1234C',
      description: 'Clean vendor submission where all 4 documents (PAN, GST, Cheque, COI), Tax Authority checks, Instant Bank Verification, and Corporate Master Data align with zero discrepancies.',
      badge: 'Low Risk • Approved',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
      steps: [
        '1. Intake of Acme Technologies registration form & 4 digital PDFs',
        '2. Automated document text extraction with >96% confidence',
        '3. Official PAN & GST verification return ACTIVE & OPERATIVE',
        '4. Instant bank verification confirms ₹1 reversal to ACME TECHNOLOGIES PVT LTD',
        '5. Corporate Registry confirms Active status and Private Limited class',
        '6. Risk Engine outputs 0.0 Risk Score → Immediate APPROVED decision'
      ]
    },
    {
      id: 'BENEFICIARY_MISMATCH',
      title: 'Demo 2: Edge Case 1 — Bank Beneficiary Mismatch (Primary USP)',
      company: 'Vertex Solutions Private Limited',
      cin: 'U72200MH2019PTC321980',
      pan: 'AABCV5678C',
      description: 'Vendor inadvertently uploads a personal director savings account cheque (Rajesh Kumar). Penny-drop detects mismatch. The system drafts a follow-up email, procurement officer sends it, vendor resubmits corporate cheque, and system re-verifies to Approval!',
      badge: 'High Risk • Automated Follow-up USP',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      highlight: true,
      icon: AlertTriangle,
      steps: [
        '1. Ingestion of Vertex Solutions form & initial cheque (printed RAJESH KUMAR)',
        '2. Penny drop returns beneficiary "RAJESH KUMAR" instead of company legal entity',
        '3. Cross-Document check flags Bank Beneficiary Discrepancy (High Severity)',
        '4. Automated Follow-up: Synthesizes personalized explanation email to vendor',
        '5. Procurement Officer reviews, edits, and sends email (vendor status: Awaiting Info)',
        '6. Vendor submits corrected corporate cheque → Re-verification executes → APPROVED!'
      ]
    },
    {
      id: 'CLASSIFICATION_MISMATCH',
      title: 'Demo 3: Edge Case 2 — Document Classification Mismatch',
      company: 'Nexus Innovations Private Limited',
      cin: 'U74999DL2018PTC335412',
      pan: 'AABCN9988C',
      description: 'Vendor mistakenly uploads a State Electricity Utility Bill where a GST Registration Certificate was expected. The document classifier catches the mismatch rather than parsing garbage.',
      badge: 'Critical Risk • Mismatch Detected',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: XCircle,
      steps: [
        '1. Vendor uploads files for PAN, Cheque, COI, and an Electricity Bill for GST',
        '2. Document Classifier inspects linguistic and legal markers',
        '3. Flags MISMATCH: Expected GST Certificate, Detected Utility/Power Bill',
        '4. Prevents erroneous GST verification API call',
        '5. Critical risk assigned; Vendor onboarding flagged for document replacement'
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
          5-Minute Guided Demonstration Suite
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Test End-to-End Verification & Automated Resolution
        </h2>
        <p className="text-xs text-slate-500">
          Select any scenario below to trigger real document ingestion, automated text extraction, 
          official registry checks, bank verification, and the automated discrepancy resolution lifecycle.
        </p>
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isLoading = loadingScenario === sc.id;

          return (
            <div
              key={sc.id}
              className={`rounded-2xl border bg-white p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden ${
                sc.highlight
                  ? 'border-indigo-400 ring-2 ring-indigo-500/20'
                  : 'border-slate-200'
              }`}
            >
              {sc.highlight && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-extrabold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  USP Highlight
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sc.badgeColor}`}>
                    {sc.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                    {sc.title}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    {sc.company}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {sc.description}
                </p>

                {/* Workflow steps */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-[11px] text-slate-700">
                  <div className="font-bold text-[10px] uppercase tracking-wider text-slate-400 font-sans">
                    Demonstration Flow:
                  </div>
                  {sc.steps.map((st, i) => (
                    <div key={i} className="leading-tight text-[10.5px]">
                      {st}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 mt-2 border-t border-slate-100">
                <button
                  onClick={() => handleRunScenario(sc.id)}
                  disabled={isLoading}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs ${
                    sc.highlight
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  } disabled:opacity-50`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      <span>Executing Real Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Launch Scenario Now</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

