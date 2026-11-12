import React from 'react';
import { Users, CheckCircle2, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

export default function StatsCards({ stats, onFilterSelect, currentFilter }) {
  if (!stats) return null;

  const total = stats.total_vendors || 0;
  const statusCounts = stats.status_counts || {};
  const approved = statusCounts['APPROVED'] || 0;
  const manualReview = statusCounts['MANUAL_REVIEW'] || 0;
  const awaitingInfo = (statusCounts['AWAITING_INFO'] || 0) + (statusCounts['REQUEST_ADDITIONAL_INFO'] || 0);
  const openDiscrepancies = stats.open_discrepancies || 0;

  const cards = [
    {
      id: 'ALL',
      title: 'Total Submissions',
      count: total,
      subtext: 'Active pipeline',
      icon: Users,
      badgeBg: 'bg-indigo-50 text-indigo-700',
    },
    {
      id: 'APPROVED',
      title: 'Approved Vendors',
      count: approved,
      subtext: 'Fully compliant',
      icon: CheckCircle2,
      badgeBg: 'bg-emerald-50 text-emerald-700',
    },
    {
      id: 'MANUAL_REVIEW',
      title: 'Review Required',
      count: manualReview,
      subtext: 'Action needed',
      icon: AlertTriangle,
      badgeBg: 'bg-amber-50 text-amber-700',
    },
    {
      id: 'AWAITING_INFO',
      title: 'Awaiting Action',
      count: awaitingInfo,
      subtext: 'Follow-up sent',
      icon: Clock,
      badgeBg: 'bg-blue-50 text-blue-700',
    },
    {
      id: 'DISCREPANCIES',
      title: 'Open Issues',
      count: openDiscrepancies,
      subtext: 'Mismatches',
      icon: ShieldAlert,
      badgeBg: 'bg-rose-50 text-rose-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = currentFilter === c.id;
        return (
          <div
            key={c.id}
            onClick={() => onFilterSelect(c.id)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
              isSelected
                ? 'ring-2 ring-indigo-500 shadow-sm border-indigo-200'
                : 'border-slate-100 hover:border-slate-200 hover:shadow-xs shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">
                {c.title}
              </span>
              <div className={`p-1.5 rounded-xl ${c.badgeBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {c.count}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {c.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
}
