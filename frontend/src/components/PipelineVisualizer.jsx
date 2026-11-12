import React from 'react';
import { CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';

export default function PipelineVisualizer({ vendor, verificationResults, discrepancies, decision, activeTab, onTabSelect }) {
  if (!vendor) return null;

  // Real pipeline stage statuses
  const panStatus = (verificationResults || []).find(r => r.verification_type === 'PAN_API')?.verification_status || 'VERIFIED';
  const gstStatus = (verificationResults || []).find(r => r.verification_type === 'GST_API')?.verification_status || 'VERIFIED';
  const bankStatus = (verificationResults || []).find(r => r.verification_type === 'PENNY_DROP')?.verification_status || 'VERIFIED';
  const mcaStatus = (verificationResults || []).find(r => r.verification_type === 'MCA_REGISTRY')?.verification_status || 'VERIFIED';

  const hasCriticalDisc = (discrepancies || []).some(d => d.severity === 'CRITICAL' && d.resolution_status === 'OPEN');
  const hasHighDisc = (discrepancies || []).some(d => d.severity === 'HIGH' && d.resolution_status === 'OPEN');
  const openDiscCount = (discrepancies || []).filter(d => d.resolution_status === 'OPEN').length;

  const crossDocStatus = hasCriticalDisc ? 'FAILED' : (hasHighDisc ? 'MANUAL_REVIEW' : (openDiscCount > 0 ? 'WARNING' : 'VERIFIED'));
  const decisionStatus = vendor.status === 'APPROVED' ? 'VERIFIED' : (vendor.status === 'REJECTED' ? 'FAILED' : 'MANUAL_REVIEW');

  const stages = [
    { id: 'intake', tab: 'documents', name: '1. Intake', status: 'VERIFIED' },
    { id: 'ocr', tab: 'documents', name: '2. Text Extraction', status: 'VERIFIED' },
    { id: 'pan', tab: 'external', name: '3. PAN Check', status: panStatus },
    { id: 'gst', tab: 'external', name: '4. GST Check', status: gstStatus },
    { id: 'bank', tab: 'external', name: '5. Bank Check', status: bankStatus },
    { id: 'mca', tab: 'external', name: '6. Company Registry', status: mcaStatus },
    { id: 'cross', tab: 'cross_doc', name: '7. Cross-Check', status: crossDocStatus },
    { id: 'decision', tab: 'discrepancies', name: '8. Final Decision', status: decisionStatus },
  ];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Verification Pipeline
        </span>
        <span className="text-[11px] text-slate-400">
          Click any step to inspect
        </span>
      </div>

      {/* Pure Text Flow with Arrows: No boxes, no borders, text colored green or yellow/orange */}
      <div className="flex items-center overflow-x-auto py-1 space-x-2.5">
        {stages.map((st, index) => {
          const isApproved = st.status === 'VERIFIED';
          const isIssue = st.status === 'MANUAL_REVIEW' || st.status === 'WARNING' || st.status === 'FAILED';
          const isLast = index === stages.length - 1;

          return (
            <React.Fragment key={st.id}>
              {/* Pure Text Button: Absolutely no box, no border, no background */}
              <button
                type="button"
                onClick={() => onTabSelect && onTabSelect(st.tab)}
                className={`inline-flex items-center space-x-1 text-xs transition-opacity hover:opacity-75 cursor-pointer whitespace-nowrap bg-transparent border-0 p-0 ${
                  isApproved
                    ? 'text-emerald-600 font-semibold'
                    : isIssue
                    ? 'text-amber-500 font-semibold'
                    : 'text-slate-400 font-normal'
                }`}
              >
                {isApproved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span>{st.name}</span>
              </button>

              {/* Arrow Separator */}
              {!isLast && (
                <span className="text-slate-300 select-none text-xs shrink-0 font-normal">
                  ›
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
