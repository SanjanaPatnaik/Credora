import json
import hashlib
import uuid
from datetime import datetime
from database import get_db

def log_audit(vendor_id: str, stage: str, action: str, actor: str = "SYSTEM_PIPELINE",
              previous_state: str = None, new_state: str = None, details: dict = None) -> str:
    conn = get_db()
    cursor = conn.cursor()
    audit_id = f"AUD-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    details_str = json.dumps(details, default=str) if details else "{}"
    
    # Cryptographic hash chaining
    cursor.execute("SELECT log_hash FROM audit_logs WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 1", (vendor_id,))
    prev_row = cursor.fetchone()
    prev_hash = prev_row[0] if prev_row and prev_row[0] else "0" * 32
    
    raw_payload = f"{prev_hash}|{audit_id}|{vendor_id}|{stage}|{action}|{actor}|{timestamp}|{details_str}"
    log_hash = hashlib.sha256(raw_payload.encode('utf-8')).hexdigest()
    
    cursor.execute("""
        INSERT INTO audit_logs (audit_id, vendor_id, stage, action, actor, previous_state, new_state, details, log_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (audit_id, vendor_id, stage, action, actor, previous_state, new_state, details_str, log_hash, timestamp))
    
    conn.commit()
    conn.close()
    return audit_id

def get_vendor_audit_trail(vendor_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs WHERE vendor_id = ? ORDER BY created_at ASC", (vendor_id,))
    rows = cursor.fetchall()
    conn.close()
    
    logs = []
    for r in rows:
        d = dict(r)
        try:
            d['details'] = json.loads(d['details']) if d['details'] else {}
        except Exception:
            pass
        logs.append(d)
    return logs

