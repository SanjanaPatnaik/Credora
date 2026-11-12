import React, { useState } from 'react';
import { 
  FileUp, Sparkles, Building2, CreditCard, FileCheck, 
  UploadCloud, CheckCircle2, AlertCircle, ArrowRight, Loader2
} from 'lucide-react';
import { submitVendorIntake } from '../api';

export default function VendorIntakePortal({ onIntakeComplete, onBackToDashboard }) {
  const [formData, setFormData] = useState({
    company_name: '',
    cin: '',
    pan: '',
    gstin: '',
    registered_address: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: '',
    bank_account_holder: ''
  });

  const [panFile, setPanFile] = useState(null);
  const [gstFile, setGstFile] = useState(null);
  const [chequeFile, setChequeFile] = useState(null);
  const [coiFile, setCoiFile] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Strict validation: all 4 compliance documents are compulsory
    if (!panFile || !gstFile || !chequeFile || !coiFile) {
      const missing = [];
      if (!panFile) missing.push('1. Company PAN Card PDF');
      if (!gstFile) missing.push('2. GST Registration Certificate (REG-06)');
      if (!chequeFile) missing.push('3. Cancelled Cheque PDF');
      if (!coiFile) missing.push('4. Certificate of Incorporation (COI)');
      alert(`All 4 compliance documents are compulsory to upload before registration can proceed:\n\nMissing files:\n• ${missing.join('\n• ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([k, v]) => data.append(k, v));
      data.append('pan_card', panFile);
      data.append('gst_certificate', gstFile);
      data.append('cancelled_cheque', chequeFile);
      data.append('incorporation_certificate', coiFile);

      const res = await submitVendorIntake(data);
      if (res.vendor_id) {
        setSubmittedData({
          vendor_id: res.vendor_id,
          company_name: formData.company_name
        });
      }
    } catch (err) {
      alert('Submission error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedData) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm text-center max-w-xl mx-auto space-y-4">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Application Submitted Successfully!</h2>
          <p className="text-xs text-slate-500 mt-1">
            Your vendor registration details and 4 compliance documents have been securely received.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 text-xs font-mono space-y-2 text-left border border-slate-100">
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Vendor Reference ID:</span>
            <span className="font-bold text-slate-900">{submittedData.vendor_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Entity Name:</span>
            <span className="font-bold text-slate-900">{submittedData.company_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Submission Status:</span>
            <span className="text-emerald-700 font-bold">Under Compliance Review</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          Our procurement operations team will review your application. You will be notified via email once verification is complete.
        </p>

        {/* Strictly Vendor Facing: No button leading to internal operations hub */}
        <div className="pt-2 flex items-center justify-center">
          <button
            onClick={() => {
              setSubmittedData(null);
              setPanFile(null);
              setGstFile(null);
              setChequeFile(null);
              setCoiFile(null);
            }}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
          >
            Submit Another Vendor Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Main Intake Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Form Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-base font-extrabold text-slate-900">
            Stage 1: Vendor Registration & Document Intake
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit structured corporate registration data and upload all 4 mandatory compliance documents.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
          
          {/* Section A: Company Profile */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-emerald-600 mr-1.5" />
              A. Company Profile & Registered Office
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Company Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Corporate Identity Number (CIN) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cin}
                  onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Registered Office Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.registered_address}
                  onChange={(e) => setFormData({ ...formData, registered_address: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section B: Tax & Compliance Identifiers */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center border-b border-slate-100 pb-2">
              <FileCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
              B. Tax & Compliance Identifiers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Company PAN Number (10 chars, 4th 'C') *
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  GSTIN (15 chars) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section C: Bank Details */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center border-b border-slate-100 pb-2">
              <CreditCard className="w-4 h-4 text-emerald-600 mr-1.5" />
              C. Corporate Bank Account Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bank Account Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.bank_account_number}
                  onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bank IFSC Code (11 chars) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  value={formData.bank_ifsc}
                  onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section D: Document Uploads */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2 gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                <FileUp className="w-4 h-4 text-emerald-600 mr-1.5" />
                D. Mandatory Compliance Documents
              </h3>
              <span className="text-xs text-rose-600 font-medium self-start sm:self-auto">
                * All 4 uploads required before submission
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: '1. Company PAN Card PDF', file: panFile, setFile: setPanFile, hint: 'Income Tax Permanent Account Number card' },
                { label: '2. GST Registration Certificate', file: gstFile, setFile: setGstFile, hint: 'Official Form GST REG-06' },
                { label: '3. Cancelled Cheque PDF', file: chequeFile, setFile: setChequeFile, hint: 'Corporate current account cheque with IFSC' },
                { label: '4. Certificate of Incorporation', file: coiFile, setFile: setCoiFile, hint: 'MCA incorporation certificate with CIN' },
              ].map((doc, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-800 text-xs">
                      {doc.label} <span className="text-rose-500 font-bold">*</span>
                    </div>
                  </div>
                  <div className="text-[10.5px] text-slate-400 mb-2 leading-tight">
                    {doc.hint}
                  </div>
                  <input
                    type="file"
                    required
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => doc.setFile(e.target.files[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                  {doc.file && (
                    <div className="text-[11px] text-emerald-700 mt-2 font-medium truncate flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0 text-emerald-600" />
                      <span className="truncate">{doc.file.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              System will initiate document extraction, tax authority verification, and bank confirmation.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all hover:scale-[1.01] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running 7-Stage Pipeline...
                </>
              ) : (
                <>
                  <span>Submit Vendor & Execute Verification</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

