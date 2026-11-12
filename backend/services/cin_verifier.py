import re
import json
from typing import Dict, Any
from database import get_db
from rapidfuzz import fuzz

def verify_cin_mca(cin: str, submitted_company_name: str = "") -> Dict[str, Any]:
    cin = (cin or "").strip().upper()
    submitted_company_name = (submitted_company_name or "").strip()
    
    # 1. Format check
    if not cin or len(cin) != 21:
        return {
            "verification_status": "FAILED",
            "is_valid": False,
            "is_simulated": True,
            "source_provider": "Mock MCA Registry",
            "cin": cin,
            "error": f"Invalid CIN length: must be exactly 21 characters (got {len(cin)})"
        }
        
    if not re.match(r'^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$', cin):
        return {
            "verification_status": "FAILED",
            "is_valid": False,
            "is_simulated": True,
            "source_provider": "Mock MCA Registry",
            "cin": cin,
            "error": "CIN does not conform to Ministry of Corporate Affairs 21-character alphanumeric specification"
        }

    # 2. Query Mock MCA Registry
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM mca_registry WHERE cin = ?", (cin,))
    record = cursor.fetchone()
    conn.close()

    if not record:
        return {
            "verification_status": "FAILED",
            "is_valid": False,
            "is_simulated": True,
            "source_provider": "Mock MCA Registry (Local Database)",
            "cin": cin,
            "error": "CIN not found in MCA company master database",
            "response_details": {
                "cin": cin,
                "mca_status": "RECORD_NOT_FOUND",
                "message": "No active or historical company record matches this CIN in the MCA registry."
            }
        }

    rec = dict(record)
    try:
        rec['directors'] = json.loads(rec['directors']) if rec.get('directors') else []
    except Exception:
        pass

    # Check status
    is_active = rec.get("company_status") == "Active"
    is_pvt = "Private" in rec.get("company_class", "")

    # Compare company name
    name_score = fuzz.token_sort_ratio(submitted_company_name.upper(), rec["company_name"].upper()) if submitted_company_name else 100.0

    if not is_active:
        status = "FAILED"
        notes = f"Company is listed in MCA registry as '{rec.get('company_status')}' (Disqualified: Not an active going concern)."
    elif not is_pvt:
        status = "FAILED"
        notes = f"Company class '{rec.get('company_class')}' does not meet Private Limited eligibility policy."
    elif name_score < 75.0:
        status = "MANUAL_REVIEW"
        notes = f"CIN found, but submitted company name differs significantly from MCA registered name '{rec['company_name']}' (match score: {name_score:.1f}%)."
    else:
        status = "VERIFIED"
        notes = "CIN found in MCA registry. Company is Active and Private Limited with matching legal title."

    return {
        "verification_status": status,
        "is_valid": is_active and is_pvt and (name_score >= 75.0),
        "is_simulated": True,
        "source_provider": "Mock MCA Registry (Local Database)",
        "cin": cin,
        "company_name": rec["company_name"],
        "incorporation_date": rec["incorporation_date"],
        "company_class": rec["company_class"],
        "company_status": rec["company_status"],
        "registered_address": rec["registered_address"],
        "directors": rec.get("directors", []),
        "authorized_capital": rec.get("authorized_capital"),
        "paid_up_capital": rec.get("paid_up_capital"),
        "name_match_score": name_score,
        "notes": notes,
        "response_details": rec
    }

