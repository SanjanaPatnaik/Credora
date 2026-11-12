import uuid
import json
from datetime import datetime
from database import get_db
from services.audit_service import log_audit

def generate_followup_draft(vendor_id: str, discrepancy_ids: list = None) -> dict:
    conn = get_db()
    cursor = conn.cursor()

    # Get vendor info
    cursor.execute("SELECT * FROM vendors WHERE vendor_id = ?", (vendor_id,))
    v_row = cursor.fetchone()
    if not v_row:
        conn.close()
        raise ValueError(f"Vendor {vendor_id} not found")
    vendor = dict(v_row)

    # Get discrepancies
    if discrepancy_ids and len(discrepancy_ids) > 0:
        placeholders = ','.join('?' for _ in discrepancy_ids)
        cursor.execute(f"SELECT * FROM discrepancies WHERE vendor_id = ? AND discrepancy_id IN ({placeholders})", [vendor_id] + discrepancy_ids)
    else:
        cursor.execute("SELECT * FROM discrepancies WHERE vendor_id = ? AND resolution_status = 'OPEN'", (vendor_id,))
    
    disc_rows = cursor.fetchall()
    discrepancies = [dict(r) for r in disc_rows]

    if not discrepancies:
        conn.close()
        return {
            "status": "NO_DISCREPANCIES",
            "message": "No open discrepancies found for this vendor."
        }

    recipient_email = vendor.get("contact_email") or "procurement@vendor.com"
    contact_person = vendor.get("contact_person") or "Vendor Representative"
    company_name = vendor.get("company_name") or "Your Organization"

    # Construct dynamic email subject & content
    subject = f"Action Required: Information Verification Update — {company_name} (ID: {vendor_id})"
    
    items_text = []
    for idx, d in enumerate(discrepancies, 1):
        f_name = d.get('field_name', '').replace('_', ' ').title()
        sub_val = d.get('submitted_value') or 'N/A'
        ver_val = d.get('verified_value') or 'N/A'
        impact = d.get('impact') or d.get('recommended_action') or 'Please provide clarification'
        
        items_text.append(
            f"Item {idx}: {f_name}\n"
            f"  • Submitted / Form Value: {sub_val}\n"
            f"  • Verification Finding:   {ver_val}\n"
            f"  • Action Required:       {impact}\n"
        )

    discrepancy_summary = "\n".join(items_text)

    email_body = f"""Dear {contact_person},

Thank you for your onboarding submission for {company_name} (Vendor ID: {vendor_id}).

During our automated verification pipeline checks, our compliance system identified specific items requiring your clarification or revised documentation:

--------------------------------------------------------------------------------
{discrepancy_summary}--------------------------------------------------------------------------------

NEXT STEPS:
1. Please review the items flagged above.
2. If this relates to bank details (e.g. personal account vs corporate current account), please furnish a cancelled cheque in the exact legal name of '{company_name}' or a signed Board Resolution.
3. If an updated document is required, please submit the corrected file via the vendor resolution portal.

Please reply to this email or access your onboarding portal within 5 business days to avoid any delays in vendor onboarding.

Sincerely,
Credora Vendor Verification & Compliance Team
Global Procurement Operations
Reference: {vendor_id}
"""

    followup_id = f"FOL-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.utcnow().isoformat() + "Z"
    target_ids = json.dumps([d["discrepancy_id"] for d in discrepancies])

    cursor.execute("""
        INSERT INTO followup_history (
            followup_id, vendor_id, discrepancy_ids, recipient_email, subject,
            email_content, approval_status, delivery_status, response_received, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        followup_id, vendor_id, target_ids, recipient_email, subject,
        email_body, "DRAFT", "PENDING", 0, timestamp
    ))

    conn.commit()
    conn.close()

    log_audit(
        vendor_id=vendor_id,
        stage="DISCREPANCY_RESOLUTION",
        action="FOLLOWUP_DRAFT_GENERATED",
        actor="AI_FOLLOWUP_AGENT",
        previous_state=None,
        new_state="DRAFT",
        details={
            "followup_id": followup_id,
            "discrepancies_count": len(discrepancies),
            "recipient": recipient_email
        }
    )

    return {
        "followup_id": followup_id,
        "vendor_id": vendor_id,
        "discrepancy_ids": [d["discrepancy_id"] for d in discrepancies],
        "recipient_email": recipient_email,
        "subject": subject,
        "email_content": email_body,
        "approval_status": "DRAFT",
        "created_at": timestamp
    }

def update_followup_draft(followup_id: str, subject: str, email_content: str, recipient_email: str) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE followup_history
        SET subject = ?, email_content = ?, recipient_email = ?
        WHERE followup_id = ?
    """, (subject, email_content, recipient_email, followup_id))
    
    cursor.execute("SELECT * FROM followup_history WHERE followup_id = ?", (followup_id,))
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    
    if not row:
        raise ValueError("Followup record not found")
        
    return dict(row)

def send_followup_email(followup_id: str, reviewer_name: str = "Procurement Officer") -> dict:
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM followup_history WHERE followup_id = ?", (followup_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError("Followup draft not found")
        
    record = dict(row)
    vendor_id = record["vendor_id"]
    timestamp = datetime.utcnow().isoformat() + "Z"

    cursor.execute("""
        UPDATE followup_history
        SET approval_status = 'APPROVED', delivery_status = 'DELIVERED', sent_at = ?
        WHERE followup_id = ?
    """, (timestamp, followup_id))

    # Update vendor status to AWAITING_INFO
    cursor.execute("""
        UPDATE vendors
        SET status = 'AWAITING_INFO', updated_at = ?
        WHERE vendor_id = ?
    """, (timestamp, vendor_id))

    conn.commit()
    conn.close()

    log_audit(
        vendor_id=vendor_id,
        stage="DISCREPANCY_RESOLUTION",
        action="FOLLOWUP_EMAIL_DISPATCHED",
        actor=reviewer_name,
        previous_state="DRAFT",
        new_state="DELIVERED",
        details={
            "followup_id": followup_id,
            "recipient": record["recipient_email"],
            "subject": record["subject"]
        }
    )

    return {
        "followup_id": followup_id,
        "status": "DELIVERED",
        "vendor_status": "AWAITING_INFO",
        "sent_at": timestamp
    }

def get_vendor_followup_history(vendor_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM followup_history WHERE vendor_id = ? ORDER BY created_at DESC", (vendor_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

