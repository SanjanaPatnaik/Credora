import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { overrideDecision } from '../api';

export default function DecisionModal({ vendor, isOpen, onClose, onRefresh }) {
  const [decision, setDecision] = useState('APPROVED');
  const [reviewerName, setReviewerName] = useState('Sarah Jenkins (Senior Procurement Officer)');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !vendor) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await overrideDecision(vendor.vendor_id, {
        decision,
        reviewer_name: reviewerName,
        reviewer_comments: comments || `Decision explicitly confirmed by ${reviewerName}`
      });

      if (decision === 'APPROVED') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      }

      onClose();
      onRefresh();
    } catch (err) {
      alert('Error updating decision: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Procurement Officer Decision Center
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <div>
            <div className="text-[11px] text-slate-500 mb-1">Target Vendor:</div>
            <div className="font-bold text-slate-900 text-sm">{vendor.company_name}</div>
            <div className="text-[11px] font-mono text-slate-500">ID: {vendor.vendor_id}</div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
              Select Final Onboarding Decision
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'APPROVED', label: 'Approve Vendor', icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
                { id: 'REQUEST_ADDITIONAL_INFO', label: 'Request Additional Info', icon: Clock, color: 'text-indigo-700 bg-indigo-50 border-indigo-300' },
                { id: 'MANUAL_REVIEW', label: 'Send for Manual Review', icon: AlertTriangle, color: 'text-amber-700 bg-amber-50 border-amber-300' },
                { id: 'REJECTED', label: 'Reject Vendor', icon: XCircle, color: 'text-rose-700 bg-rose-50 border-rose-300' },
              ].map(opt => {
                const Icon = opt.icon;
                const isSelected = decision === opt.id;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setDecision(opt.id)}
                    className={`p-2.5 rounded-lg border text-left flex items-center space-x-2 transition-all ${
                      isSelected
                        ? `ring-2 ring-emerald-500 shadow-xs font-bold ${opt.color}`
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[11px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Reviewer Name & Title
            </label>
            <input
              type="text"
              required
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Procurement Audit Comments & Rationale
            </label>
            <textarea
              rows={3}
              placeholder="e.g. All KYC documents verified against Tax, Banking, and Corporate registries..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
            >
              {isSubmitting ? 'Recording Decision...' : 'Commit Decision'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

