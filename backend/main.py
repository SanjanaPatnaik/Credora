import os
import json
import uuid
import shutil
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from database import get_db, init_db
from sample_data_generator import (
    generate_all_sample_documents,
    SAMPLE_DOCS_DIR,
    create_pan_pdf,
    create_gst_pdf,
    create_cheque_pdf,
    create_coi_pdf
)
from services.intake_service import create_vendor_intake, update_vendor_document
from services.pipeline_service import execute_full_pipeline, re_verify_vendor_pipeline
from services.followup_service import (
    generate_followup_draft,
    update_followup_draft,
    send_followup_email,
    get_vendor_followup_history
)
from services.audit_service import get_vendor_audit_trail, log_audit

# Initialize DB and sample files on startup
init_db()
generate_all_sample_documents()

app = FastAPI(
    title="Credora — Vendor Verification & Onboarding API",
    description="Automated AI-assisted vendor verification, cross-document reconciliation, and automated discrepancy resolution.",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/sample_docs", StaticFiles(directory=SAMPLE_DOCS_DIR), name="sample_docs")

# Models for request bodies
class DecisionOverrideRequest(BaseModel):
    decision: str
    reviewer_name: str
    reviewer_comments: str

class UpdateFollowupRequest(BaseModel):
    subject: str
    email_content: str
    recipient_email: str

class DiscrepancyResolutionRequest(BaseModel):
    followup_id: Optional[str] = None
    field_name: str
    corrected_value: str
    resolution_notes: Optional[str] = "Corrected by vendor"
    use_sample_corrected_cheque: Optional[bool] = False

class DemoLoadRequest(BaseModel):
    scenario: str  # "HAPPY_PATH", "BENEFICIARY_MISMATCH", "CLASSIFICATION_MISMATCH"


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Credora Vendor Verification Engine", "version": "1.0.0"}


@app.get("/api/stats")
def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM vendors")
    total_vendors = cursor.fetchone()[0]

    cursor.execute("SELECT status, COUNT(*) FROM vendors GROUP BY status")
    status_counts = dict(cursor.fetchall())

    cursor.execute("SELECT risk_level, COUNT(*) FROM vendors GROUP BY risk_level")
    risk_counts = dict(cursor.fetchall())

    cursor.execute("SELECT COUNT(*) FROM discrepancies WHERE resolution_status = 'OPEN'")
    open_discrepancies = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM followup_history WHERE approval_status = 'APPROVED'")
    sent_followups = cursor.fetchone()[0]

    conn.close()
    return {
        "total_vendors": total_vendors,
        "status_counts": status_counts,
        "risk_counts": risk_counts,
        "open_discrepancies": open_discrepancies,
        "sent_followups": sent_followups
    }


@app.get("/api/vendors")
def list_vendors():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT v.*,
            (SELECT COUNT(*) FROM documents WHERE vendor_id = v.vendor_id) as doc_count,
            (SELECT COUNT(*) FROM discrepancies WHERE vendor_id = v.vendor_id AND resolution_status = 'OPEN') as open_disc_count
        FROM vendors v
        ORDER BY v.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/vendors/{vendor_id}")
def get_vendor_details(vendor_id: str):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM vendors WHERE vendor_id = ?", (vendor_id,))
    v_row = cursor.fetchone()
    if not v_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor = dict(v_row)

    # Documents
    cursor.execute("SELECT * FROM documents WHERE vendor_id = ? ORDER BY uploaded_at ASC", (vendor_id,))
    documents = [dict(d) for d in cursor.fetchall()]

    # Extracted fields
    cursor.execute("SELECT * FROM extracted_fields WHERE vendor_id = ?", (vendor_id,))
    extracted_fields = [dict(f) for f in cursor.fetchall()]

    # Verification results
    cursor.execute("SELECT * FROM verification_results WHERE vendor_id = ?", (vendor_id,))
    ver_results = []
    for r in cursor.fetchall():
        rd = dict(r)
        try:
            rd["response_details"] = json.loads(rd["response_details"]) if rd["response_details"] else {}
        except Exception:
            pass
        ver_results.append(rd)

    # Discrepancies
    cursor.execute("SELECT * FROM discrepancies WHERE vendor_id = ? ORDER BY created_at DESC", (vendor_id,))
    discrepancies = [dict(d) for d in cursor.fetchall()]

    # Decisions
    cursor.execute("SELECT * FROM decisions WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 1", (vendor_id,))
    dec_row = cursor.fetchone()
    decision = dict(dec_row) if dec_row else None

    # Follow-ups
    followups = get_vendor_followup_history(vendor_id)

    # Audit Trail
    audit_trail = get_vendor_audit_trail(vendor_id)

    conn.close()

    # Organize extracted fields by doc type for frontend convenience
    grouped_extracted = {}
    for f in extracted_fields:
        doc_type = f["document_type"]
        if doc_type not in grouped_extracted:
            grouped_extracted[doc_type] = {}
        grouped_extracted[doc_type][f["field_name"]] = f

    return {
        "vendor": vendor,
        "documents": documents,
        "extracted_fields": extracted_fields,
        "grouped_extracted": grouped_extracted,
        "verification_results": ver_results,
        "discrepancies": discrepancies,
        "decision": decision,
        "followups": followups,
        "audit_trail": audit_trail
    }


@app.post("/api/intake")
async def create_vendor_submission(
    company_name: str = Form(...),
    cin: str = Form(""),
    pan: str = Form(""),
    gstin: str = Form(""),
    registered_address: str = Form(""),
    contact_person: str = Form(""),
    contact_email: str = Form(""),
    contact_phone: str = Form(""),
    bank_account_number: str = Form(""),
    bank_ifsc: str = Form(""),
    bank_name: str = Form(""),
    bank_account_holder: str = Form(""),
    pan_card: Optional[UploadFile] = File(None),
    gst_certificate: Optional[UploadFile] = File(None),
    cancelled_cheque: Optional[UploadFile] = File(None),
    incorporation_certificate: Optional[UploadFile] = File(None)
):
    form_data = {
        "company_name": company_name,
        "cin": cin,
        "pan": pan,
        "gstin": gstin,
        "registered_address": registered_address,
        "contact_person": contact_person,
        "contact_email": contact_email,
        "contact_phone": contact_phone,
        "bank_account_number": bank_account_number,
        "bank_ifsc": bank_ifsc,
        "bank_name": bank_name,
        "bank_account_holder": bank_account_holder
    }

    uploaded_files = {}
    for doc_type, file_obj in [
        ("PAN_CARD", pan_card),
        ("GST_CERTIFICATE", gst_certificate),
        ("CANCELLED_CHEQUE", cancelled_cheque),
        ("INCORPORATION_CERTIFICATE", incorporation_certificate)
    ]:
        if file_obj and hasattr(file_obj, "filename") and file_obj.filename:
            content = await file_obj.read()
            if content:
                uploaded_files[doc_type] = {
                    "filename": file_obj.filename,
                    "content": content,
                    "mime_type": file_obj.content_type or "application/pdf"
                }

    # Only genuine uploaded documents are ingested; any omitted mandatory document
    # will be flagged as a compliance discrepancy during pipeline execution.

    # 1. Intake
    intake_res = create_vendor_intake(form_data, uploaded_files)
    vendor_id = intake_res["vendor_id"]

    # 2. Execute full verification pipeline
    pipeline_res = execute_full_pipeline(vendor_id)

    return {
        "success": True,
        "vendor_id": vendor_id,
        "pipeline": pipeline_res
    }


@app.post("/api/intake/demo-load")
def load_demo_vendor_scenario(payload: DemoLoadRequest):
    """
    1-Click Demo Loader for testing the Happy Path or Edge Cases instantly.
    """
    scenario = payload.scenario.upper()

    if scenario == "HAPPY_PATH":
        vendor_id = f"VEN-ACME-{uuid.uuid4().hex[:4].upper()}"
        form_data = {
            "vendor_id": vendor_id,
            "company_name": "Acme Technologies Private Limited",
            "cin": "U72900KA2020PTC134567",
            "pan": "AABCA1234C",
            "gstin": "29AABCA1234C1Z5",
            "registered_address": "Plot 42, Electronics City Phase 1, Hosur Road, Bengaluru, Karnataka 560100",
            "contact_person": "Aditya Sharma",
            "contact_email": "aditya.sharma@acmetech.com",
            "contact_phone": "+91 98765 43210",
            "bank_account_number": "987654321012",
            "bank_ifsc": "HDFC0000128",
            "bank_name": "HDFC Bank",
            "bank_account_holder": "Acme Technologies Private Limited"
        }
        source_dir = os.path.join(SAMPLE_DOCS_DIR, "happy_path")
        file_map = {
            "PAN_CARD": ("pan_card.pdf", "pan_card.pdf"),
            "GST_CERTIFICATE": ("gst_certificate.pdf", "gst_certificate.pdf"),
            "CANCELLED_CHEQUE": ("cancelled_cheque.pdf", "cancelled_cheque.pdf"),
            "INCORPORATION_CERTIFICATE": ("incorporation_certificate.pdf", "incorporation_certificate.pdf")
        }

    elif scenario == "BENEFICIARY_MISMATCH":
        # Edge Case 1: Primary USP Demo (Cheque has individual Rajesh Kumar instead of Vertex Solutions)
        vendor_id = f"VEN-VERTEX-{uuid.uuid4().hex[:4].upper()}"
        form_data = {
            "vendor_id": vendor_id,
            "company_name": "Vertex Solutions Private Limited",
            "cin": "U72200MH2019PTC321980",
            "pan": "AABCV5678C",
            "gstin": "27AABCV5678C1Z2",
            "registered_address": "Unit 502, B-Wing, Nesco IT Park, Western Express Highway, Goregaon East, Mumbai, Maharashtra 400063",
            "contact_person": "Rajesh Kumar",
            "contact_email": "rajesh.kumar@vertexsol.in",
            "contact_phone": "+91 98111 22334",
            "bank_account_number": "501004329999",
            "bank_ifsc": "ICIC0001820",
            "bank_name": "ICICI Bank",
            "bank_account_holder": "Vertex Solutions Private Limited"
        }
        source_dir = os.path.join(SAMPLE_DOCS_DIR, "edge_case_beneficiary_mismatch")
        file_map = {
            "PAN_CARD": ("pan_card.pdf", "pan_card.pdf"),
            "GST_CERTIFICATE": ("gst_certificate.pdf", "gst_certificate.pdf"),
            "CANCELLED_CHEQUE": ("cancelled_cheque.pdf", "cancelled_cheque.pdf"),
            "INCORPORATION_CERTIFICATE": ("incorporation_certificate.pdf", "incorporation_certificate.pdf")
        }

    elif scenario == "CLASSIFICATION_MISMATCH":
        # Edge Case 2: Wrong Document Uploaded (Electricity Bill uploaded in place of GST certificate)
        vendor_id = f"VEN-NEXUS-{uuid.uuid4().hex[:4].upper()}"
        form_data = {
            "vendor_id": vendor_id,
            "company_name": "Nexus Innovations Private Limited",
            "cin": "U74999DL2018PTC335412",
            "pan": "AABCN9988C",
            "gstin": "06AABCN9988C1Z1",
            "registered_address": "Tower C, 4th Floor, DLF Cyber City, DLF Phase 2, Gurugram, Haryana 122002",
            "contact_person": "Vikramaditya Rao",
            "contact_email": "vikram@nexusinno.com",
            "contact_phone": "+91 99000 11223",
            "bank_account_number": "409218290123",
            "bank_ifsc": "SBIN0004021",
            "bank_name": "State Bank of India",
            "bank_account_holder": "Nexus Innovations Private Limited"
        }
        source_dir = os.path.join(SAMPLE_DOCS_DIR, "happy_path")
        mismatch_dir = os.path.join(SAMPLE_DOCS_DIR, "edge_case_classification_mismatch")
        file_map = {
            "PAN_CARD": (os.path.join(source_dir, "pan_card.pdf"), "pan_card.pdf"),
            # Upload electricity bill instead of GST certificate!
            "GST_CERTIFICATE": (os.path.join(mismatch_dir, "invalid_electricity_bill.pdf"), "state_electricity_bill.pdf"),
            "CANCELLED_CHEQUE": (os.path.join(source_dir, "cancelled_cheque.pdf"), "cancelled_cheque.pdf"),
            "INCORPORATION_CERTIFICATE": (os.path.join(source_dir, "incorporation_certificate.pdf"), "incorporation_certificate.pdf")
        }
    else:
        raise HTTPException(status_code=400, detail="Unknown scenario")

    uploaded_files = {}
    for doc_type, (f_source, filename) in file_map.items():
        src_path = f_source if os.path.isabs(f_source) else os.path.join(source_dir, f_source)
        if os.path.exists(src_path):
            with open(src_path, "rb") as f:
                uploaded_files[doc_type] = {
                    "filename": filename,
                    "content": f.read(),
                    "mime_type": "application/pdf"
                }

    intake_res = create_vendor_intake(form_data, uploaded_files)
    vendor_id = intake_res["vendor_id"]
    pipeline_res = execute_full_pipeline(vendor_id)

    return {
        "success": True,
        "vendor_id": vendor_id,
        "scenario": scenario,
        "pipeline": pipeline_res
    }


@app.post("/api/vendors/{vendor_id}/re-verify")
def re_verify_vendor(vendor_id: str):
    res = re_verify_vendor_pipeline(vendor_id)
    return {"success": True, "vendor_id": vendor_id, "pipeline": res}


@app.post("/api/vendors/{vendor_id}/discrepancies/generate-followup")
def create_followup_for_vendor(vendor_id: str):
    """
    Primary USP Step 1: Generates a personalized follow-up email draft based on open discrepancies.
    """
    try:
        draft = generate_followup_draft(vendor_id)
        return {"success": True, "draft": draft}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/followups/{followup_id}")
def edit_followup_email(followup_id: str, payload: UpdateFollowupRequest):
    """
    Primary USP Step 2: Allows procurement officer to review and edit draft.
    """
    try:
        updated = update_followup_draft(
            followup_id,
            payload.subject,
            payload.email_content,
            payload.recipient_email
        )
        return {"success": True, "followup": updated}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/followups/{followup_id}/send")
def send_followup(followup_id: str, reviewer_name: str = "Procurement Officer"):
    """
    Primary USP Step 3: Officer approves and dispatches follow-up email.
    """
    try:
        res = send_followup_email(followup_id, reviewer_name)
        return {"success": True, "result": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/vendors/{vendor_id}/resolve-discrepancy")
async def resolve_discrepancy_and_reverify(vendor_id: str, request: Request):
    """
    Primary USP Step 4 & 5:
    Records vendor's updated information, resolves discrepancy,
    updates the specified document (PAN, GST, Cheque, or COI) via uploaded file or verified sample,
    and re-runs the affected verification checks!
    """
    content_type = request.headers.get("content-type", "")
    uploaded_file = None
    if "multipart/form-data" in content_type:
        form = await request.form()
        field_name = form.get("field_name", "bank_account_holder")
        corrected_value = form.get("corrected_value", "")
        resolution_notes = form.get("resolution_notes", "")
        doc_type = form.get("doc_type", "CANCELLED_CHEQUE")
        use_sample = str(form.get("use_sample_corrected_cheque", "false")).lower() in ["true", "1"]
        uploaded_file = form.get("file")
    else:
        body = await request.json()
        field_name = body.get("field_name", "bank_account_holder")
        corrected_value = body.get("corrected_value", "")
        resolution_notes = body.get("resolution_notes", "")
        doc_type = body.get("doc_type", "CANCELLED_CHEQUE")
        use_sample = body.get("use_sample_corrected_cheque", False)

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM vendors WHERE vendor_id = ?", (vendor_id,))
    v_row = cursor.fetchone()
    if not v_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor = dict(v_row)

    # 1. Update document if file uploaded or use verified template
    if uploaded_file and hasattr(uploaded_file, "filename") and uploaded_file.filename:
        file_bytes = await uploaded_file.read()
        if file_bytes:
            update_vendor_document(vendor_id, doc_type, {
                "filename": uploaded_file.filename,
                "content": file_bytes,
                "mime_type": uploaded_file.content_type or "application/pdf"
            })
    elif use_sample or not uploaded_file:
        temp_dir = os.path.join(SAMPLE_DOCS_DIR, f"temp_{uuid.uuid4().hex[:6]}")
        os.makedirs(temp_dir, exist_ok=True)
        try:
            if doc_type == "CANCELLED_CHEQUE":
                sample_corrected_cheque = os.path.join(SAMPLE_DOCS_DIR, "edge_case_beneficiary_mismatch", "cancelled_cheque_CORRECTED.pdf")
                if os.path.exists(sample_corrected_cheque):
                    with open(sample_corrected_cheque, "rb") as f:
                        file_bytes = f.read()
                else:
                    chq_path = os.path.join(temp_dir, "cheque_verified.pdf")
                    create_cheque_pdf(chq_path, "501004321111", vendor.get("bank_ifsc", "ICIC0001820"), vendor.get("bank_name", "ICICI Bank"), vendor.get("company_name"))
                    with open(chq_path, "rb") as f:
                        file_bytes = f.read()
                update_vendor_document(vendor_id, "CANCELLED_CHEQUE", {
                    "filename": f"{vendor['company_name'][:12].replace(' ', '_')}_CORRECTED_Cheque.pdf",
                    "content": file_bytes,
                    "mime_type": "application/pdf"
                })
            elif doc_type == "PAN_CARD":
                p_path = os.path.join(temp_dir, "pan_verified.pdf")
                create_pan_pdf(p_path, corrected_value or vendor.get("pan", "AABCV5678C"), vendor.get("company_name"))
                with open(p_path, "rb") as f:
                    file_bytes = f.read()
                update_vendor_document(vendor_id, "PAN_CARD", {
                    "filename": f"{vendor['company_name'][:12].replace(' ', '_')}_CORRECTED_PAN.pdf",
                    "content": file_bytes,
                    "mime_type": "application/pdf"
                })
            elif doc_type == "GST_CERTIFICATE":
                g_path = os.path.join(temp_dir, "gst_verified.pdf")
                create_gst_pdf(g_path, corrected_value or vendor.get("gstin", "27AABCV5678C1Z2"), vendor.get("company_name"), vendor.get("company_name"), vendor.get("registered_address", "Mumbai, Maharashtra"))
                with open(g_path, "rb") as f:
                    file_bytes = f.read()
                update_vendor_document(vendor_id, "GST_CERTIFICATE", {
                    "filename": f"{vendor['company_name'][:12].replace(' ', '_')}_CORRECTED_GST.pdf",
                    "content": file_bytes,
                    "mime_type": "application/pdf"
                })
            elif doc_type == "INCORPORATION_CERTIFICATE":
                c_path = os.path.join(temp_dir, "coi_verified.pdf")
                create_coi_pdf(c_path, corrected_value or vendor.get("cin", "U72200MH2019PTC321980"), vendor.get("company_name"), "15/07/2019", vendor.get("registered_address", "Mumbai, Maharashtra"))
                with open(c_path, "rb") as f:
                    file_bytes = f.read()
                update_vendor_document(vendor_id, "INCORPORATION_CERTIFICATE", {
                    "filename": f"{vendor['company_name'][:12].replace(' ', '_')}_CORRECTED_COI.pdf",
                    "content": file_bytes,
                    "mime_type": "application/pdf"
                })
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    # 2. Update vendor record if appropriate
    now_ts = datetime.utcnow().isoformat() + "Z"
    if doc_type == "CANCELLED_CHEQUE" or field_name in ["bank_account_holder", "bank_account_number", "cancelled_cheque"]:
        holder_val = corrected_value if corrected_value else vendor.get("company_name")
        cursor.execute("""
            UPDATE vendors SET
                bank_account_holder = ?,
                bank_account_number = ?,
                updated_at = ?
            WHERE vendor_id = ?
        """, (holder_val, "501004321111", now_ts, vendor_id))
    elif doc_type == "PAN_CARD" and corrected_value:
        cursor.execute("UPDATE vendors SET pan = ?, updated_at = ? WHERE vendor_id = ?", (corrected_value, now_ts, vendor_id))
    elif doc_type == "GST_CERTIFICATE" and corrected_value:
        cursor.execute("UPDATE vendors SET gstin = ?, updated_at = ? WHERE vendor_id = ?", (corrected_value, now_ts, vendor_id))
    elif doc_type == "INCORPORATION_CERTIFICATE" and corrected_value:
        cursor.execute("UPDATE vendors SET cin = ?, updated_at = ? WHERE vendor_id = ?", (corrected_value, now_ts, vendor_id))

    # 3. Mark matching discrepancies resolved
    fields_to_resolve = [field_name] if field_name else []
    doc_field_map = {
        "CANCELLED_CHEQUE": ["bank_account_holder", "bank_account_number", "cancelled_cheque"],
        "PAN_CARD": ["pan", "pan_card", "company_name"],
        "GST_CERTIFICATE": ["gstin", "gst_certificate", "registered_address"],
        "INCORPORATION_CERTIFICATE": ["cin", "incorporation_certificate", "company_name"]
    }
    for f in doc_field_map.get(doc_type, []):
        if f not in fields_to_resolve:
            fields_to_resolve.append(f)

    for fld in fields_to_resolve:
        cursor.execute("""
            UPDATE discrepancies SET
                resolution_status = 'RESOLVED',
                resolution_notes = ?,
                resolved_at = ?
            WHERE vendor_id = ? AND field_name = ?
        """, (
            resolution_notes or f"Vendor furnished updated {doc_type.replace('_', ' ').title()} documentation",
            now_ts,
            vendor_id,
            fld
        ))

    conn.commit()
    conn.close()

    log_audit(
        vendor_id=vendor_id,
        stage="DISCREPANCY_RESOLUTION",
        action="VENDOR_CORRECTION_SUBMITTED",
        actor="VENDOR_PORTAL",
        previous_state="DISCREPANCY_FLAGGED",
        new_state="RESOLVED",
        details={
            "document_type": doc_type,
            "field_name": field_name,
            "corrected_value": corrected_value,
            "notes": resolution_notes
        }
    )

    # 4. Re-verify affected checks in pipeline
    pipeline_res = re_verify_vendor_pipeline(vendor_id, fields_to_resolve)

    return {
        "success": True,
        "message": f"Document '{doc_type}' updated and discrepancy resolved. Verification pipeline executed.",
        "pipeline": pipeline_res
    }


@app.post("/api/vendors/{vendor_id}/decision")
def manual_decision_override(vendor_id: str, payload: DecisionOverrideRequest):
    """
    Allows procurement officer to manually override decision (e.g. Approved with condition).
    """
    conn = get_db()
    cursor = conn.cursor()
    dec_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.utcnow().isoformat() + "Z"

    cursor.execute("""
        INSERT INTO decisions (
            decision_id, vendor_id, risk_score, risk_level, decision,
            rationale, reviewer_name, reviewer_comments, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        dec_id, vendor_id, 0.0, "LOW" if payload.decision == "APPROVED" else "HIGH",
        payload.decision, "Manual Procurement Officer Override",
        payload.reviewer_name, payload.reviewer_comments, timestamp
    ))

    cursor.execute("""
        UPDATE vendors SET
            status = ?,
            updated_at = ?
        WHERE vendor_id = ?
    """, (payload.decision, timestamp, vendor_id))

    conn.commit()
    conn.close()

    log_audit(
        vendor_id=vendor_id,
        stage="DECISION_OVERRIDE",
        action="MANUAL_DECISION_SUBMITTED",
        actor=payload.reviewer_name,
        previous_state=None,
        new_state=payload.decision,
        details={
            "decision": payload.decision,
            "comments": payload.reviewer_comments
        }
    )

    return {"success": True, "decision_id": dec_id, "status": payload.decision}


@app.delete("/api/vendors/{vendor_id}")
def delete_vendor_record(vendor_id: str):
    """
    Deletes a vendor and all its associated documents, extractions, verifications,
    discrepancies, decisions, followups, and audit history.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT vendor_id, company_name FROM vendors WHERE vendor_id = ?", (vendor_id,))
    v = cursor.fetchone()
    if not v:
        conn.close()
        raise HTTPException(status_code=404, detail="Vendor not found")

    company_name = v["company_name"]

    # Delete all associated data
    cursor.execute("DELETE FROM documents WHERE vendor_id = ?", (vendor_id,))
    cursor.execute("DELETE FROM extracted_fields WHERE vendor_id = ?", (vendor_id,))
    cursor.execute("DELETE FROM verification_results WHERE vendor_id = ?", (vendor_id,))
    cursor.execute("DELETE FROM discrepancies WHERE vendor_id = ?", (vendor_id,))
    cursor.execute("DELETE FROM decisions WHERE vendor_id = ?", (vendor_id,))
    cursor.execute("DELETE FROM followup_history WHERE vendor_id = ?", (vendor_id,))
    cursor.execute("DELETE FROM audit_logs WHERE vendor_id = ?", (vendor_id,))
    cursor.execute("DELETE FROM vendors WHERE vendor_id = ?", (vendor_id,))

    conn.commit()
    conn.close()

    # Also clean up uploaded directory if it exists
    uploads_dir = os.path.join(os.path.dirname(__file__), "data", "uploads", vendor_id)
    if os.path.exists(uploads_dir):
        shutil.rmtree(uploads_dir, ignore_errors=True)

    return {"success": True, "message": f"Vendor '{company_name}' ({vendor_id}) deleted successfully"}


# Serve built frontend if available
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend_assets")

    @app.get("/")
    def serve_frontend_index():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}")
    def serve_spa_fallback(full_path: str):
        # Allow api, uploads, sample_docs to pass through
        if full_path.startswith("api") or full_path.startswith("uploads") or full_path.startswith("sample_docs"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
