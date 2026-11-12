import React, { useState } from 'react';
import { 
  FileText, CheckCircle2, AlertTriangle, XCircle, 
  ExternalLink, Eye, ShieldCheck, Hash, FileCheck, Layers
} from 'lucide-react';

export default function DocumentInspector({ documents, extractedFields, groupedExtracted }) {
  const [selectedDocType, setSelectedDocType] = useState('PAN_CARD');

  const docTypes = [
    { id: 'PAN_CARD', label: '1. PAN Card' },
    { id: 'GST_CERTIFICATE', label: '2. GST Certificate' },
    { id: 'CANCELLED_CHEQUE', label: '3. Cancelled Cheque' },
    { id: 'INCORPORATION_CERTIFICATE', label: '4. Incorporation Certificate' },
  ];

  const currentDoc = (documents || []).find(d => d.document_type === selectedDocType);
  const currentFields = (extractedFields || []).filter(f => f.document_type === selectedDocType);

  const getDocUrl = (doc) => {
    if (!doc || !doc.file_path) return '#';
    // If it's a sample doc or upload
    if (doc.file_path.includes('/data/uploads/')) {
      const parts = doc.file_path.split('/data/uploads/')[1];
      return `/uploads/${parts}`;
    }
    if (doc.file_path.includes('/data/sample_docs/')) {
      const parts = doc.file_path.split('/data/sample_docs/')[1];
      return `/sample_docs/${parts}`;
    }
    return '#';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      
      {/* Document Selector Pills */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-2">
        {docTypes.map(t => {
          const isSelected = selectedDocType === t.id;
          const docItem = (documents || []).find(d => d.document_type === t.id);
          const isMismatch = docItem?.classification_status === 'MISMATCH';

          return (
            <button
              key={t.id}
              onClick={() => setSelectedDocType(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{t.label}</span>
              {isMismatch ? (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left: Document Metadata & Classification Card */}
        <div className="lg:col-span-1 space-y-3">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
                Document Identity
              </span>
              {currentDoc?.classification_status === 'MATCH' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Classification Match
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center">
                  <XCircle className="w-3 h-3 mr-1" />
                  Type Mismatch
                </span>
              )}
            </div>

            <div>
              <div className="font-bold text-slate-900 text-sm truncate">
                {currentDoc?.file_name || 'Document'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                ID: {currentDoc?.document_id || 'DOC-PENDING'}
              </div>
            </div>

            {/* Classification notes */}
            {currentDoc?.classification_notes && (
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 leading-relaxed">
                <span className="font-semibold block text-slate-800 mb-0.5">Classifier Finding:</span>
                {currentDoc.classification_notes}
              </div>
            )}

            {/* Cryptographic SHA-256 Hash */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center">
                <Hash className="w-3 h-3 mr-1" />
                Evidence SHA-256 Hash
              </span>
              <div className="p-2 rounded bg-slate-900 text-emerald-400 font-mono text-[10px] break-all border border-slate-800 select-all">
                {currentDoc?.file_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </div>
            </div>

            {/* Open / Download PDF Button */}
            {currentDoc && (
              <a
                href={getDocUrl(currentDoc)}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Open Original PDF Document
                <ExternalLink className="w-3 h-3 ml-1.5 text-slate-400" />
              </a>
            )}
          </div>
        </div>

        {/* Right: Extracted Fields Table */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <FileCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
              Extracted Fields & Verification Confidence ({currentFields.length} Attributes)
            </h4>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Field Name</th>
                  <th className="py-2.5 px-3">Extracted Value</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Format Valid</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {currentFields.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-400 font-sans">
                      No extracted fields for this document type.
                    </td>
                  </tr>
                ) : (
                  currentFields.map((f, i) => {
                    const isValid = f.format_valid === 1;
                    const confPct = Math.round((f.confidence || 0) * 100);

                    return (
                      <tr key={i} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-800">
                          {f.field_name.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 max-w-xs break-all">
                          {f.extracted_value || <span className="text-slate-400 font-normal italic">Empty</span>}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            confPct >= 90 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : (confPct >= 75 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')
                          }`}>
                            {confPct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {isValid ? (
                            <span className="text-emerald-600 font-bold flex items-center text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Pass
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center text-[10px]">
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Format Error
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-500 text-[10px]">
                          {f.validation_error || f.notes || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

