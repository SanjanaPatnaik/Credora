import os
import pymupdf  # PyMuPDF
import json

SAMPLE_DOCS_DIR = os.path.join(os.path.dirname(__file__), "data", "sample_docs")
os.makedirs(SAMPLE_DOCS_DIR, exist_ok=True)

def create_pan_pdf(filepath: str, pan: str, company_name: str, inc_date: str = "15/04/2020"):
    doc = pymupdf.open()
    page = doc.new_page(width=500, height=320)
    
    # Outer frame
    page.draw_rect(pymupdf.Rect(20, 20, 480, 300), color=(0.1, 0.2, 0.5), width=2)
    # Header background
    page.draw_rect(pymupdf.Rect(20, 20, 480, 70), fill=(0.9, 0.95, 1.0), color=(0.1, 0.2, 0.5), width=1)
    
    page.insert_text((110, 45), "INCOME TAX DEPARTMENT", fontsize=15, fontname="helv", color=(0.05, 0.15, 0.4))
    page.insert_text((160, 62), "GOVT. OF INDIA", fontsize=11, fontname="helv", color=(0.2, 0.2, 0.2))
    
    # Body text
    page.insert_text((40, 110), "PERMANENT ACCOUNT NUMBER", fontsize=10, fontname="helv", color=(0.4, 0.4, 0.4))
    page.insert_text((40, 135), pan, fontsize=20, fontname="helv", color=(0.0, 0.0, 0.0))
    
    page.insert_text((40, 175), "NAME / ENTITY:", fontsize=10, fontname="helv", color=(0.4, 0.4, 0.4))
    page.insert_text((40, 195), company_name.upper(), fontsize=13, fontname="helv", color=(0.05, 0.1, 0.2))
    
    page.insert_text((40, 230), "DATE OF INCORPORATION:", fontsize=9, fontname="helv", color=(0.4, 0.4, 0.4))
    page.insert_text((40, 248), inc_date, fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    
    page.insert_text((300, 230), "CATEGORY:", fontsize=9, fontname="helv", color=(0.4, 0.4, 0.4))
    page.insert_text((300, 248), "Company (Private Limited)", fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    
    # Official stamp note
    page.insert_text((140, 285), "DIGITALLY SIGNED DOCUMENT — NSDL VALIDATED", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))
    
    doc.save(filepath)
    doc.close()


def create_gst_pdf(filepath: str, gstin: str, legal_name: str, trade_name: str, address: str, reg_date: str = "18/05/2020"):
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842) # A4
    
    # Border
    page.draw_rect(pymupdf.Rect(30, 30, 565, 812), color=(0.2, 0.3, 0.4), width=1.5)
    
    page.insert_text((210, 65), "Government of India", fontsize=14, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text((220, 85), "FORM GST REG-06", fontsize=16, fontname="helv", color=(0.05, 0.2, 0.4))
    page.insert_text((180, 105), "Registration Certificate for Taxpayer", fontsize=12, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((195, 120), "(Under Goods and Services Tax Act)", fontsize=9, fontname="helv", color=(0.4, 0.4, 0.4))
    
    page.draw_line(pymupdf.Point(40, 135), pymupdf.Point(555, 135), color=(0.7, 0.7, 0.7), width=1)
    
    y = 170
    fields = [
        ("1. GSTIN", gstin),
        ("2. Legal Name", legal_name.upper()),
        ("3. Trade Name", trade_name.upper()),
        ("4. Constitution of Business", "Private Limited Company"),
        ("5. Principal Place of Business", address),
        ("6. Date of Liability", reg_date),
        ("7. Date of Registration", reg_date),
        ("8. Type of Registration", "Regular Taxpayer"),
        ("9. Period of Validity", "From: " + reg_date + " To: Perpetual / Active")
    ]
    
    for label, val in fields:
        page.insert_text((50, y), label + ":", fontsize=10, fontname="helv", color=(0.2, 0.2, 0.2))
        if len(val) > 60:
            page.insert_textbox(pymupdf.Rect(230, y - 10, 540, y + 35), val, fontsize=10, fontname="helv", color=(0.0, 0.0, 0.0))
            y += 40
        else:
            page.insert_text((230, y), val, fontsize=10, fontname="helv", color=(0.0, 0.0, 0.0))
            y += 26
            
    page.draw_rect(pymupdf.Rect(350, 700, 520, 780), color=(0.2, 0.6, 0.3), width=1)
    page.insert_text((370, 725), "APPROVED & VERIFIED", fontsize=11, fontname="helv", color=(0.1, 0.5, 0.2))
    page.insert_text((370, 745), "State Jurisdictional Office", fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text((370, 760), "GSTIN Registry Network", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))
    
    doc.save(filepath)
    doc.close()


def create_cheque_pdf(filepath: str, account_number: str, ifsc: str, bank_name: str, printed_name: str):
    doc = pymupdf.open()
    page = doc.new_page(width=580, height=260)
    
    # Outer cheque background
    page.draw_rect(pymupdf.Rect(15, 15, 565, 245), fill=(0.95, 0.98, 0.98), color=(0.2, 0.4, 0.4), width=1.5)
    
    # Bank name header
    page.insert_text((30, 45), bank_name.upper(), fontsize=14, fontname="helv", color=(0.1, 0.2, 0.3))
    page.insert_text((30, 60), f"IFSC: {ifsc} | RTGS / NEFT / IMPS ELIGIBLE", fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
    
    # Date box
    page.draw_rect(pymupdf.Rect(430, 30, 545, 55), color=(0.5, 0.5, 0.5), width=1)
    page.insert_text((440, 47), "D D M M Y Y Y Y", fontsize=8, fontname="helv", color=(0.6, 0.6, 0.6))
    
    # Payee line
    page.insert_text((30, 95), "PAY", fontsize=10, fontname="helv", color=(0.2, 0.2, 0.2))
    page.draw_line(pymupdf.Point(65, 95), pymupdf.Point(450, 95), color=(0.6, 0.6, 0.6), width=1)
    page.insert_text((465, 95), "OR BEARER", fontsize=9, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Amount line
    page.insert_text((30, 125), "RUPEES", fontsize=10, fontname="helv", color=(0.2, 0.2, 0.2))
    page.draw_line(pymupdf.Point(85, 125), pymupdf.Point(400, 125), color=(0.6, 0.6, 0.6), width=1)
    
    # Account Number Box
    page.draw_rect(pymupdf.Rect(30, 150, 240, 185), fill=(1.0, 1.0, 1.0), color=(0.3, 0.3, 0.3), width=1)
    page.insert_text((35, 162), "A/C NO.", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))
    page.insert_text((35, 178), account_number, fontsize=12, fontname="helv", color=(0.0, 0.0, 0.0))
    
    # Account Holder Signature Block
    page.insert_text((300, 165), f"FOR {printed_name.upper()}", fontsize=9, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text((380, 205), "Authorized Signatory", fontsize=9, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Big diagonal "CANCELLED" stamp across cheque
    page.draw_line(pymupdf.Point(120, 210), pymupdf.Point(340, 50), color=(0.85, 0.1, 0.1), width=4)
    page.draw_line(pymupdf.Point(135, 220), pymupdf.Point(355, 60), color=(0.85, 0.1, 0.1), width=4)
    page.insert_text((180, 140), "CANCELLED", fontsize=28, fontname="helv", color=(0.8, 0.1, 0.1))
    
    # MICR band
    page.insert_text((150, 235), f"|' 000124 |' 560024012 |: {account_number[:6]} |' 29", fontsize=10, fontname="helv", color=(0.3, 0.3, 0.3))
    
    doc.save(filepath)
    doc.close()


def create_coi_pdf(filepath: str, cin: str, company_name: str, inc_date: str, address: str):
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842) # A4
    
    page.draw_rect(pymupdf.Rect(30, 30, 565, 812), color=(0.6, 0.4, 0.1), width=2)
    page.draw_rect(pymupdf.Rect(36, 36, 559, 806), color=(0.8, 0.6, 0.2), width=1)
    
    page.insert_text((180, 80), "GOVERNMENT OF INDIA", fontsize=15, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text((155, 105), "MINISTRY OF CORPORATE AFFAIRS", fontsize=14, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text((205, 125), "Registrar of Companies", fontsize=12, fontname="helv", color=(0.2, 0.2, 0.2))
    
    page.draw_line(pymupdf.Point(50, 145), pymupdf.Point(545, 145), color=(0.7, 0.5, 0.2), width=1)
    
    page.insert_text((160, 180), "CERTIFICATE OF INCORPORATION", fontsize=16, fontname="helv", color=(0.5, 0.1, 0.1))
    page.insert_text((150, 200), "[Pursuant to sub-section (2) of section 7 of the Companies Act, 2013]", fontsize=9, fontname="helv", color=(0.4, 0.4, 0.4))
    
    page.insert_text((50, 240), f"Corporate Identity Number (CIN):", fontsize=11, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((260, 240), cin, fontsize=12, fontname="helv", color=(0.0, 0.0, 0.0))
    
    cert_text = (
        f"I hereby certify that {company_name.upper()} is incorporated on this "
        f"{inc_date} under the Companies Act, 2013 (18 of 2013) and that the company is "
        f"limited by shares and is a Private Limited Company."
    )
    page.insert_textbox(pymupdf.Rect(50, 280, 545, 360), cert_text, fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    
    page.insert_text((50, 390), "Company Type:", fontsize=11, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((220, 390), "Private Limited Company", fontsize=11, fontname="helv", color=(0.0, 0.0, 0.0))
    
    page.insert_text((50, 420), "Registered Office Address:", fontsize=11, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_textbox(pymupdf.Rect(220, 410, 540, 470), address, fontsize=10, fontname="helv", color=(0.0, 0.0, 0.0))
    
    # Official Seal
    page.draw_circle(pymupdf.Point(450, 680), 50, color=(0.2, 0.3, 0.6), width=1.5)
    page.insert_text((420, 675), "SEAL OF ROC", fontsize=9, fontname="helv", color=(0.2, 0.3, 0.6))
    page.insert_text((410, 690), "GOVT. OF INDIA", fontsize=8, fontname="helv", color=(0.2, 0.3, 0.6))
    
    page.insert_text((50, 760), "Given under my hand at Registrar of Companies on " + inc_date, fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
    
    doc.save(filepath)
    doc.close()


def create_invalid_utility_bill_pdf(filepath: str):
    """Generates an electricity utility bill to test document classification mismatch!"""
    doc = pymupdf.open()
    page = doc.new_page(width=500, height=400)
    
    page.draw_rect(pymupdf.Rect(20, 20, 480, 380), color=(0.8, 0.3, 0.1), width=1.5)
    page.insert_text((130, 50), "STATE ELECTRICITY DISTRIBUTION CO.", fontsize=13, fontname="helv", color=(0.8, 0.2, 0.0))
    page.insert_text((190, 70), "MONTHLY POWER BILL", fontsize=11, fontname="helv", color=(0.2, 0.2, 0.2))
    
    page.insert_text((40, 110), "CONSUMER NUMBER: 90218829102", fontsize=10, fontname="helv")
    page.insert_text((40, 130), "BILL MONTH: OCTOBER 2026", fontsize=10, fontname="helv")
    page.insert_text((40, 150), "UNITS CONSUMED: 420 kWh", fontsize=10, fontname="helv")
    page.insert_text((40, 170), "TOTAL PAYABLE: Rs. 3,840.00", fontsize=12, fontname="helv", color=(0.8, 0.0, 0.0))
    page.insert_text((40, 210), "Note: This is an electricity utility bill, not a tax or incorporation registration.", fontsize=9, fontname="helv", color=(0.5, 0.5, 0.5))
    
    doc.save(filepath)
    doc.close()


def generate_all_sample_documents():
    # 1. Happy Path: Acme Technologies Private Limited
    acme_dir = os.path.join(SAMPLE_DOCS_DIR, "happy_path")
    os.makedirs(acme_dir, exist_ok=True)
    
    create_pan_pdf(
        os.path.join(acme_dir, "pan_card.pdf"),
        pan="AABCA1234C",
        company_name="Acme Technologies Private Limited"
    )
    create_gst_pdf(
        os.path.join(acme_dir, "gst_certificate.pdf"),
        gstin="29AABCA1234C1Z5",
        legal_name="Acme Technologies Private Limited",
        trade_name="Acme Technologies",
        address="Plot 42, Electronics City Phase 1, Hosur Road, Bengaluru, Karnataka 560100"
    )
    create_cheque_pdf(
        os.path.join(acme_dir, "cancelled_cheque.pdf"),
        account_number="987654321012",
        ifsc="HDFC0000128",
        bank_name="HDFC BANK",
        printed_name="ACME TECHNOLOGIES PRIVATE LIMITED"
    )
    create_coi_pdf(
        os.path.join(acme_dir, "incorporation_certificate.pdf"),
        cin="U72900KA2020PTC134567",
        company_name="Acme Technologies Private Limited",
        inc_date="15/04/2020",
        address="Plot 42, Electronics City Phase 1, Hosur Road, Bengaluru, Karnataka 560100"
    )

    # 2. Edge Case 1: Vertex Solutions (Beneficiary Name Mismatch on Cheque -> Follow-up USP)
    vertex_dir = os.path.join(SAMPLE_DOCS_DIR, "edge_case_beneficiary_mismatch")
    os.makedirs(vertex_dir, exist_ok=True)
    
    create_pan_pdf(
        os.path.join(vertex_dir, "pan_card.pdf"),
        pan="AABCV5678C",
        company_name="Vertex Solutions Private Limited"
    )
    create_gst_pdf(
        os.path.join(vertex_dir, "gst_certificate.pdf"),
        gstin="27AABCV5678C1Z2",
        legal_name="Vertex Solutions Private Limited",
        trade_name="Vertex Solutions",
        address="Unit 502, B-Wing, Nesco IT Park, Western Express Highway, Goregaon East, Mumbai, Maharashtra 400063"
    )
    # The initial cheque has personal director name RAJESH KUMAR instead of corporate entity
    create_cheque_pdf(
        os.path.join(vertex_dir, "cancelled_cheque.pdf"),
        account_number="501004329999",
        ifsc="ICIC0001820",
        bank_name="ICICI BANK",
        printed_name="RAJESH KUMAR" # Personal director name causes discrepancy!
    )
    # Corrected replacement cheque for resolution simulation
    create_cheque_pdf(
        os.path.join(vertex_dir, "cancelled_cheque_CORRECTED.pdf"),
        account_number="501004321111",
        ifsc="ICIC0001820",
        bank_name="ICICI BANK",
        printed_name="VERTEX SOLUTIONS PRIVATE LIMITED" # Resolved!
    )
    create_coi_pdf(
        os.path.join(vertex_dir, "incorporation_certificate.pdf"),
        cin="U72200MH2019PTC321980",
        company_name="Vertex Solutions Private Limited",
        inc_date="22/08/2019",
        address="Unit 502, B-Wing, Nesco IT Park, Western Express Highway, Goregaon East, Mumbai, Maharashtra 400063"
    )

    # 3. Edge Case 2: Document Classification Mismatch (Electricity bill uploaded instead of GST)
    mismatch_dir = os.path.join(SAMPLE_DOCS_DIR, "edge_case_classification_mismatch")
    os.makedirs(mismatch_dir, exist_ok=True)
    create_invalid_utility_bill_pdf(os.path.join(mismatch_dir, "invalid_electricity_bill.pdf"))

    print("All sample PDF documents generated successfully.")

if __name__ == "__main__":
    generate_all_sample_documents()
