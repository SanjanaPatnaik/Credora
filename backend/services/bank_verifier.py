import re
import uuid
from typing import Dict, Any
from rapidfuzz import fuzz

def verify_bank_penny_drop(
    account_number: str,
    ifsc: str,
    company_name: str,
    account_holder_cheque: str = "",
    override_scenario: str = None
) -> Dict[str, Any]:
    """
    Simulated Penny-Drop Verification Service.
    Initiates a simulated ₹1 transfer to verify account status and retrieve official beneficiary name.
    """
    account_number = (account_number or "").strip()
    ifsc = (ifsc or "").strip().upper()
    company_name = (company_name or "").strip()
    account_holder_cheque = (account_holder_cheque or "").strip()
    
    # 1. Local checks
    if not account_number or len(account_number) < 9 or len(account_number) > 18:
        return {
            "verification_status": "FAILED",
            "is_valid": False,
            "is_simulated": True,
            "source_provider": "Mock Penny-Drop Service (NPCI Simulator)",
            "account_number": account_number,
            "ifsc": ifsc,
            "error": "Account number length is invalid (must be between 9 and 18 digits)"
        }
        
    if not ifsc or not re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', ifsc):
        return {
            "verification_status": "FAILED",
            "is_valid": False,
            "is_simulated": True,
            "source_provider": "Mock Penny-Drop Service (NPCI Simulator)",
            "account_number": account_number,
            "ifsc": ifsc,
            "error": "IFSC format is invalid"
        }

    # Deterministic or Scenario-based Beneficiary Name Resolution:
    # If account_holder_cheque is explicitly a personal director name (like "RAJESH KUMAR")
    # or override_scenario indicates discrepancy:
    has_beneficiary_mismatch = (
        override_scenario == "BENEFICIARY_MISMATCH" or
        (account_holder_cheque and any(k in account_holder_cheque.upper() for k in ["RAJESH", "ARJUN", "MALHOTRA", "KUMAR"])) or
        (account_number.endswith("999"))
    )
    
    is_invalid_account = (
        override_scenario == "INVALID_ACCOUNT" or
        account_number.endswith("000")
    )
    
    if is_invalid_account:
        return {
            "verification_status": "FAILED",
            "is_valid": False,
            "is_simulated": True,
            "source_provider": "Mock Penny-Drop Service (NPCI Simulator)",
            "account_number": account_number,
            "ifsc": ifsc,
            "beneficiary_name": None,
            "account_status": "INVALID_OR_CLOSED",
            "response_code": "R03",
            "error": "Destination bank reported: Account does not exist or has been frozen/closed.",
            "response_details": {
                "transfer_amount": "INR 1.00",
                "bank_ref_no": f"PENNY-ERR-{uuid.uuid4().hex[:6].upper()}",
                "status_code": "ACCOUNT_DOES_NOT_EXIST",
                "npc_reason": "BENEFICIARY_ACCOUNT_INVALID"
            }
        }

    if has_beneficiary_mismatch:
        simulated_beneficiary = account_holder_cheque.upper() if account_holder_cheque else "ARJUN MALHOTRA"
        name_match_score = fuzz.token_sort_ratio(simulated_beneficiary.upper(), company_name.upper())
        return {
            "verification_status": "MANUAL_REVIEW",
            "is_valid": True,
            "is_simulated": True,
            "source_provider": "Mock Penny-Drop Service (NPCI Simulator)",
            "account_number": account_number,
            "ifsc": ifsc,
            "account_status": "ACTIVE",
            "beneficiary_name": simulated_beneficiary,
            "expected_company_name": company_name,
            "name_match_score": name_match_score,
            "response_code": "ACTV_NAME_MISMATCH",
            "notes": f"Bank account is ACTIVE, but registered beneficiary is individual '{simulated_beneficiary}' instead of legal corporate entity '{company_name}'.",
            "response_details": {
                "transfer_amount": "INR 1.00",
                "utr_number": f"CMS{uuid.uuid4().hex[:10].upper()}",
                "bank_status": "TRANSACTION_SUCCESSFUL",
                "beneficiary_name_returned": simulated_beneficiary,
                "account_status": "ACTIVE",
                "settlement_timestamp": "2026-11-11T12:05:00Z"
            }
        }

    # Happy path: Beneficiary matches company name
    beneficiary_name = company_name.upper() if company_name else "ACME TECHNOLOGIES PRIVATE LIMITED"
    return {
        "verification_status": "VERIFIED",
        "is_valid": True,
        "is_simulated": True,
        "source_provider": "Mock Penny-Drop Service (NPCI Simulator)",
        "account_number": account_number,
        "ifsc": ifsc,
        "account_status": "ACTIVE",
        "beneficiary_name": beneficiary_name,
        "expected_company_name": company_name,
        "name_match_score": 100.0,
        "response_code": "ACTV_MATCH",
        "notes": "Bank account is ACTIVE and beneficiary name precisely matches company legal identity.",
        "response_details": {
            "transfer_amount": "INR 1.00",
            "utr_number": f"CMS{uuid.uuid4().hex[:10].upper()}",
            "bank_status": "TRANSACTION_SUCCESSFUL",
            "beneficiary_name_returned": beneficiary_name,
            "account_status": "ACTIVE",
            "settlement_timestamp": "2026-11-11T12:05:00Z"
        }
    }

