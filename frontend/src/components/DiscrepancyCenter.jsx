import React, { useState } from 'react';
import { 
  AlertTriangle, Mail, Send, CheckCircle2, RotateCcw, 
  Sparkles, FileText, ArrowRight, Edit3, ShieldAlert, Check, X,
  Clock, ShieldCheck, User, Landmark, Building2, ChevronRight, FileCheck,
  UploadCloud, FileUp, CreditCard
} from 'lucide-react';
import { generateFollowupDraft, updateFollowupDraft, sendFollowupEmail, resolveDiscrepancy } from '../api';

export default function DiscrepancyCenter({ vendor, discrepancies, followups, onRefresh }) {
  // Sub-tabs inside Discrepancy Center for crystal-clear hierarchy
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview', 'email', 'resolution', 'history'

  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editRecipient, setEditRecipient] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Resolution state with all 4 document correction options
  const [selectedDocType, setSelectedDocType] = useState('CANCELLED_CHEQUE');
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [correctedValue, setCorrectedValue] = useState(vendor.company_name);
  const [resolutionNotes, setResolutionNotes] = useState('Vendor furnished corporate current account cheque and board resolution.');
  const [isResolving, setIsResolving] = useState(false);

  const openDiscrepancies = (discrepancies || []).filter(d => d.resolution_status === 'OPEN');
  const resolvedDiscrepancies = (discrepancies || []).filter(d => d.resolution_status === 'RESOLVED');

  const latestFollowup = followups && followups.length > 0 ? followups[0] : null;
  const isEmailSent = latestFollowup && (latestFollowup.delivery_status === 'DELIVERED' || latestFollowup.approval_status === 'APPROVED');
  const isResolved = openDiscrepancies.length === 0 && resolvedDiscrepancies.length > 0;

  // Determine current workflow step (1 to 4)
  const currentStep = isResolved ? 4 : (isEmailSent ? 3 : (draft ? 2 : 1));

  // Initialize or fetch draft email
  const handleOpenEmailTab = async () => {
    if (draft) {
      setActiveSubTab('email');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await generateFollowupDraft(vendor.vendor_id);
      if (res.draft) {
        setDraft(res.draft);
        setEditSubject(res.draft.subject);
        setEditBody(res.draft.email_content);
        setEditRecipient(res.draft.recipient_email);
      }
      setActiveSubTab('email');
    } catch (err) {
      alert('Error generating draft: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Dispatch email
  const handleSendEmail = async () => {
    if (!draft && !latestFollowup) return;
    const targetId = draft ? draft.followup_id : latestFollowup.followup_id;
    setIsSending(true);
    try {
      await updateFollowupDraft(targetId, {
        subject: editSubject || latestFollowup?.subject,
        email_content: editBody || latestFollowup?.email_content,
        recipient_email: editRecipient || latestFollowup?.recipient_email
      });

      await sendFollowupEmail(targetId, 'Sarah Jenkins (Senior Procurement Lead)');
      onRefresh();
      setActiveSubTab('resolution');
    } catch (err) {
      alert('Error sending email: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Submit vendor resolution and trigger re-verification
  const handleSubmitResolution = async () => {
    const targetField = openDiscrepancies.length > 0 ? openDiscrepancies[0].field_name : 'bank_account_holder';
    setIsResolving(true);
    try {
      const fileToUpload = uploadedFiles[selectedDocType];
      if (fileToUpload) {
        const formData = new FormData();
        formData.append('followup_id', draft?.followup_id || latestFollowup?.followup_id || '');
        formData.append('field_name', targetField);
        formData.append('doc_type', selectedDocType);
        formData.append('corrected_value', correctedValue || vendor.company_name);
        formData.append('resolution_notes', resolutionNotes);
        formData.append('file', fileToUpload);
        await resolveDiscrepancy(vendor.vendor_id, formData);
      } else {
        await resolveDiscrepancy(vendor.vendor_id, {
          followup_id: draft?.followup_id || latestFollowup?.followup_id || null,
          field_name: targetField,
          doc_type: selectedDocType,
          corrected_value: correctedValue || vendor.company_name,
          resolution_notes: resolutionNotes,
          use_sample_corrected_cheque: true
        });
      }
      onRefresh();
      setActiveSubTab('overview');
    } catch (err) {
      alert('Resolution error: ' + err.message);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* =================================================================== */}
      {/* 1. VISUAL WORKFLOW PIPELINE TRACKER (Step 1 -> 2 -> 3 -> 4) */}
      {/* =================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 gap-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
            <Sparkles className="w-4 h-4 text-indigo-600 mr-1.5" />
            Discrepancy Resolution Progress
          </h3>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
            {isResolved ? (
              <span className="text-emerald-700 font-bold flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Completed • Approved
              </span>
            ) : isEmailSent ? (
              <span className="text-indigo-700 font-bold flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                Step 3: Awaiting Vendor Correction
              </span>
            ) : (
              <span className="text-amber-700 font-bold flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Step 2: Action Required by Officer
              </span>
            )}
          </span>
        </div>

        {/* 4-Step Interactive Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          
          {/* Step 1 */}
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeSubTab === 'overview'
                ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
              <span>Step 1</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="font-bold text-xs text-slate-900">1. Issue Detected</div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              {openDiscrepancies.length > 0 ? `${openDiscrepancies.length} Mismatch Flagged` : 'Reconciled'}
            </div>
          </button>

          {/* Step 2 */}
          <button
            onClick={handleOpenEmailTab}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeSubTab === 'email'
                ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
              <span>Step 2</span>
              {isEmailSent ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              )}
            </div>
            <div className="font-bold text-xs text-slate-900">2. Follow-Up Email</div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              {isEmailSent ? 'Delivered' : 'Draft Ready'}
            </div>
          </button>

          {/* Step 3 */}
          <button
            onClick={() => setActiveSubTab('resolution')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeSubTab === 'resolution'
                ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
              <span>Step 3</span>
              {isResolved ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : isEmailSent ? (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              )}
            </div>
            <div className="font-bold text-xs text-slate-900">3. Vendor Correction</div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              {isResolved ? 'Submitted' : 'Upload Revised Cheque'}
            </div>
          </button>

          {/* Step 4 */}
          <button
            onClick={() => setActiveSubTab('history')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeSubTab === 'history'
                ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
              <span>Step 4</span>
              {isResolved ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              )}
            </div>
            <div className="font-bold text-xs text-slate-900">4. Re-Verify & Clear</div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              {isResolved ? 'Verified & Approved' : 'Audit Trail'}
            </div>
          </button>

        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. SUB-TAB 1: ACTIVE DISCREPANCIES (Short & Crisp Hierarchy) */}
      {/* =================================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          
          {openDiscrepancies.length === 0 ? (
            <div className="bg-white rounded-2xl border border-emerald-100 p-8 text-center space-y-2 shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">All Discrepancies Cleared & Verified</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No active discrepancies exist for {vendor.company_name}. 
                Registration details, bank accounts, and authority registries are fully consistent.
              </p>
              <div className="pt-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Status: APPROVED
                </span>
              </div>
            </div>
          ) : (
            openDiscrepancies.map((d) => {
              const fn = (d.field_name || '').toLowerCase();
              let title = `${d.field_name.replace(/_/g, ' ')} Mismatch`;
              let submittedLabel = 'Submitted Form Value';
              let submittedSub = 'Corporate Legal Entity';
              let verifiedLabel = 'Verified Registry / Authority Record';
              let verifiedSub = 'Mismatch Detected ⚠️';
              let explanation = d.impact || 'Discrepancy detected across submitted evidence and official records.';
              let actionText = isEmailSent ? 'Follow-up email dispatched. Awaiting vendor correction.' : 'Action: Send follow-up email to request updated compliance evidence.';

              if (fn.includes('bank') || fn.includes('cheque') || fn.includes('beneficiary')) {
                title = 'Bank Ownership / Beneficiary Mismatch';
                submittedLabel = 'Submitted Bank Beneficiary';
                submittedSub = 'Expected Corporate Legal Entity';
                verifiedLabel = 'Official Destination Bank Record';
                verifiedSub = 'Individual Personal Account ⚠️';
                explanation = d.impact || "Destination bank returned an individual beneficiary name instead of the corporate legal entity. A company current account cheque is required.";
                actionText = isEmailSent ? 'Follow-up email dispatched. Awaiting revised corporate current account cheque.' : 'Action: Send follow-up email to request corporate current account cheque.';
              } else if (fn.includes('cin')) {
                title = 'Corporate CIN Registry Mismatch';
                submittedLabel = 'Submitted Corporate CIN';
                submittedSub = 'Application Registration Filing';
                verifiedLabel = 'MCA21 Master Registry Return';
                verifiedSub = 'CIN Not Found or Inactive in MCA ⚠️';
                explanation = d.impact || "Corporate Identity Number was not found or is struck off in the MCA Company Registry.";
                actionText = isEmailSent ? 'Follow-up email dispatched. Awaiting authentic MCA Certificate of Incorporation.' : 'Action: Send follow-up email to request active MCA Certificate of Incorporation.';
              } else if (fn.includes('pan')) {
                title = 'PAN Consistency & Taxpayer Mismatch';
                submittedLabel = 'Submitted PAN Number';
                submittedSub = 'Vendor Tax Declaration';
                verifiedLabel = 'NSDL / Embedded GSTIN Record';
                verifiedSub = 'Entity PAN Mismatch ⚠️';
                explanation = d.impact || "Submitted PAN does not align with NSDL tax records or embedded GSTIN characters.";
                actionText = isEmailSent ? 'Follow-up email dispatched. Awaiting valid corporate PAN card.' : 'Action: Send follow-up email to request matching corporate PAN proof.';
              } else if (fn.includes('gst')) {
                title = 'GSTIN Registration Inconsistency';
                submittedLabel = 'Submitted GSTIN';
                submittedSub = 'Tax Registration Form';
                verifiedLabel = 'GSTN Taxpayer Registry Return';
                verifiedSub = 'Status or Legal Name Divergence ⚠️';
                explanation = d.impact || "GSTIN registration shows discrepancies with entity records or registered tax status.";
                actionText = isEmailSent ? 'Follow-up email dispatched. Awaiting active GST REG-06 certificate.' : 'Action: Send follow-up email to request updated GST certificate.';
              } else if (fn.includes('company_name') || fn.includes('name')) {
                title = 'Legal Entity Name Discrepancy';
                submittedLabel = 'Submitted Entity Name';
                submittedSub = 'Onboarding Registration Form';
                verifiedLabel = 'Statutory Registry Name';
                verifiedSub = 'Legal Entity Name Variation ⚠️';
                explanation = d.impact || "Entity legal name differs significantly across submitted documents and official registries.";
                actionText = isEmailSent ? 'Follow-up email dispatched. Awaiting legal name clarification.' : 'Action: Send follow-up email to confirm legal entity name.';
              } else if (fn.includes('address')) {
                title = 'Registered Office Address Mismatch';
                submittedLabel = 'Submitted Business Address';
                submittedSub = 'Vendor Application Form';
                verifiedLabel = 'Verified GST / MCA Office Address';
                verifiedSub = 'Principal Address Divergence ⚠️';
                explanation = d.impact || "Address in registration form differs from official registry records.";
                actionText = isEmailSent ? 'Follow-up email dispatched. Awaiting address proof.' : 'Action: Request confirmation of principal vs registered address.';
              }

              return (
                <div 
                  key={d.discrepancy_id}
                  className="bg-white rounded-2xl border border-amber-200/90 shadow-xs overflow-hidden"
                >
                  {/* Header: Dynamic & Crisp */}
                  <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        {title}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {d.discrepancy_id}
                    </span>
                  </div>

                  <div className="p-4 space-y-3.5 text-xs">
                    
                    {/* Clean Side-by-Side Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* Left: Submitted */}
                      <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-sans">
                          {submittedLabel}
                        </span>
                        <div className="font-bold text-sm text-slate-900 break-all">
                          {d.submitted_value || 'None provided'}
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          {submittedSub}
                        </span>
                      </div>

                      {/* Right: Verified */}
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1">
                        <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider block font-sans">
                          {verifiedLabel}
                        </span>
                        <div className="font-bold text-sm text-rose-700 break-all font-mono">
                          {d.verified_value || 'Mismatch detected'}
                        </div>
                        <span className="text-[11px] text-rose-600 font-semibold block">
                          {verifiedSub}
                        </span>
                      </div>

                    </div>

                    {/* Dynamic Explanation */}
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950">
                      <strong>Mismatch:</strong> {explanation}
                    </div>

                    {/* Direct Action Footer */}
                    <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-slate-100 gap-2">
                      <span className="text-[11px] text-slate-500">
                        {actionText}
                      </span>

                      <div className="shrink-0 self-end sm:self-auto">
                        {!isEmailSent ? (
                          <button
                            onClick={handleOpenEmailTab}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center space-x-1.5"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Review & Send Email</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveSubTab('resolution')}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center space-x-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Upload Evidence & Re-Verify</span>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          )}

        </div>
      )}

      {/* =================================================================== */}
      {/* 4. SUB-TAB 2: FOLLOW-UP EMAIL COMMUNICATION CLIENT */}
      {/* =================================================================== */}
      {activeSubTab === 'email' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Automated Procurement Follow-Up Composer
              </h4>
            </div>
            {isEmailSent ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ✓ Delivered to Vendor
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Draft Prepared for Review
              </span>
            )}
          </div>

          <div className="p-5 space-y-4 text-xs">
            
            {/* Status explanation */}
            <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 text-[11px] text-indigo-900 flex items-start space-x-2">
              <Mail className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>Automated Clarification Notice:</strong> The verification engine flagged an identity mismatch on the destination bank account and pre-drafted this formal procurement inquiry. Please review and dispatch.
              </div>
            </div>

            {/* Email Metadata Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Recipient (Vendor Contact)
                </label>
                <input
                  type="email"
                  value={editRecipient || latestFollowup?.recipient_email || vendor.contact_email}
                  onChange={(e) => setEditRecipient(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Dispatched From
                </label>
                <input
                  type="text"
                  disabled
                  value="compliance@credora.com (Global Procurement Operations)"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={editSubject || latestFollowup?.subject || `Action Required: Bank Account Clarification — ${vendor.company_name}`}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Email Content & Instructions to Vendor
              </label>
              <textarea
                rows={12}
                value={editBody || latestFollowup?.email_content || ''}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg text-xs font-sans leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/40"
              />
            </div>

            {/* Controls */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {isEmailSent ? 'Email was recorded in cryptographic audit ledger.' : 'Sending updates vendor status to Awaiting Info.'}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('overview')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Back to Discrepancies
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={isSending}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {isSending ? 'Dispatching Email...' : (isEmailSent ? 'Re-Send Updated Email' : 'Approve & Send Follow-Up Email')}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. SUB-TAB 3: VENDOR CORRECTION & RE-VERIFICATION PORTAL */}
      {/* =================================================================== */}
      {activeSubTab === 'resolution' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 text-xs">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <RotateCcw className="w-4 h-4 text-emerald-600 mr-1.5" />
              Step 3: Vendor Submission & Selective Re-Verification
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Upload the corrected document or select from the 4 compliance options to resolve open discrepancies and re-verify.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-2 flex items-center justify-between">
              <span>Select Document to Correct & Upload Evidence:</span>
              <span className="text-[10px] text-slate-400 font-normal">Choose option or upload replacement PDF/Image</span>
            </div>

            {/* 4 Document Options with dedicated Upload Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  type: 'CANCELLED_CHEQUE',
                  label: '1. Cancelled Cheque / Bank Proof',
                  icon: Landmark,
                  desc: 'Authorized corporate current account cheque or bank confirmation letter.',
                  badge: 'ICICI A/C: 501004321111'
                },
                {
                  type: 'PAN_CARD',
                  label: '2. Company PAN Card',
                  icon: FileText,
                  desc: 'Official corporate PAN card issued by Income Tax Department.',
                  badge: `PAN: ${vendor.pan || 'AABCV5678C'}`
                },
                {
                  type: 'GST_CERTIFICATE',
                  label: '3. GST Registration Certificate',
                  icon: Building2,
                  desc: 'Form GST REG-06 principal place of business registration certificate.',
                  badge: `GSTIN: ${vendor.gstin || '27AABCV5678C1Z2'}`
                },
                {
                  type: 'INCORPORATION_CERTIFICATE',
                  label: '4. Certificate of Incorporation',
                  icon: ShieldCheck,
                  desc: 'MCA Certificate of Incorporation (COI) matching corporate CIN.',
                  badge: `CIN: ${vendor.cin || 'U72200MH2019PTC321980'}`
                }
              ].map((doc) => {
                const isSelected = selectedDocType === doc.type;
                const file = uploadedFiles[doc.type];
                const Icon = doc.icon;

                return (
                  <div
                    key={doc.type}
                    onClick={() => {
                      setSelectedDocType(doc.type);
                      if (doc.type === 'PAN_CARD') setCorrectedValue(vendor.pan || 'AABCV5678C');
                      else if (doc.type === 'GST_CERTIFICATE') setCorrectedValue(vendor.gstin || '27AABCV5678C1Z2');
                      else if (doc.type === 'INCORPORATION_CERTIFICATE') setCorrectedValue(vendor.cin || 'U72200MH2019PTC321980');
                      else setCorrectedValue(vendor.company_name);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{doc.label}</div>
                          <div className="text-[10.5px] text-slate-500 leading-tight mt-0.5">{doc.desc}</div>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="res_doc_type"
                        checked={isSelected}
                        onChange={() => setSelectedDocType(doc.type)}
                        className="text-emerald-600 focus:ring-emerald-500 mt-0.5 shrink-0"
                      />
                    </div>

                    {/* Upload button & file status */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      <label className="cursor-pointer inline-flex items-center px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-2xs hover:scale-[1.01] transition-all">
                        <UploadCloud className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        {file ? 'Change File' : 'Upload File'}
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const f = e.target.files[0];
                              setUploadedFiles(prev => ({ ...prev, [doc.type]: f }));
                              setSelectedDocType(doc.type);
                            }
                          }}
                        />
                      </label>

                      {file ? (
                        <div className="flex items-center space-x-1 text-[10.5px] text-emerald-700 font-semibold truncate bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-300/60 max-w-[170px]">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedFiles(prev => {
                                const copy = { ...prev };
                                delete copy[doc.type];
                                return copy;
                              });
                            }}
                            className="text-slate-400 hover:text-rose-600 ml-1 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {doc.badge}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Updated Value / Entity Legal Name
              </label>
              <input
                type="text"
                value={correctedValue}
                onChange={(e) => setCorrectedValue(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Procurement Review Notes
              </label>
              <textarea
                rows={2}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Only the affected Penny-Drop and Cheque OCR stages will be re-executed.
            </span>
            <button
              onClick={handleSubmitResolution}
              disabled={isResolving}
              className="inline-flex items-center px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all hover:scale-[1.01] disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isResolving ? 'animate-spin' : ''}`} />
              {isResolving ? 'Re-running Affected Verification Checks...' : 'Submit Evidence & Re-Verify Pipeline'}
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. SUB-TAB 4: RESOLUTION AUDIT & HISTORY */}
      {/* =================================================================== */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 text-xs">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
            <FileText className="w-4 h-4 text-slate-600 mr-1.5" />
            Discrepancy Resolution & Communication History
          </h4>

          {/* Followups list */}
          {followups && followups.length > 0 ? (
            <div className="space-y-3">
              {followups.map((f, i) => (
                <div key={f.followup_id || i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{f.subject}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {f.delivery_status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Recipient: <strong>{f.recipient_email}</strong> • Sent: {f.sent_at || f.created_at}
                  </div>
                  <pre className="p-3 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                    {f.email_content}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-xs">No follow-up emails dispatched yet.</p>
          )}

          {/* Resolved list */}
          {resolvedDiscrepancies.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 block">
                Cleared & Verified Discrepancies:
              </span>
              {resolvedDiscrepancies.map((d) => (
                <div key={d.discrepancy_id} className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-xs">{d.field_name.replace(/_/g, ' ')}</span>
                    <span className="text-[11px] text-emerald-800">— {d.resolution_notes}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700">
                    {d.resolved_at ? new Date(d.resolved_at).toLocaleTimeString() : 'Verified'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
