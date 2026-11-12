import os
import json
import uuid
from datetime import datetime
from database import get_db

from services.ocr_service import extract_text_from_pdf
from services.document_classifier import classify_document
from services.extraction_service import extract_document_fields
from services.pan_verifier import verify_pan
from services.gst_verifier import verify_gst
from services.bank_verifier import verify_bank_penny_drop
from services.cin_verifier import verify_cin_mca
from services.matching_service import run_cross_document_matching
from services.risk_service import calculate_vendor_risk
from services.decision_service import generate_onboarding_decision
from services.audit_service import log_audit

def execute_full_pipeline(vendor_id: str) -> dict:
    """
    Executes the full 7-stage verification pipeline for a vendor.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM vendors WHERE vendor_id = ?", (vendor_id,))
    v_row = cursor.fetchone()
    if not v_row:
        conn.close()
        raise ValueError(f"Vendor '{vendor_id}' not found")
    vendor = dict(v_row)

    cursor.execute("SELECT * FROM documents WHERE vendor_id = ?", (vendor_id,))
    doc_rows = cursor.fetchall()
    documents = [dict(d) for d in doc_rows]
    conn.close()

    # Pipeline tracking state
    pipeline_state = {
        "vendor_id": vendor_id,
        "stages": {},
        "started_at": datetime.utcnow().isoformat() + "Z"
    }

    # ==============================================================
    # Stage 2: Document Processing (Classification, OCR & Extraction)
    # ==============================================================
    classification_results = []
    all_extracted_fields = []
    nested_extracted = {}

    for doc in documents:
        doc_id = doc["document_id"]
        doc_type = doc["document_type"]
        file_path = doc["file_path"]

        # 2.2 PyMuPDF Text Extraction
        ocr_res = extract_text_from_pdf(file_path)
        full_text = ocr_res.get("full_text", "")

        # 2.1 Classification
        cls_res = classify_document(full_text, doc_type)
        classification_results.append(cls_res)

        # Update document in DB
        conn = get_db()
        c = conn.cursor()
        c.execute("""
            UPDATE documents SET
                classified_type = ?,
                classification_status = ?,
                classification_confidence = ?,
                classification_notes = ?
            WHERE document_id = ?
        """, (
            cls_res["classified_type"],
            cls_res["classification_status"],
            cls_res["classification_confidence"],
            cls_res["explanation"],
            doc_id
        ))

        # 2.3 & 2.4 Field Extraction & Validation
        fields = extract_document_fields(doc_type, full_text)
        nested_extracted[doc_type] = {}

        # Delete any previous extractions for re-runs
        c.execute("DELETE FROM extracted_fields WHERE document_id = ?", (doc_id,))

        for f in fields:
            f_id = f"FLD-{uuid.uuid4().hex[:8].upper()}"
            c.execute("""
                INSERT INTO extracted_fields (
                    field_id, vendor_id, document_id, document_type, field_name,
                    extracted_value, confidence, source_page, format_valid, validation_error, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f_id, vendor_id, doc_id, doc_type, f["field_name"],
                f["extracted_value"], f["confidence"], 1, f["format_valid"],
                f.get("validation_error"), f.get("notes")
            ))
            f_entry = dict(f)
            f_entry["field_id"] = f_id
            f_entry["document_id"] = doc_id
            all_extracted_fields.append(f_entry)
            nested_extracted[doc_type][f["field_name"]] = f_entry

        conn.commit()
        conn.close()

    log_audit(
        vendor_id=vendor_id,
        stage="DOCUMENT_PROCESSING",
        action="EXTRACTION_COMPLETED",
        actor="OCR_ENGINE",
        previous_state=None,
        new_state="EXTRACTED",
        details={
            "documents_processed": len(documents),
            "fields_extracted": len(all_extracted_fields)
        }
    )

    pipeline_state["stages"]["STAGE_2_DOC_PROCESSING"] = {
        "status": "COMPLETED",
        "classification": classification_results,
        "fields_count": len(all_extracted_fields)
    }

    # ==============================================================
    # Stage 3: Individual Document Verification
    # ==============================================================
    # 3.1 PAN
    pan_to_check = vendor.get("pan") or (nested_extracted.get("PAN_CARD", {}).get("pan_number", {}).get("extracted_value"))
    pan_res = verify_pan(pan_to_check, vendor.get("company_name"))
    
    # 3.2 GST
    gst_to_check = vendor.get("gstin") or (nested_extracted.get("GST_CERTIFICATE", {}).get("gstin", {}).get("extracted_value"))
    gst_res = verify_gst(gst_to_check, vendor.get("company_name"), vendor.get("registered_address"))

    # 3.3 Bank Penny Drop
    acc_to_check = vendor.get("bank_account_number") or (nested_extracted.get("CANCELLED_CHEQUE", {}).get("bank_account_number", {}).get("extracted_value"))
    ifsc_to_check = vendor.get("bank_ifsc") or (nested_extracted.get("CANCELLED_CHEQUE", {}).get("bank_ifsc", {}).get("extracted_value"))
    holder_cheque = nested_extracted.get("CANCELLED_CHEQUE", {}).get("bank_account_holder", {}).get("extracted_value", "")
    bank_res = verify_bank_penny_drop(acc_to_check, ifsc_to_check, vendor.get("company_name"), holder_cheque)

    # 3.4 CIN Mock MCA Registry
    cin_to_check = vendor.get("cin") or (nested_extracted.get("INCORPORATION_CERTIFICATE", {}).get("cin", {}).get("extracted_value"))
    cin_res = verify_cin_mca(cin_to_check, vendor.get("company_name"))

    verification_map = {
        "PAN_API": pan_res,
        "GST_API": gst_res,
        "PENNY_DROP": bank_res,
        "MCA_REGISTRY": cin_res
    }

    # Store verification results in DB
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM verification_results WHERE vendor_id = ?", (vendor_id,))
    
    for v_type, v_data in verification_map.items():
        v_id = f"VER-{uuid.uuid4().hex[:8].upper()}"
        c.execute("""
            INSERT INTO verification_results (
                verification_id, vendor_id, verification_type, verification_status,
                is_simulated, source_provider, response_details, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            v_id, vendor_id, v_type, v_data.get("verification_status", "PENDING"),
            1 if v_data.get("is_simulated", True) else 0,
            v_data.get("source_provider"),
            json.dumps(v_data.get("response_details", v_data)),
            datetime.utcnow().isoformat() + "Z"
        ))
    conn.commit()
    conn.close()

    log_audit(
        vendor_id=vendor_id,
        stage="INDIVIDUAL_VERIFICATION",
        action="VERIFICATIONS_COMPLETED",
        actor="EXTERNAL_VERIFIERS",
        previous_state=None,
        new_state="VERIFIED",
        details={
            "pan_status": pan_res.get("verification_status"),
            "gst_status": gst_res.get("verification_status"),
            "bank_status": bank_res.get("verification_status"),
            "cin_status": cin_res.get("verification_status")
        }
    )

    pipeline_state["stages"]["STAGE_3_INDIVIDUAL_VERIFICATION"] = {
        "status": "COMPLETED",
        "results": {
            "PAN": pan_res.get("verification_status"),
            "GST": gst_res.get("verification_status"),
            "BANK": bank_res.get("verification_status"),
            "MCA": cin_res.get("verification_status")
        }
    }

    # ==============================================================
    # Stage 4: Cross-Document Verification
    # ==============================================================
    cross_checks = run_cross_document_matching(vendor, nested_extracted, verification_map, classification_results)
    
    # Store detected discrepancies in DB
    conn = get_db()
    c = conn.cursor()
    # Keep previously resolved discrepancies so history is not lost
    c.execute("SELECT discrepancy_id, field_name, resolution_status FROM discrepancies WHERE vendor_id = ?", (vendor_id,))
    existing_disc = {row["field_name"]: row["resolution_status"] for row in c.fetchall()}

    discrepancies_to_record = []
    for chk in cross_checks:
        if chk["status"] in ["DISCREPANCY", "WARNING"]:
            f_name = chk["field_name"]
            prev_status = existing_disc.get(f_name, "OPEN")
            
            disc_id = f"DISC-{uuid.uuid4().hex[:8].upper()}"
            sub_val = str(chk.get("values", {}).get("detected_document") or chk.get("values", {}).get("form") or chk.get("values", {}).get("form_pan") or chk.get("values", {}).get("registered_company_name") or chk.get("values", {}).get("form_account") or "")
            ver_val = str(chk.get("values", {}).get("expected_document") or chk.get("values", {}).get("mca_registry") or chk.get("values", {}).get("pan_card") or chk.get("values", {}).get("penny_drop_beneficiary") or chk.get("values", {}).get("cheque_account") or "")
            
            # If not already present
            c.execute("SELECT discrepancy_id FROM discrepancies WHERE vendor_id = ? AND field_name = ?", (vendor_id, f_name))
            d_exists = c.fetchone()
            if not d_exists:
                c.execute("""
                    INSERT INTO discrepancies (
                        discrepancy_id, vendor_id, field_name, submitted_value,
                        verified_value, source_documents, severity, impact,
                        recommended_action, resolution_status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    disc_id, vendor_id, f_name, sub_val, ver_val,
                    json.dumps(list(chk.get("values", {}).keys())),
                    chk["severity"], chk["explanation"], chk.get("recommended_action"),
                    prev_status, datetime.utcnow().isoformat() + "Z"
                ))
            discrepancies_to_record.append(chk)

    conn.commit()
    conn.close()

    pipeline_state["stages"]["STAGE_4_CROSS_DOCUMENT"] = {
        "status": "COMPLETED",
        "total_checks": len(cross_checks),
        "discrepancies_flagged": len(discrepancies_to_record)
    }

    # ==============================================================
    # Stage 5: Risk Assessment
    # ==============================================================
    risk_assessment = calculate_vendor_risk(
        classification_results,
        all_extracted_fields,
        verification_map,
        cross_checks
    )

    pipeline_state["stages"]["STAGE_5_RISK_ASSESSMENT"] = {
        "status": "COMPLETED",
        "risk_level": risk_assessment["risk_level"],
        "risk_score": risk_assessment["risk_score"],
        "findings_count": risk_assessment["findings_count"]
    }

    # ==============================================================
    # Stage 6: Decision and Action
    # ==============================================================
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM discrepancies WHERE vendor_id = ?", (vendor_id,))
    stored_discs = [dict(r) for r in c.fetchall()]
    conn.close()

    decision_res = generate_onboarding_decision(vendor_id, risk_assessment, stored_discs)

    pipeline_state["stages"]["STAGE_6_DECISION"] = {
        "status": "COMPLETED",
        "decision": decision_res["decision"],
        "risk_level": decision_res["risk_level"],
        "rationale": decision_res["rationale"]
    }

    pipeline_state["completed_at"] = datetime.utcnow().isoformat() + "Z"
    return pipeline_state


def re_verify_vendor_pipeline(vendor_id: str, resolved_fields: list = None) -> dict:
    """
    Primary USP: Re-runs verification checks after vendor has submitted updated details or documents!
    Updates resolved discrepancies, recalculates risk and decision.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    if resolved_fields:
        for field in resolved_fields:
            cursor.execute("""
                UPDATE discrepancies
                SET resolution_status = 'RESOLVED', resolved_at = ?
                WHERE vendor_id = ? AND field_name = ?
            """, (timestamp, vendor_id, field))
    else:
        cursor.execute("""
            UPDATE discrepancies
            SET resolution_status = 'RESOLVED', resolved_at = ?
            WHERE vendor_id = ? AND resolution_status = 'OPEN'
        """, (timestamp, vendor_id))

    conn.commit()
    conn.close()

    log_audit(
        vendor_id=vendor_id,
        stage="RE_VERIFICATION",
        action="REVERIFY_REQUESTED",
        actor="SYSTEM_PIPELINE",
        previous_state="DISCREPANCY_OPEN",
        new_state="RE_VERIFYING",
        details={"resolved_fields": resolved_fields or "ALL"}
    )

    # Re-run full pipeline with newly submitted or updated data
    res = execute_full_pipeline(vendor_id)
    return res

