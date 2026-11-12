import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

export default function CrossDocumentMatrix({ vendor, groupedExtracted, verificationResults, discrepancies }) {
  if (!vendor) return null;

  // Extracted values
  const panExt = groupedExtracted?.PAN_CARD || {};
  const gstExt = groupedExtracted?.GST_CERTIFICATE || {};
  const chqExt = groupedExtracted?.CANCELLED_CHEQUE || {};
  const coiExt = groupedExtracted?.INCORPORATION_CERTIFICATE || {};

  // Verification results
  const panApi = (verificationResults || []).find(r => r.verification_type === 'PAN_API')?.response_details || {};
  const gstApi = (verificationResults || []).find(r => r.verification_type === 'GST_API')?.response_details || {};
  const bankApi = (verificationResults || []).find(r => r.verification_type === 'PENNY_DROP')?.response_details || {};
  const mcaApi = (verificationResults || []).find(r => r.verification_type === 'MCA_REGISTRY')?.response_details || {};

  const matrixRows = [
    {
      label: 'Company Legal Name',
      form: vendor.company_name,
      panDoc: panExt.holder_name?.extracted_value || panApi.registered_name || '—',
      gstDoc: gstExt.legal_name?.extracted_value || gstApi.legal_name || '—',
      coiDoc: coiExt.company_name?.extracted_value || mcaApi.company_name || '—',
      external: mcaApi.company_name || panApi.registered_name || '—',
      matchType: 'Fuzzy Token Ratio',
      status: (discrepancies || []).some(d => d.field_name === 'company_name' && d.resolution_status === 'OPEN') ? 'FAIL' : 'PASS'
    },
    {
      label: 'PAN Number',
      form: vendor.pan,
      panDoc: panExt.pan_number?.extracted_value || '—',
      gstDoc: (gstExt.gstin?.extracted_value || '').substring(2, 12) || 'Embedded in GST',
      coiDoc: 'N/A',
      external: panApi.pan || 'NSDL Operative',
      matchType: 'Exact Match (10-char)',
      status: (discrepancies || []).some(d => d.field_name === 'pan' && d.resolution_status === 'OPEN') ? 'FAIL' : 'PASS'
    },
    {
      label: 'GSTIN',
      form: vendor.gstin,
      panDoc: 'N/A',
      gstDoc: gstExt.gstin?.extracted_value || '—',
      coiDoc: 'N/A',
      external: gstApi.gstin ? `${gstApi.gstin} (${gstApi.status || 'Active'})` : '—',
      matchType: 'Exact Match (15-char)',
      status: (discrepancies || []).some(d => d.field_name === 'gstin' && d.resolution_status === 'OPEN') ? 'FAIL' : 'PASS'
    },
    {
      label: 'CIN (Corporate Identity)',
      form: vendor.cin,
      panDoc: 'N/A',
      gstDoc: 'N/A',
      coiDoc: coiExt.cin?.extracted_value || '—',
      external: mcaApi.cin ? `${mcaApi.cin} (${mcaApi.company_status || 'Active'})` : '—',
      matchType: 'Exact Match (21-char)',
      status: (discrepancies || []).some(d => d.field_name === 'cin' && d.resolution_status === 'OPEN') ? 'FAIL' : 'PASS'
    },
    {
      label: 'Bank Account Number',
      form: vendor.bank_account_number,
      panDoc: 'N/A',
      gstDoc: 'N/A',
      coiDoc: 'N/A',
      chequeDoc: chqExt.bank_account_number?.extracted_value || '—',
      external: bankApi.account_status ? `Active (${bankApi.account_status})` : 'Active Bank Record',
      matchType: 'Exact Digit Match',
      status: (discrepancies || []).some(d => d.field_name === 'bank_account_number' && d.resolution_status === 'OPEN') ? 'FAIL' : 'PASS'
    },
    {
      label: 'Bank Beneficiary Name',
      form: vendor.company_name,
      panDoc: 'N/A',
      gstDoc: 'N/A',
      coiDoc: 'N/A',
      chequeDoc: chqExt.bank_account_holder?.extracted_value || 'Authorized Signatory',
      external: bankApi.beneficiary_name_returned || bankApi.beneficiary_name || '—',
      matchType: 'Legal Entity vs Bank Record',
      status: (discrepancies || []).some(d => d.field_name === 'bank_account_holder' && d.resolution_status === 'OPEN') ? 'FAIL' : 'PASS'
    },
    {
      label: 'Registered Office Address',
      form: vendor.registered_address,
      panDoc: 'State Jurisdiction',
      gstDoc: gstExt.registered_address?.extracted_value || gstApi.principal_place_of_business || '—',
      coiDoc: coiExt.registered_address?.extracted_value || mcaApi.registered_address || '—',
      external: mcaApi.registered_address || 'MCA Registry Records',
      matchType: 'Fuzzy Address Tolerance',
      status: (discrepancies || []).some(d => d.field_name === 'registered_address' && d.resolution_status === 'OPEN') ? 'WARN' : 'PASS'
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
            <Layers className="w-4 h-4 text-indigo-600 mr-1.5" />
            Cross-Document Consistency Matrix
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Multi-way comparison across Registration Form, Uploaded Documents, and Authority Registries.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase">
              <th className="py-3 px-4">Entity Attribute</th>
              <th className="py-3 px-3">Submitted Form</th>
              <th className="py-3 px-3">PAN Card</th>
              <th className="py-3 px-3">GST Certificate</th>
              <th className="py-3 px-3">Incorporation (COI) / Cheque</th>
              <th className="py-3 px-3">External Registry API</th>
              <th className="py-3 px-4 text-right">Alignment Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {matrixRows.map((row, idx) => {
              const isFail = row.status === 'FAIL';
              const isWarn = row.status === 'WARN';
              return (
                <tr 
                  key={idx}
                  className={`transition-colors ${
                    isFail 
                      ? 'bg-rose-50/70' 
                      : (isWarn ? 'bg-amber-50/50' : 'hover:bg-slate-50/60')
                  }`}
                >
                  <td className="py-3 px-4 font-sans font-bold text-slate-900">
                    {row.label}
                    <div className="text-[10px] text-slate-400 font-mono font-normal mt-0.5">
                      {row.matchType}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-800 max-w-xs truncate" title={row.form}>
                    {row.form || '—'}
                  </td>
                  <td className="py-3 px-3 text-slate-700 max-w-xs truncate" title={row.panDoc}>
                    {row.panDoc}
                  </td>
                  <td className="py-3 px-3 text-slate-700 max-w-xs truncate" title={row.gstDoc}>
                    {row.gstDoc}
                  </td>
                  <td className="py-3 px-3 text-slate-700 max-w-xs truncate" title={row.chequeDoc || row.coiDoc}>
                    {row.chequeDoc || row.coiDoc}
                  </td>
                  <td className="py-3 px-3 text-slate-900 font-semibold max-w-xs truncate" title={row.external}>
                    {row.external}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    {isFail ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3 mr-1" />
                        Discrepancy
                      </span>
                    ) : isWarn ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Minor Diff
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Consistent
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

