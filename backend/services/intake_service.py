import os
import uuid
import hashlib
from datetime import datetime
from database import get_db
from services.audit_service import log_audit

UPLOAD_BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
os.makedirs(UPLOAD_BASE, exist_ok=True)

def calculate_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()

def create_vendor_intake(form_data: dict, uploaded_files: dict) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    
    c_name = form_data.get("company_name", "").strip()
    cin_val = form_data.get("cin", "").strip().upper()
    pan_val = form_data.get("pan", "").strip().upper()
    timestamp = datetime.utcnow().isoformat() + "Z"

    # Enforce company uniqueness: check for existing vendor by name, CIN, or PAN to prevent duplicates
    cursor.execute("""
        SELECT vendor_id FROM vendors 
        WHERE (company_name != '' AND UPPER(company_name) = ?) 
           OR (cin != '' AND cin = ?) 
           OR (pan != '' AND pan = ?)
    """, (c_name.upper(), cin_val, pan_val))
    existing = cursor.fetchone()

    if existing:
        vendor_id = existing[0]
        # Update existing record and reset state for fresh verification run
        cursor.execute("""
            UPDATE vendors SET
                company_name = ?, cin = ?, pan = ?, gstin = ?, registered_address = ?,
                contact_person = ?, contact_email = ?, contact_phone = ?,
                bank_account_number = ?, bank_ifsc = ?, bank_name = ?,
                bank_account_holder = ?, status = 'PROCESSING', updated_at = ?
            WHERE vendor_id = ?
        """, (
            c_name, cin_val, pan_val, form_data.get("gstin", "").strip().upper(),
            form_data.get("registered_address", "").strip(),
            form_data.get("contact_person", "").strip(),
            form_data.get("contact_email", "").strip(),
            form_data.get("contact_phone", "").strip(),
            form_data.get("bank_account_number", "").strip(),
            form_data.get("bank_ifsc", "").strip().upper(),
            form_data.get("bank_name", "").strip(),
            form_data.get("bank_account_holder", "").strip(),
            timestamp,
            vendor_id
        ))
        cursor.execute("DELETE FROM documents WHERE vendor_id = ?", (vendor_id,))
        cursor.execute("DELETE FROM extracted_fields WHERE vendor_id = ?", (vendor_id,))
        cursor.execute("DELETE FROM verification_results WHERE vendor_id = ?", (vendor_id,))
        cursor.execute("DELETE FROM discrepancies WHERE vendor_id = ?", (vendor_id,))
        cursor.execute("DELETE FROM decisions WHERE vendor_id = ?", (vendor_id,))
    else:
        vendor_id = form_data.get("vendor_id") or f"VEN-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        cursor.execute("""
            INSERT INTO vendors (
                vendor_id, company_name, cin, pan, gstin, registered_address,
                contact_person, contact_email, contact_phone, bank_account_number,
                bank_ifsc, bank_name, bank_account_holder, status, risk_level, risk_score,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            vendor_id,
            c_name,
            cin_val,
            pan_val,
            form_data.get("gstin", "").strip().upper(),
            form_data.get("registered_address", "").strip(),
            form_data.get("contact_person", "").strip(),
            form_data.get("contact_email", "").strip(),
            form_data.get("contact_phone", "").strip(),
            form_data.get("bank_account_number", "").strip(),
            form_data.get("bank_ifsc", "").strip().upper(),
            form_data.get("bank_name", "").strip(),
            form_data.get("bank_account_holder", "").strip(),
            "PROCESSING",
            "LOW",
            0.0,
            timestamp,
            timestamp
        ))

    vendor_dir = os.path.join(UPLOAD_BASE, vendor_id)
    os.makedirs(vendor_dir, exist_ok=True)
    
    stored_docs = []
    
    # Save uploaded documents
    for doc_type, file_info in uploaded_files.items():
        # file_info: {'filename': str, 'content': bytes, 'mime_type': str}
        if not file_info or not file_info.get("content"):
            continue
        
        doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
        filename = file_info.get("filename", f"{doc_type.lower()}.pdf")
        content = file_info.get("content")
        file_hash = calculate_file_hash(content)
        mime_type = file_info.get("mime_type", "application/pdf")
        
        target_path = os.path.join(vendor_dir, f"{doc_type}_{filename}")
        with open(target_path, "wb") as f:
            f.write(content)
            
        cursor.execute("""
            INSERT INTO documents (
                document_id, vendor_id, document_type, file_name, file_path,
                file_hash, mime_type, classification_status, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            doc_id, vendor_id, doc_type, filename, target_path,
            file_hash, mime_type, "PENDING", timestamp
        ))
        
        stored_docs.append({
            "document_id": doc_id,
            "document_type": doc_type,
            "file_name": filename,
            "file_hash": file_hash
        })
        
    conn.commit()
    conn.close()
    
    log_audit(
        vendor_id=vendor_id,
        stage="VENDOR_INTAKE",
        action="INTAKE_COMPLETED",
        actor="VENDOR_PORTAL",
        previous_state=None,
        new_state="PROCESSING",
        details={
            "company_name": form_data.get("company_name"),
            "documents_uploaded": [d["document_type"] for d in stored_docs],
            "doc_count": len(stored_docs)
        }
    )
    
    return {
        "vendor_id": vendor_id,
        "company_name": form_data.get("company_name"),
        "documents": stored_docs,
        "status": "PROCESSING"
    }

def update_vendor_document(vendor_id: str, doc_type: str, file_info: dict) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    
    timestamp = datetime.utcnow().isoformat() + "Z"
    vendor_dir = os.path.join(UPLOAD_BASE, vendor_id)
    os.makedirs(vendor_dir, exist_ok=True)
    
    content = file_info.get("content")
    filename = file_info.get("filename", f"{doc_type.lower()}_updated.pdf")
    file_hash = calculate_file_hash(content)
    mime_type = file_info.get("mime_type", "application/pdf")
    
    target_path = os.path.join(vendor_dir, f"{doc_type}_UPDATED_{filename}")
    with open(target_path, "wb") as f:
        f.write(content)
        
    # Check if doc already exists
    cursor.execute("SELECT document_id, file_hash FROM documents WHERE vendor_id = ? AND document_type = ?", (vendor_id, doc_type))
    existing = cursor.fetchone()
    
    if existing:
        doc_id = existing[0]
        prev_hash = existing[1]
        cursor.execute("""
            UPDATE documents SET
                file_name = ?, file_path = ?, file_hash = ?, mime_type = ?,
                classification_status = 'PENDING', uploaded_at = ?
            WHERE document_id = ?
        """, (filename, target_path, file_hash, mime_type, timestamp, doc_id))
    else:
        doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
        prev_hash = None
        cursor.execute("""
            INSERT INTO documents (
                document_id, vendor_id, document_type, file_name, file_path,
                file_hash, mime_type, classification_status, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (doc_id, vendor_id, doc_type, filename, target_path, file_hash, mime_type, "PENDING", timestamp))
        
    cursor.execute("UPDATE vendors SET updated_at = ? WHERE vendor_id = ?", (timestamp, vendor_id))
    conn.commit()
    conn.close()
    
    log_audit(
        vendor_id=vendor_id,
        stage="DOCUMENT_UPDATE",
        action="DOCUMENT_REUPLOADED",
        actor="VENDOR_PORTAL",
        previous_state=prev_hash,
        new_state=file_hash,
        details={
            "document_id": doc_id,
            "document_type": doc_type,
            "new_filename": filename
        }
    )
    
    return {
        "document_id": doc_id,
        "vendor_id": vendor_id,
        "document_type": doc_type,
        "file_hash": file_hash
    }

