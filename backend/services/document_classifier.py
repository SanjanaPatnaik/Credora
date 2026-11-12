import re
from typing import Dict, Any

PAN_REGEX = re.compile(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b')
GST_REGEX = re.compile(r'\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b')
CIN_REGEX = re.compile(r'\b[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}\b')
IFSC_REGEX = re.compile(r'\b[A-Z]{4}0[A-Z0-9]{6}\b')

def classify_document(text: str, expected_type: str) -> Dict[str, Any]:
    text_upper = text.upper()
    scores = {
        "PAN_CARD": 0.0,
        "GST_CERTIFICATE": 0.0,
        "CANCELLED_CHEQUE": 0.0,
        "INCORPORATION_CERTIFICATE": 0.0,
        "INVALID_DOCUMENT": 0.0
    }
    
    # 1. PAN Card markers
    if "PERMANENT ACCOUNT NUMBER" in text_upper:
        scores["PAN_CARD"] += 0.4
    if "INCOME TAX DEPARTMENT" in text_upper or "GOVT. OF INDIA" in text_upper:
        scores["PAN_CARD"] += 0.3
    if PAN_REGEX.search(text_upper):
        scores["PAN_CARD"] += 0.4
        
    # 2. GST Certificate markers
    if "GST REG-06" in text_upper or "REGISTRATION CERTIFICATE" in text_upper:
        scores["GST_CERTIFICATE"] += 0.4
    if "GOODS AND SERVICES TAX" in text_upper or "GSTIN" in text_upper:
        scores["GST_CERTIFICATE"] += 0.3
    if GST_REGEX.search(text_upper):
        scores["GST_CERTIFICATE"] += 0.4
        
    # 3. Cancelled Cheque markers
    if "CANCELLED" in text_upper or "CHEQUE" in text_upper:
        scores["CANCELLED_CHEQUE"] += 0.35
    if "IFSC" in text_upper or IFSC_REGEX.search(text_upper):
        scores["CANCELLED_CHEQUE"] += 0.35
    if "A/C NO" in text_upper or "ACCOUNT NO" in text_upper or "PAY" in text_upper:
        scores["CANCELLED_CHEQUE"] += 0.35
        
    # 4. Certificate of Incorporation markers
    if "CERTIFICATE OF INCORPORATION" in text_upper:
        scores["INCORPORATION_CERTIFICATE"] += 0.4
    if "REGISTRAR OF COMPANIES" in text_upper or "COMPANIES ACT" in text_upper or "MINISTRY OF CORPORATE AFFAIRS" in text_upper:
        scores["INCORPORATION_CERTIFICATE"] += 0.35
    if CIN_REGEX.search(text_upper) or "CIN:" in text_upper:
        scores["INCORPORATION_CERTIFICATE"] += 0.35

    # Check for known invalid/mismatched docs (e.g. Utility bill, invoice, random file)
    if "ELECTRICITY BILL" in text_upper or "CONSUMER NUMBER" in text_upper or "TAX INVOICE" in text_upper:
        scores["INVALID_DOCUMENT"] += 0.6

    best_type, best_score = max(scores.items(), key=lambda item: item[1])
    
    # Normalizing score capped at 0.99
    confidence = min(0.99, max(0.40, best_score))
    
    if best_score < 0.3:
        classified = "UNKNOWN"
        status = "MISMATCH"
        explanation = f"Uploaded document content does not match expected {expected_type} structure or recognized Indian business document markers."
    elif best_type == expected_type:
        classified = best_type
        status = "MATCH"
        explanation = f"Document successfully verified as genuine {expected_type.replace('_', ' ').title()}."
    else:
        classified = best_type
        status = "MISMATCH"
        explanation = f"Document type mismatch: Expected {expected_type.replace('_', ' ').title()}, but detected {best_type.replace('_', ' ').title()}."

    return {
        "classified_type": classified,
        "expected_type": expected_type,
        "classification_status": status,
        "classification_confidence": round(confidence, 2),
        "explanation": explanation
    }

