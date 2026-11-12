from typing import Dict, Any, List
import uuid
from datetime import datetime
from database import get_db
from services.audit_service import log_audit

def generate_onboarding_decision(
    vendor_id: str,
    risk_assessment: Dict[str, Any],
    discrepancies: List[Dict[str, Any]]
) -> Dict[str, Any]:
    risk_level = risk_assessment.get("risk_level", "LOW")
    risk_score = risk_assessment.get("risk_score", 0.0)
    
    unresolved_discrepancies = [d for d in discrepancies if d.get("resolution_status") == "OPEN"]
    
    if risk_level == "LOW" and len(unresolved_discrepancies) == 0:
        decision = "APPROVED"
        rationale = "All mandatory verification stages passed. Registrations, PAN, GST, MCA Master Data, and Bank Penny-Drop align with 100% legal entity integrity."
    elif risk_level == "CRITICAL":
        decision = "REJECTED"
        rationale = "Critical non-compliance detected. Confirmed invalid identity, inactive registration, or fraudulent document classification mismatch."
    elif any(d.get("severity") in ["HIGH", "CRITICAL"] for d in unresolved_discrepancies):
        decision = "MANUAL_REVIEW"
        rationale = f"Significant discrepancies detected ({len(unresolved_discrepancies)} open items, including bank beneficiary or corporate name variations). Automated follow-up resolution recommended."
    else:
        decision = "REQUEST_ADDITIONAL_INFO"
        rationale = "Minor clarification or document re-scan required before final onboarding approval."

    conn = get_db()
    cursor = conn.cursor()
    decision_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.utcnow().isoformat() + "Z"

    cursor.execute("""
        INSERT INTO decisions (
            decision_id, vendor_id, risk_score, risk_level, decision,
            rationale, reviewer_name, reviewer_comments, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        decision_id, vendor_id, risk_score, risk_level, decision,
        rationale, "AUTOMATED_RULE_ENGINE", None, timestamp
    ))

    # Update vendor status
    cursor.execute("""
        UPDATE vendors SET
            status = ?,
            risk_level = ?,
            risk_score = ?,
            updated_at = ?
        WHERE vendor_id = ?
    """, (decision, risk_level, risk_score, timestamp, vendor_id))

    conn.commit()
    conn.close()

    log_audit(
        vendor_id=vendor_id,
        stage="DECISION_ENGINE",
        action="DECISION_GENERATED",
        actor="RULE_ENGINE",
        previous_state=None,
        new_state=decision,
        details={
            "decision_id": decision_id,
            "decision": decision,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "rationale": rationale
        }
    )

    return {
        "decision_id": decision_id,
        "decision": decision,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "rationale": rationale,
        "timestamp": timestamp
    }

