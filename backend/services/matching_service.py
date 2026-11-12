import re
from typing import Dict, Any, List
from rapidfuzz import fuzz

def normalize_company_name(name: str) -> str:
    if not name:
        return ""
    n = name.upper()
    # Normalize common abbreviations
    n = re.sub(r'\bPVT\.?\s*LTD\.?\b', 'PRIVATE LIMITED', n)
    n = re.sub(r'\bPVT\b', 'PRIVATE', n)
    n = re.sub(r'\bLTD\b', 'LIMITED', n)
    n = re.sub(r'[^A-Z0-9\s]', ' ', n)
    n = re.sub(r'\s+', ' ', n)
    return n.strip()

def normalize_address(addr: str) -> str:
    if not addr:
        return ""
    a = addr.upper()
    a = re.sub(r'[^A-Z0-9\s]', ' ', a)
    a = re.sub(r'\s+', ' ', a)
    return a.strip()

def run_cross_document_matching(
    form_data: dict,
    extracted_fields: Dict[str, Dict[str, Any]],
    verification_results: Dict[str, Any],
    classification_results: List[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Executes cross-document consistency checks comparing Form, Extracted Document Values, and External Registry Returns.
    """
    checks = []

    # Helper to get extracted field
    def get_ext(doc_type: str, field_name: str) -> str:
        d = extracted_fields.get(doc_type, {})
        f = d.get(field_name, {})
        return (f.get("extracted_value") or "").strip()

    # Form values
    form_company = form_data.get("company_name", "").strip()
    form_pan = form_data.get("pan", "").strip().upper()
    form_gstin = form_data.get("gstin", "").strip().upper()
    form_cin = form_data.get("cin", "").strip().upper()
    form_acc = form_data.get("bank_account_number", "").strip()
    form_ifsc = form_data.get("bank_ifsc", "").strip().upper()
    form_addr = form_data.get("registered_address", "").strip()

    # Extracted values
    ext_pan = get_ext("PAN_CARD", "pan_number")
    ext_pan_name = get_ext("PAN_CARD", "holder_name")
    
    ext_gstin = get_ext("GST_CERTIFICATE", "gstin")
    ext_gst_name = get_ext("GST_CERTIFICATE", "legal_name")
    ext_gst_addr = get_ext("GST_CERTIFICATE", "registered_address")

    ext_cheque_acc = get_ext("CANCELLED_CHEQUE", "bank_account_number")
    ext_cheque_ifsc = get_ext("CANCELLED_CHEQUE", "bank_ifsc")
    ext_cheque_holder = get_ext("CANCELLED_CHEQUE", "bank_account_holder")

    ext_coi_cin = get_ext("INCORPORATION_CERTIFICATE", "cin")
    ext_coi_name = get_ext("INCORPORATION_CERTIFICATE", "company_name")
    ext_coi_addr = get_ext("INCORPORATION_CERTIFICATE", "registered_address")

    # Verified values from API/mock services
    pan_api = verification_results.get("PAN_API", {})
    pan_verified_name = pan_api.get("holder_name", "")

    gst_api = verification_results.get("GST_API", {})
    gst_verified_name = gst_api.get("legal_name", "")
    gst_verified_status = gst_api.get("registration_status", "")

    penny_drop = verification_results.get("PENNY_DROP", {})
    bank_beneficiary = penny_drop.get("beneficiary_name", "")
    bank_acc_status = penny_drop.get("account_status", "")

    mca_reg = verification_results.get("MCA_REGISTRY", {})
    mca_verified_name = mca_reg.get("company_name", "")
    mca_status = mca_reg.get("company_status", "")

    # ==========================================
    # Check 0A: Document Classification Mismatches (Wrong/Invalid Document Uploaded)
    # ==========================================
    doc_field_map = {
        "PAN_CARD": "pan_card",
        "GST_CERTIFICATE": "gst_certificate",
        "CANCELLED_CHEQUE": "cancelled_cheque",
        "INCORPORATION_CERTIFICATE": "incorporation_certificate"
    }
    if classification_results:
        for cls in classification_results:
            if cls.get("classification_status") == "MISMATCH":
                exp_type = cls.get("expected_type", "DOCUMENT")
                found_type = cls.get("classified_type", "UNKNOWN")
                doc_label = exp_type.replace('_', ' ').title()
                detected_label = found_type.replace('_', ' ').title()
                field_key = doc_field_map.get(exp_type, exp_type.lower())
                
                checks.append({
                    "check_id": f"CHK_CLASSIFICATION_{exp_type}",
                    "field_name": field_key,
                    "title": f"Document Type Mismatch: {doc_label}",
                    "status": "DISCREPANCY",
                    "severity": "CRITICAL",
                    "match_score": 0.0,
                    "values": {
                        "form": f"Required: {doc_label}",
                        "mca_registry": f"Detected: {detected_label}",
                        "expected_document": doc_label,
                        "detected_document": detected_label,
                        "confidence": f"{int(cls.get('classification_confidence', 0) * 100)}%"
                    },
                    "explanation": cls.get("explanation") or f"Document type mismatch: Expected genuine {doc_label}, but detected {detected_label}.",
                    "recommended_action": f"Request vendor to upload an authentic {doc_label} to satisfy statutory compliance."
                })

    # ==========================================
    # Check 0: Mandatory Document Completeness
    # ==========================================
    mandatory_docs = [
        ("PAN_CARD", "Company PAN Card", "pan_card"),
        ("GST_CERTIFICATE", "GST Registration Certificate", "gst_certificate"),
        ("CANCELLED_CHEQUE", "Cancelled Cheque", "cancelled_cheque"),
        ("INCORPORATION_CERTIFICATE", "Certificate of Incorporation", "incorporation_certificate")
    ]
    for doc_type, doc_label, field_key in mandatory_docs:
        if doc_type not in extracted_fields:
            checks.append({
                "check_id": f"CHK_MISSING_DOC_{doc_type}",
                "field_name": field_key,
                "title": f"Missing Document: {doc_label}",
                "status": "DISCREPANCY",
                "severity": "HIGH",
                "match_score": 0.0,
                "values": {
                    "document": doc_label,
                    "submitted": "NOT_UPLOADED",
                    "requirement": "Mandatory Compliance Document"
                },
                "explanation": f"Mandatory compliance document '{doc_label}' was not uploaded during vendor intake. Physical proof is required to satisfy procurement compliance.",
                "recommended_action": f"Request vendor to upload a clear copy of their {doc_label}."
            })

    # ==========================================
    # Check 1: Company Legal Name Matching
    # ==========================================
    norm_form = normalize_company_name(form_company)
    norm_pan = normalize_company_name(ext_pan_name or pan_verified_name)
    norm_gst = normalize_company_name(ext_gst_name or gst_verified_name)
    norm_coi = normalize_company_name(ext_coi_name)
    norm_mca = normalize_company_name(mca_verified_name)

    names = [n for n in [norm_form, norm_pan, norm_gst, norm_coi, norm_mca] if n]
    min_name_score = 100.0
    if len(names) >= 2:
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                s = fuzz.token_sort_ratio(names[i], names[j])
                if s < min_name_score:
                    min_name_score = s
                    
    if min_name_score >= 90.0:
        checks.append({
            "check_id": "CHK_COMPANY_NAME",
            "field_name": "company_name",
            "title": "Company Legal Name Consistency",
            "status": "PASS",
            "severity": "LOW",
            "match_score": min_name_score,
            "values": {
                "form": form_company,
                "pan_card": ext_pan_name or pan_verified_name,
                "gst_certificate": ext_gst_name or gst_verified_name,
                "coi": ext_coi_name,
                "mca_registry": mca_verified_name
            },
            "explanation": f"Legal entity name matches with high confidence ({min_name_score:.1f}%) across all documents and registries.",
            "recommended_action": None
        })
    elif min_name_score >= 75.0:
        checks.append({
            "check_id": "CHK_COMPANY_NAME",
            "field_name": "company_name",
            "title": "Company Legal Name Minor Variation",
            "status": "WARNING",
            "severity": "MEDIUM",
            "match_score": min_name_score,
            "values": {
                "form": form_company,
                "pan_card": ext_pan_name or pan_verified_name,
                "gst_certificate": ext_gst_name or gst_verified_name,
                "coi": ext_coi_name,
                "mca_registry": mca_verified_name
            },
            "explanation": f"Minor spelling or abbreviation variation detected ({min_name_score:.1f}% match). Human review recommended.",
            "recommended_action": "Verify if the minor naming difference is an acceptable trade abbreviation or registered alias."
        })
    else:
        checks.append({
            "check_id": "CHK_COMPANY_NAME",
            "field_name": "company_name",
            "title": "Company Legal Name Mismatch",
            "status": "DISCREPANCY",
            "severity": "HIGH",
            "match_score": min_name_score,
            "values": {
                "form": form_company,
                "pan_card": ext_pan_name or pan_verified_name,
                "gst_certificate": ext_gst_name or gst_verified_name,
                "coi": ext_coi_name,
                "mca_registry": mca_verified_name
            },
            "explanation": f"Significant mismatch in company legal name ({min_name_score:.1f}% match) across documents.",
            "recommended_action": "Request clarification or revised Certificate of Incorporation from vendor."
        })

    # ==========================================
    # Check 2: PAN & GSTIN Embedded Consistency
    # ==========================================
    # Characters 2 to 12 of GSTIN should match PAN exactly
    pan_matches_ext = (not ext_pan) or (form_pan == ext_pan)
    gstin_embedded_pan = form_gstin[2:12] if len(form_gstin) == 15 else ""
    pan_matches_gst = (form_pan == gstin_embedded_pan) if gstin_embedded_pan else True

    if pan_matches_ext and pan_matches_gst:
        checks.append({
            "check_id": "CHK_PAN_CONSISTENCY",
            "field_name": "pan",
            "title": "PAN & GSTIN Embedded Alignment",
            "status": "PASS",
            "severity": "LOW",
            "match_score": 100.0,
            "values": {
                "form_pan": form_pan,
                "pan_card_extracted": ext_pan,
                "gstin_embedded_pan": gstin_embedded_pan
            },
            "explanation": "Company PAN perfectly matches the PAN card and the entity PAN embedded inside the GSTIN.",
            "recommended_action": None
        })
    else:
        checks.append({
            "check_id": "CHK_PAN_CONSISTENCY",
            "field_name": "pan",
            "title": "PAN Mismatch Across Documents",
            "status": "DISCREPANCY",
            "severity": "CRITICAL",
            "match_score": 0.0,
            "values": {
                "form_pan": form_pan,
                "pan_card_extracted": ext_pan,
                "gstin_embedded_pan": gstin_embedded_pan
            },
            "explanation": f"PAN inconsistency: Form PAN '{form_pan}' does not align with embedded GSTIN PAN '{gstin_embedded_pan}' or PAN Card '{ext_pan}'.",
            "recommended_action": "Halt onboarding. Vendor must provide a valid GST certificate registered under the exact corporate PAN."
        })

    # ==========================================
    # Check 3: CIN Consistency (Form vs COI vs MCA)
    # ==========================================
    cin_form_coi_match = (not ext_coi_cin) or (form_cin == ext_coi_cin)
    cin_mca_match = (mca_reg.get("verification_status") == "VERIFIED")

    if cin_form_coi_match and cin_mca_match:
        checks.append({
            "check_id": "CHK_CIN_REGISTRY",
            "field_name": "cin",
            "title": "CIN & Incorporation Registry Match",
            "status": "PASS",
            "severity": "LOW",
            "match_score": 100.0,
            "values": {
                "form_cin": form_cin,
                "coi_extracted_cin": ext_coi_cin,
                "mca_status": mca_status
            },
            "explanation": "Corporate Identity Number matches Certificate of Incorporation and is Active in MCA registry.",
            "recommended_action": None
        })
    elif not cin_mca_match and mca_reg.get("verification_status") == "FAILED":
        checks.append({
            "check_id": "CHK_CIN_REGISTRY",
            "field_name": "cin",
            "title": "CIN Not Found in MCA Registry",
            "status": "DISCREPANCY",
            "severity": "CRITICAL",
            "match_score": 0.0,
            "values": {
                "form_cin": form_cin,
                "coi_extracted_cin": ext_coi_cin,
                "mca_error": mca_reg.get("error")
            },
            "explanation": f"CIN '{form_cin}' was not found or is struck off in the MCA Company Registry.",
            "recommended_action": "Disqualify vendor or request authentic MCA Master Data incorporation certificate."
        })
    else:
        checks.append({
            "check_id": "CHK_CIN_REGISTRY",
            "field_name": "cin",
            "title": "CIN Consistency Warning",
            "status": "WARNING",
            "severity": "MEDIUM",
            "match_score": 50.0,
            "values": {
                "form_cin": form_cin,
                "coi_extracted_cin": ext_coi_cin,
                "mca_notes": mca_reg.get("notes")
            },
            "explanation": "CIN formatting or registry verification returned cautionary flags.",
            "recommended_action": "Manual review of incorporation filing required."
        })

    # ==========================================
    # Check 4: Bank Account & IFSC Matching (Cheque vs Form)
    # ==========================================
    acc_clean_form = re.sub(r'\D', '', form_acc)
    acc_clean_cheque = re.sub(r'\D', '', ext_cheque_acc)
    acc_match = (not acc_clean_cheque) or (acc_clean_form == acc_clean_cheque)
    ifsc_match = (not ext_cheque_ifsc) or (form_ifsc == ext_cheque_ifsc)

    if acc_match and ifsc_match:
        checks.append({
            "check_id": "CHK_BANK_DETAILS",
            "field_name": "bank_account_number",
            "title": "Cheque & Form Bank Details Match",
            "status": "PASS",
            "severity": "LOW",
            "match_score": 100.0,
            "values": {
                "form_account": form_acc,
                "cheque_account": ext_cheque_acc,
                "form_ifsc": form_ifsc,
                "cheque_ifsc": ext_cheque_ifsc
            },
            "explanation": "Account number and IFSC code on cancelled cheque match submitted registration details perfectly.",
            "recommended_action": None
        })
    else:
        checks.append({
            "check_id": "CHK_BANK_DETAILS",
            "field_name": "bank_account_number",
            "title": "Bank Account/IFSC Mismatch on Cheque",
            "status": "DISCREPANCY",
            "severity": "HIGH",
            "match_score": 0.0,
            "values": {
                "form_account": form_acc,
                "cheque_account": ext_cheque_acc,
                "form_ifsc": form_ifsc,
                "cheque_ifsc": ext_cheque_ifsc
            },
            "explanation": f"Discrepancy between form bank details ({form_acc} / {form_ifsc}) and cancelled cheque ({ext_cheque_acc} / {ext_cheque_ifsc}).",
            "recommended_action": "Request clear cancelled cheque or bank verification letter matching submitted account."
        })

    # ==========================================
    # Check 5: Bank Beneficiary Name Match (Penny Drop vs Company Legal Name)
    # This is a critical check for discrepancy resolution!
    # ==========================================
    if bank_beneficiary:
        beneficiary_score = fuzz.token_sort_ratio(
            normalize_company_name(bank_beneficiary),
            normalize_company_name(form_company)
        )
        if beneficiary_score >= 80.0:
            checks.append({
                "check_id": "CHK_BENEFICIARY_NAME",
                "field_name": "bank_account_holder",
                "title": "Bank Beneficiary Name Match",
                "status": "PASS",
                "severity": "LOW",
                "match_score": beneficiary_score,
                "values": {
                    "registered_company_name": form_company,
                    "penny_drop_beneficiary": bank_beneficiary,
                    "account_status": bank_acc_status
                },
                "explanation": f"Penny-drop verification confirmed account active and beneficiary '{bank_beneficiary}' matches company legal name.",
                "recommended_action": None
            })
        else:
            checks.append({
                "check_id": "CHK_BENEFICIARY_NAME",
                "field_name": "bank_account_holder",
                "title": "Bank Beneficiary Name Discrepancy",
                "status": "DISCREPANCY",
                "severity": "HIGH",
                "match_score": beneficiary_score,
                "values": {
                    "registered_company_name": form_company,
                    "penny_drop_beneficiary": bank_beneficiary,
                    "account_status": bank_acc_status
                },
                "explanation": f"Destination bank returned beneficiary name '{bank_beneficiary}', which differs from legal corporate name '{form_company}'. This may indicate an individual director account rather than a corporate current account.",
                "recommended_action": "Issue follow-up to vendor requesting a Company Current Account cheque or Board Authorization."
            })
    elif bank_acc_status == "INVALID_OR_CLOSED":
        checks.append({
            "check_id": "CHK_BENEFICIARY_NAME",
            "field_name": "bank_account_number",
            "title": "Bank Account Invalid or Closed",
            "status": "DISCREPANCY",
            "severity": "CRITICAL",
            "match_score": 0.0,
            "values": {
                "account_number": form_acc,
                "ifsc": form_ifsc,
                "penny_drop_status": "FAILED"
            },
            "explanation": "Penny drop failed: Account does not exist, has invalid IFSC, or is marked closed/frozen by the destination bank.",
            "recommended_action": "Vendor must provide active corporate bank details."
        })

    # ==========================================
    # Check 6: Registered Address Comparison
    # ==========================================
    if form_addr and (ext_gst_addr or ext_coi_addr):
        norm_form_addr = normalize_address(form_addr)
        norm_other_addr = normalize_address(ext_gst_addr or ext_coi_addr)
        addr_score = fuzz.token_sort_ratio(norm_form_addr, norm_other_addr)
        
        if addr_score >= 65.0:
            checks.append({
                "check_id": "CHK_REGISTERED_ADDRESS",
                "field_name": "registered_address",
                "title": "Registered Address Consistency",
                "status": "PASS",
                "severity": "LOW",
                "match_score": addr_score,
                "values": {
                    "form_address": form_addr,
                    "verified_address": ext_gst_addr or ext_coi_addr
                },
                "explanation": f"Address matches with acceptable tolerance ({addr_score:.1f}% match) accounting for street/pin code formatting.",
                "recommended_action": None
            })
        else:
            checks.append({
                "check_id": "CHK_REGISTERED_ADDRESS",
                "field_name": "registered_address",
                "title": "Address Discrepancy",
                "status": "WARNING",
                "severity": "MEDIUM",
                "match_score": addr_score,
                "values": {
                    "form_address": form_addr,
                    "verified_address": ext_gst_addr or ext_coi_addr
                },
                "explanation": f"Address in registration form differs from GST/COI certificate ({addr_score:.1f}% match). May be a branch vs registered office difference.",
                "recommended_action": "Confirm if submitted address represents principal place of business or registered office."
            })

    return checks

