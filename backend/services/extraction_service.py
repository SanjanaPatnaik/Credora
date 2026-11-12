import re
from typing import Dict, Any, List

PAN_REGEX = re.compile(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b')
GST_REGEX = re.compile(r'\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b')
CIN_REGEX = re.compile(r'\b[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}\b')
IFSC_REGEX = re.compile(r'\b[A-Z]{4}0[A-Z0-9]{6}\b')
DATE_REGEX = re.compile(r'\b(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})\b')

def validate_pan(pan: str) -> (bool, str):
    if not pan:
        return False, "PAN is missing"
    if len(pan) != 10:
        return False, f"PAN must be exactly 10 characters, got {len(pan)}"
    if not PAN_REGEX.match(pan):
        return False, "PAN format invalid (expected 5 letters, 4 digits, 1 letter)"
    if pan[3] != 'C':
        return False, f"PAN 4th character is '{pan[3]}' (expected 'C' for Private Limited Company)"
    return True, "Valid Private Limited Company PAN"

def validate_gstin(gstin: str) -> (bool, str):
    if not gstin:
        return False, "GSTIN is missing"
    if len(gstin) != 15:
        return False, f"GSTIN must be 15 characters, got {len(gstin)}"
    if not GST_REGEX.match(gstin):
        return False, "GSTIN structure does not match standard 15-character Indian GST format"
    return True, "Valid GSTIN format"

def validate_cin(cin: str) -> (bool, str):
    if not cin:
        return False, "CIN is missing"
    if len(cin) != 21:
        return False, f"CIN must be exactly 21 characters, got {len(cin)}"
    if not CIN_REGEX.match(cin):
        return False, "CIN does not match standard 21-character MCA structure"
    return True, "Valid CIN format"

def validate_ifsc(ifsc: str) -> (bool, str):
    if not ifsc:
        return False, "IFSC is missing"
    if len(ifsc) != 11:
        return False, f"IFSC must be 11 characters, got {len(ifsc)}"
    if not IFSC_REGEX.match(ifsc):
        return False, "IFSC format invalid (must be 4 letters, '0', then 6 alphanumeric characters)"
    return True, "Valid IFSC format"

def validate_account_number(acc: str) -> (bool, str):
    if not acc:
        return False, "Bank account number is missing"
    digits_only = re.sub(r'\D', '', acc)
    if len(digits_only) < 9 or len(digits_only) > 18:
        return False, f"Account number length must be 9-18 digits, got {len(digits_only)}"
    return True, "Valid Account Number format"


def extract_fields_pan(text: str) -> List[Dict[str, Any]]:
    fields = []
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # 1. PAN Number
    pan_match = PAN_REGEX.search(text)
    pan_val = pan_match.group(0) if pan_match else ""
    is_valid, err = validate_pan(pan_val)
    fields.append({
        "field_name": "pan_number",
        "extracted_value": pan_val,
        "confidence": 0.98 if pan_val else 0.0,
        "format_valid": 1 if is_valid else 0,
        "validation_error": None if is_valid else err,
        "notes": "Extracted from Company PAN Card"
    })
    
    # 2. Holder Name
    holder_name = ""
    for idx, line in enumerate(lines):
        if "NAME" in line.upper() and idx + 1 < len(lines):
            potential = lines[idx + 1]
            if not PAN_REGEX.search(potential) and "INCOME TAX" not in potential.upper():
                holder_name = potential
                break
        elif "NAME:" in line.upper():
            holder_name = line.split(":", 1)[1].strip()
            break
            
    if not holder_name:
        for line in lines:
            if "PVT LTD" in line.upper() or "PRIVATE LIMITED" in line.upper() or "LIMITED" in line.upper():
                holder_name = line
                break
                
    fields.append({
        "field_name": "holder_name",
        "extracted_value": holder_name,
        "confidence": 0.92 if holder_name else 0.4,
        "format_valid": 1 if bool(holder_name) else 0,
        "validation_error": None if holder_name else "Unable to confidently extract holder name",
        "notes": "Company legal name printed on PAN"
    })
    
    # 3. Category
    category = "Company" if (pan_val and len(pan_val) == 10 and pan_val[3] == 'C') else "Unknown"
    fields.append({
        "field_name": "holder_category",
        "extracted_value": category,
        "confidence": 0.99 if category == "Company" else 0.5,
        "format_valid": 1 if category == "Company" else 0,
        "validation_error": None if category == "Company" else "4th character is not 'C' (Company)",
        "notes": "PAN Entity Classification"
    })
    
    return fields


def extract_fields_gst(text: str) -> List[Dict[str, Any]]:
    fields = []
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # 1. GSTIN
    gst_match = GST_REGEX.search(text)
    gst_val = gst_match.group(0) if gst_match else ""
    is_valid, err = validate_gstin(gst_val)
    fields.append({
        "field_name": "gstin",
        "extracted_value": gst_val,
        "confidence": 0.98 if gst_val else 0.0,
        "format_valid": 1 if is_valid else 0,
        "validation_error": None if is_valid else err,
        "notes": "GST Identification Number"
    })
    
    # 2. Legal Name
    legal_name = ""
    for idx, line in enumerate(lines):
        if "LEGAL NAME" in line.upper():
            if ":" in line and len(line.split(":", 1)[1].strip()) > 2:
                legal_name = line.split(":", 1)[1].strip()
            elif idx + 1 < len(lines):
                legal_name = lines[idx + 1].strip()
            break
    if not legal_name:
        for line in lines:
            if "PVT LTD" in line.upper() or "PRIVATE LIMITED" in line.upper():
                legal_name = line.strip()
                break
                
    fields.append({
        "field_name": "legal_name",
        "extracted_value": legal_name,
        "confidence": 0.96 if legal_name else 0.3,
        "format_valid": 1 if bool(legal_name) else 0,
        "validation_error": None if legal_name else "Legal name missing from GST certificate",
        "notes": "Registered Legal Business Name"
    })
    
    # 3. Trade Name
    trade_name = ""
    for idx, line in enumerate(lines):
        if "TRADE NAME" in line.upper():
            if ":" in line and len(line.split(":", 1)[1].strip()) > 2:
                trade_name = line.split(":", 1)[1].strip()
            elif idx + 1 < len(lines):
                trade_name = lines[idx + 1].strip()
            break
    if not trade_name:
        trade_name = legal_name
            
    fields.append({
        "field_name": "trade_name",
        "extracted_value": trade_name,
        "confidence": 0.92 if trade_name else 0.3,
        "format_valid": 1 if bool(trade_name) else 0,
        "validation_error": None,
        "notes": "Trade Name / Commercial Brand"
    })
    
    # 4. Address
    address = ""
    for idx, line in enumerate(lines):
        if "PRINCIPAL PLACE OF BUSINESS" in line.upper() or "REGISTERED ADDRESS" in line.upper() or "ADDRESS:" in line.upper():
            addr_parts = []
            start_i = idx if "ADDRESS:" not in line.upper() else idx
            for j in range(start_i, min(len(lines), start_i + 4)):
                if not any(k in lines[j].upper() for k in ["DATE", "VALIDITY", "PERIOD", "SIGNATURE"]):
                    clean_l = lines[j].replace("Principal Place of Business:", "").replace("Address:", "").strip()
                    if clean_l:
                        addr_parts.append(clean_l)
            address = ", ".join(addr_parts)
            break
            
    fields.append({
        "field_name": "registered_address",
        "extracted_value": address,
        "confidence": 0.88 if address else 0.4,
        "format_valid": 1 if bool(address) else 0,
        "validation_error": None if address else "Address not clearly extracted",
        "notes": "Principal Place of Business"
    })
    
    # 5. Registration Date
    date_match = DATE_REGEX.search(text)
    reg_date = date_match.group(0) if date_match else ""
    fields.append({
        "field_name": "registration_date",
        "extracted_value": reg_date,
        "confidence": 0.92 if reg_date else 0.4,
        "format_valid": 1 if bool(reg_date) else 0,
        "validation_error": None,
        "notes": "Date of GST Registration"
    })
    
    return fields


def extract_fields_cheque(text: str) -> List[Dict[str, Any]]:
    fields = []
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # 1. IFSC
    ifsc_match = IFSC_REGEX.search(text)
    ifsc_val = ifsc_match.group(0) if ifsc_match else ""
    is_valid, err = validate_ifsc(ifsc_val)
    fields.append({
        "field_name": "bank_ifsc",
        "extracted_value": ifsc_val,
        "confidence": 0.98 if ifsc_val else 0.0,
        "format_valid": 1 if is_valid else 0,
        "validation_error": None if is_valid else err,
        "notes": "Bank Branch IFSC Code"
    })
    
    # 2. Account Number
    acc_num = ""
    for line in lines:
        if "A/C" in line.upper() or "ACCOUNT" in line.upper() or "ACC NO" in line.upper():
            digits = re.findall(r'\d{9,18}', line)
            if digits:
                acc_num = digits[0]
                break
    if not acc_num:
        digits = re.findall(r'\b\d{9,18}\b', text)
        if digits:
            acc_num = digits[0]
            
    is_valid_acc, err_acc = validate_account_number(acc_num)
    fields.append({
        "field_name": "bank_account_number",
        "extracted_value": acc_num,
        "confidence": 0.95 if acc_num else 0.0,
        "format_valid": 1 if is_valid_acc else 0,
        "validation_error": None if is_valid_acc else err_acc,
        "notes": "Cheque Printed Account Number"
    })
    
    # 3. Bank Name
    bank_name = ""
    known_banks = ["HDFC BANK", "ICICI BANK", "STATE BANK OF INDIA", "SBI", "AXIS BANK", "KOTAK MAHINDRA BANK", "PUNJAB NATIONAL BANK", "BANK OF BARODA", "INDUSIND BANK"]
    for b in known_banks:
        if b in text.upper():
            bank_name = b
            break
    if not bank_name:
        for line in lines:
            if "BANK" in line.upper():
                bank_name = line
                break
                
    fields.append({
        "field_name": "bank_name",
        "extracted_value": bank_name,
        "confidence": 0.90 if bank_name else 0.4,
        "format_valid": 1 if bool(bank_name) else 0,
        "validation_error": None,
        "notes": "Issuing Bank Name"
    })
    
    # 4. Account Holder Name if printed
    holder_name = ""
    for idx, line in enumerate(lines):
        if line.upper().startswith("FOR ") or "FOR " in line.upper():
            part = line.split("FOR ", 1)[1].strip() if "FOR " in line else line.split("For ", 1)[1].strip()
            if not any(k in part.upper() for k in ["PAY", "RUPEES", "BANK", "BRANCH"]):
                holder_name = part
                break
        elif "NAME:" in line.upper():
            holder_name = line.split(":", 1)[1].strip()
            break
            
    if not holder_name:
        for line in lines:
            if ("PVT LTD" in line.upper() or "PRIVATE LIMITED" in line.upper()) and "BANK" not in line.upper():
                holder_name = line
                break

    fields.append({
        "field_name": "bank_account_holder",
        "extracted_value": holder_name,
        "confidence": 0.85 if holder_name else 0.3,
        "format_valid": 1 if bool(holder_name) else 0,
        "validation_error": None if holder_name else "Holder name not clearly legible on cheque face",
        "notes": "Name printed on cheque face"
    })
    
    return fields


def extract_fields_coi(text: str) -> List[Dict[str, Any]]:
    fields = []
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # 1. CIN
    cin_match = CIN_REGEX.search(text)
    cin_val = cin_match.group(0) if cin_match else ""
    is_valid, err = validate_cin(cin_val)
    fields.append({
        "field_name": "cin",
        "extracted_value": cin_val,
        "confidence": 0.98 if cin_val else 0.0,
        "format_valid": 1 if is_valid else 0,
        "validation_error": None if is_valid else err,
        "notes": "Corporate Identity Number"
    })
    
    # 2. Company Name
    co_name = ""
    certify_match = re.search(r'hereby certify that\s+(.*?)\s+is incorporated', text, re.IGNORECASE | re.DOTALL)
    if certify_match:
        co_name = " ".join(certify_match.group(1).split())
    else:
        for idx, line in enumerate(lines):
            if "HEREBY CERTIFY THAT" in line.upper():
                part = line.upper().split("HEREBY CERTIFY THAT", 1)[1].strip()
                if "IS INCORPORATED" in part:
                    co_name = part.split("IS INCORPORATED", 1)[0].strip()
                elif idx + 1 < len(lines):
                    co_name = lines[idx + 1].strip()
                break
            elif "COMPANY NAME:" in line.upper():
                co_name = line.split(":", 1)[1].strip()
                break
            
    if not co_name:
        for line in lines:
            if "PRIVATE LIMITED" in line.upper() or "PVT LTD" in line.upper():
                co_name = line.strip()
                break
                
    fields.append({
        "field_name": "company_name",
        "extracted_value": co_name,
        "confidence": 0.95 if co_name else 0.4,
        "format_valid": 1 if bool(co_name) else 0,
        "validation_error": None if co_name else "Company legal name not found in certificate",
        "notes": "Incorporated Legal Entity Name"
    })
    
    # 3. Date of Incorporation
    date_match = DATE_REGEX.search(text)
    inc_date = date_match.group(0) if date_match else ""
    fields.append({
        "field_name": "incorporation_date",
        "extracted_value": inc_date,
        "confidence": 0.92 if inc_date else 0.4,
        "format_valid": 1 if bool(inc_date) else 0,
        "validation_error": None,
        "notes": "Date of Incorporation"
    })
    
    # 4. Company Type
    co_type = "Private Limited Company"
    if "PUBLIC LIMITED" in text.upper():
        co_type = "Public Limited Company"
    elif "ONE PERSON COMPANY" in text.upper() or "OPC" in text.upper():
        co_type = "One Person Company"
        
    fields.append({
        "field_name": "company_type",
        "extracted_value": co_type,
        "confidence": 0.95,
        "format_valid": 1 if "Private" in co_type else 0,
        "validation_error": None if "Private" in co_type else "Non-Private Limited company type detected",
        "notes": "Company Constitution"
    })
    
    # 5. Registered Office Address
    address = ""
    for idx, line in enumerate(lines):
        if "REGISTERED OFFICE" in line.upper() or "ADDRESS:" in line.upper():
            addr_parts = []
            for j in range(idx, min(len(lines), idx + 3)):
                clean_l = lines[j].replace("Registered Office Address:", "").replace("Registered Office:", "").strip()
                if clean_l and not any(k in clean_l.upper() for k in ["CIN", "DATE", "SEAL"]):
                    addr_parts.append(clean_l)
            address = ", ".join(addr_parts)
            break
            
    fields.append({
        "field_name": "registered_address",
        "extracted_value": address,
        "confidence": 0.88 if address else 0.4,
        "format_valid": 1 if bool(address) else 0,
        "validation_error": None,
        "notes": "Registered Office Address"
    })
    
    return fields


def extract_document_fields(document_type: str, text: str) -> List[Dict[str, Any]]:
    doc_type_upper = document_type.upper()
    if "PAN" in doc_type_upper:
        return extract_fields_pan(text)
    elif "GST" in doc_type_upper:
        return extract_fields_gst(text)
    elif "CHEQUE" in doc_type_upper:
        return extract_fields_cheque(text)
    elif "INCORPORATION" in doc_type_upper or "COI" in doc_type_upper:
        return extract_fields_coi(text)
    else:
        return []
