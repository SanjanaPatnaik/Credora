from typing import Dict, Any, List

def calculate_vendor_risk(
    classification_results: List[Dict[str, Any]],
    extraction_results: List[Dict[str, Any]],
    verification_results: Dict[str, Any],
    cross_checks: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Computes a rule-based composite risk score and risk level (LOW, MEDIUM, HIGH, CRITICAL).
    """
    findings = []
    base_score = 0.0
    
    # 1. Document Classification Findings
    for doc in classification_results:
        status = doc.get("classification_status")
        doc_type = doc.get("expected_type", "DOCUMENT")
        if status == "MISMATCH":
            findings.append({
                "source": "DOCUMENT_CLASSIFIER",
                "severity": "CRITICAL",
                "field": doc_type,
                "description": doc.get("explanation"),
                "score_impact": 35.0,
                "action": f"Reject invalid document and request genuine {doc_type.replace('_', ' ').title()}."
            })
            base_score += 35.0
        elif status == "UNCERTAIN":
            findings.append({
                "source": "DOCUMENT_CLASSIFIER",
                "severity": "MEDIUM",
                "field": doc_type,
                "description": f"Classification confidence is low for {doc_type}.",
                "score_impact": 10.0,
                "action": "Procurement officer manual scan inspection required."
            })
            base_score += 10.0

    # 2. Extracted Field Validation Findings
    for field in extraction_results:
        if field.get("format_valid") == 0:
            severity = "HIGH" if field.get("field_name") in ["pan_number", "gstin", "bank_account_number", "cin"] else "MEDIUM"
            impact = 20.0 if severity == "HIGH" else 10.0
            findings.append({
                "source": "EXTRACTION_VALIDATION",
                "severity": severity,
                "field": field.get("field_name"),
                "description": field.get("validation_error") or f"Invalid format for {field.get('field_name')}",
                "score_impact": impact,
                "action": "Review field extraction or request corrected document."
            })
            base_score += impact

    # 3. External API Verification Findings
    pan_v = verification_results.get("PAN_API", {})
    if pan_v.get("verification_status") == "FAILED":
        findings.append({
            "source": "PAN_VERIFICATION_API",
            "severity": "CRITICAL",
            "field": "pan",
            "description": pan_v.get("error") or "PAN not found or invalid on government database",
            "score_impact": 40.0,
            "action": "Disqualify submission until valid corporate PAN is furnished."
        })
        base_score += 40.0

    gst_v = verification_results.get("GST_API", {})
    if gst_v.get("verification_status") == "FAILED":
        findings.append({
            "source": "GST_VERIFICATION_API",
            "severity": "CRITICAL",
            "field": "gstin",
            "description": gst_v.get("error") or "GSTIN inactive, cancelled, or not registered",
            "score_impact": 40.0,
            "action": "Active GSTIN is mandatory for vendor onboarding."
        })
        base_score += 40.0

    bank_v = verification_results.get("PENNY_DROP", {})
    if bank_v.get("verification_status") == "FAILED":
        findings.append({
            "source": "MOCK_PENNY_DROP",
            "severity": "CRITICAL",
            "field": "bank_account_number",
            "description": bank_v.get("error") or "Bank penny drop failed: Account invalid or closed",
            "score_impact": 35.0,
            "action": "Vendor must provide active valid bank account."
        })
        base_score += 35.0

    cin_v = verification_results.get("MCA_REGISTRY", {})
    if cin_v.get("verification_status") == "FAILED":
        findings.append({
            "source": "MOCK_MCA_REGISTRY",
            "severity": "CRITICAL",
            "field": "cin",
            "description": cin_v.get("notes") or cin_v.get("error") or "CIN not found in MCA master database",
            "score_impact": 35.0,
            "action": "Vendor corporate existence cannot be verified."
        })
        base_score += 35.0

    # 4. Cross-Document Matching Findings
    for chk in cross_checks:
        status = chk.get("status")
        sev = chk.get("severity")
        if status == "DISCREPANCY":
            impact = 30.0 if sev == "CRITICAL" else (20.0 if sev == "HIGH" else 10.0)
            findings.append({
                "source": "CROSS_DOCUMENT_VERIFICATION",
                "severity": sev,
                "field": chk.get("field_name"),
                "description": chk.get("explanation"),
                "score_impact": impact,
                "action": chk.get("recommended_action")
            })
            base_score += impact
        elif status == "WARNING":
            findings.append({
                "source": "CROSS_DOCUMENT_VERIFICATION",
                "severity": "MEDIUM",
                "field": chk.get("field_name"),
                "description": chk.get("explanation"),
                "score_impact": 8.0,
                "action": chk.get("recommended_action")
            })
            base_score += 8.0

    # Determine Overall Risk Level with Rule-Based Overrides
    has_critical = any(f["severity"] == "CRITICAL" for f in findings)
    has_high = any(f["severity"] == "HIGH" for f in findings)
    has_medium = any(f["severity"] == "MEDIUM" for f in findings)

    # Risk score normalized to 0-100
    risk_score = min(100.0, round(base_score, 1))

    if has_critical or risk_score >= 60.0:
        risk_level = "CRITICAL"
    elif has_high or risk_score >= 35.0:
        risk_level = "HIGH"
    elif has_medium or risk_score >= 15.0:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "findings_count": len(findings),
        "findings": findings
    }

