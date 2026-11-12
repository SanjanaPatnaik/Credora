import React from 'react';
import { 
  Building2, Landmark, FileCheck, CheckCircle2, 
  AlertTriangle, XCircle, Code, ShieldCheck, Database
} from 'lucide-react';

export default function VerificationRegistryView({ verificationResults }) {
  if (!verificationResults || verificationResults.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
        No verification results available. Run the verification pipeline to execute checks.
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'MANUAL_REVIEW':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-400" />;
    }
  };

  const getProviderTitle = (type) => {
    switch (type) {
      case 'PAN_API':
        return '1. Income Tax Department (PAN)';
      case 'GST_API':
        return '2. GST Taxpayer Registry';
      case 'PENNY_DROP':
        return '3. Bank Account & Penny-Drop Verification';
      case 'MCA_REGISTRY':
        return '4. Ministry of Corporate Affairs (MCA)';
      default:
        return type;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {verificationResults.map((v, i) => {
        const details = v.response_details || {};

        return (
          <div 
            key={i}
            className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                {getStatusIcon(v.verification_status)}
                <h4 className="text-xs font-bold text-slate-900">
                  {getProviderTitle(v.verification_type)}
                </h4>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  v.verification_status === 'VERIFIED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : (v.verification_status === 'MANUAL_REVIEW' ? 'bg-amber-50 text-amber-800 border border-amber-300' : 'bg-rose-50 text-rose-700 border border-rose-200')
                }`}>
                  {v.verification_status}
                </span>
              </div>
            </div>

            {/* Verification Timestamp */}
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Registry Source: <strong className="text-slate-700">{v.source_provider || 'Official Authority API'}</strong></span>
              <span className="font-mono text-[10px] text-slate-400">
                {v.created_at ? new Date(v.created_at).toLocaleTimeString() : ''}
              </span>
            </div>

            {/* Structured Return Highlights */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 space-y-1.5 text-xs font-mono">
              {v.verification_type === 'PAN_API' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">NSDL Registered Name:</span>
                    <span className="font-bold text-slate-900">{details.registered_name || details.holder_name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">PAN Status:</span>
                    <span className="text-emerald-700 font-bold">{details.pan_status || 'OPERATIVE'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Entity Category:</span>
                    <span className="text-slate-800">{details.category || 'Company'}</span>
                  </div>
                </>
              )}

              {v.verification_type === 'GST_API' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">GST Legal Name:</span>
                    <span className="font-bold text-slate-900">{details.legal_name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Registration Status:</span>
                    <span className={`font-bold ${details.status === 'Active' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {details.status || 'Active'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Business Constitution:</span>
                    <span className="text-slate-800">{details.constitution_of_business || 'Private Limited'}</span>
                  </div>
                </>
              )}

              {v.verification_type === 'PENNY_DROP' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Bank Account Status:</span>
                    <span className="text-emerald-700 font-bold">{details.account_status || 'ACTIVE'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Beneficiary Returned:</span>
                    <span className="font-bold text-slate-900 break-all">{details.beneficiary_name_returned || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Reference UTR:</span>
                    <span className="text-slate-600">{details.utr_number || 'CMS772189021'}</span>
                  </div>
                </>
              )}

              {v.verification_type === 'MCA_REGISTRY' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">MCA Registered Name:</span>
                    <span className="font-bold text-slate-900">{details.company_name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Company Status:</span>
                    <span className={`font-bold ${details.company_status === 'Active' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {details.company_status || 'Active'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Incorporation Date:</span>
                    <span className="text-slate-800">{details.incorporation_date || '—'}</span>
                  </div>
                </>
              )}
            </div>

            {/* Raw JSON Accordion */}
            <details className="text-[10px] text-slate-500 font-mono">
              <summary className="cursor-pointer hover:text-slate-800 font-sans font-medium flex items-center">
                <Code className="w-3 h-3 mr-1" />
                Inspect Raw Verification Response JSON
              </summary>
              <pre className="mt-1.5 p-2 rounded bg-slate-900 text-slate-200 overflow-x-auto max-h-36">
                {JSON.stringify(details, null, 2)}
              </pre>
            </details>
          </div>
        );
      })}
    </div>
  );
}

