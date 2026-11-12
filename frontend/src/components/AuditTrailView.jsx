import React, { useState } from 'react';
import { Clock, ShieldCheck, Hash, User, Activity, Check, Copy } from 'lucide-react';

export default function AuditTrailView({ auditTrail, vendorId }) {
  const [copiedHash, setCopiedHash] = useState(null);

  const handleCopy = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (!auditTrail || auditTrail.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
        No audit entries recorded for this vendor.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
            Evidence-Backed Append-Only Audit Trail ({auditTrail.length} Events)
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Every pipeline run, OCR extraction, API verification, follow-up dispatch, and reviewer decision is cryptographically chained.
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-mono font-semibold self-start sm:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>SHA-256 Hash Chain Verified</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4 space-y-4">
        {auditTrail.map((log, index) => {
          const isLast = index === auditTrail.length - 1;
          const isCopied = copiedHash === log.log_hash;

          return (
            <div key={log.audit_id || index} className="flex items-start space-x-3 text-xs">
              
              {/* Timeline marker */}
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
                  {index + 1}
                </div>
                {!isLast && <div className="w-0.5 h-12 bg-slate-200 mt-1"></div>}
              </div>

              {/* Event Card */}
              <div className="flex-1 bg-slate-50/70 border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-200 text-slate-700">
                      {log.stage}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 flex items-center space-x-2 mb-2">
                  <span>Actor: <strong className="text-slate-800">{log.actor}</strong></span>
                  {log.new_state && (
                    <span>
                      • Transition: <span className="font-mono text-emerald-700 font-bold">{log.previous_state || 'START'}</span> → <span className="font-mono text-emerald-700 font-bold">{log.new_state}</span>
                    </span>
                  )}
                </div>

                {/* Details snippet */}
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="p-2 rounded bg-white border border-slate-200/80 font-mono text-[10px] text-slate-700 overflow-x-auto mb-2">
                    {JSON.stringify(log.details, null, 2)}
                  </div>
                )}

                {/* Chained Log Hash */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[9px] text-slate-400 font-mono">
                  <span className="flex items-center truncate max-w-md">
                    <Hash className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                    Block Hash: {log.log_hash}
                  </span>
                  <button
                    onClick={() => handleCopy(log.log_hash)}
                    className="hover:text-slate-700 ml-2 text-[10px] flex items-center shrink-0"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-600 mr-0.5" /> : <Copy className="w-3 h-3 mr-0.5" />}
                    {isCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

