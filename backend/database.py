import sqlite3
import json
import os
import hashlib
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "credora.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Vendors table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vendors (
        vendor_id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        cin TEXT,
        pan TEXT,
        gstin TEXT,
        registered_address TEXT,
        contact_person TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        bank_account_number TEXT,
        bank_ifsc TEXT,
        bank_name TEXT,
        bank_account_holder TEXT,
        status TEXT DEFAULT 'PENDING',
        risk_level TEXT DEFAULT 'LOW',
        risk_score REAL DEFAULT 0.0,
        notes TEXT,
        created_at TEXT,
        updated_at TEXT
    );
    """)

    # 2. Documents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        document_id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        mime_type TEXT,
        classified_type TEXT,
        classification_status TEXT DEFAULT 'MATCH',
        classification_confidence REAL DEFAULT 1.0,
        classification_notes TEXT,
        uploaded_at TEXT,
        FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON DELETE CASCADE
    );
    """)

    # 3. Extracted Fields table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS extracted_fields (
        field_id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        field_name TEXT NOT NULL,
        extracted_value TEXT,
        confidence REAL DEFAULT 1.0,
        source_page INTEGER DEFAULT 1,
        format_valid INTEGER DEFAULT 1,
        validation_error TEXT,
        notes TEXT,
        FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents (document_id) ON DELETE CASCADE
    );
    """)

    # 4. Verification Results table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS verification_results (
        verification_id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        document_id TEXT,
        verification_type TEXT NOT NULL,
        verification_status TEXT NOT NULL,
        is_simulated INTEGER DEFAULT 1,
        source_provider TEXT,
        request_payload TEXT,
        response_details TEXT,
        created_at TEXT,
        FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON DELETE CASCADE
    );
    """)

    # 5. Discrepancies table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS discrepancies (
        discrepancy_id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        submitted_value TEXT,
        verified_value TEXT,
        source_documents TEXT,
        severity TEXT NOT NULL,
        impact TEXT,
        recommended_action TEXT,
        resolution_status TEXT DEFAULT 'OPEN',
        resolution_notes TEXT,
        created_at TEXT,
        resolved_at TEXT,
        FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON DELETE CASCADE
    );
    """)

    # 6. Decisions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS decisions (
        decision_id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        risk_score REAL DEFAULT 0.0,
        risk_level TEXT NOT NULL,
        decision TEXT NOT NULL,
        rationale TEXT,
        reviewer_name TEXT,
        reviewer_comments TEXT,
        created_at TEXT,
        FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON DELETE CASCADE
    );
    """)

    # 7. Audit Logs table (Append-only)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        audit_id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        previous_state TEXT,
        new_state TEXT,
        details TEXT,
        log_hash TEXT,
        created_at TEXT,
        FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON DELETE CASCADE
    );
    """)

    # 8. Follow-up History table (Primary USP)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS followup_history (
        followup_id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        discrepancy_ids TEXT,
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        email_content TEXT NOT NULL,
        approval_status TEXT DEFAULT 'DRAFT',
        delivery_status TEXT DEFAULT 'PENDING',
        response_received INTEGER DEFAULT 0,
        vendor_reply TEXT,
        created_at TEXT,
        sent_at TEXT,
        FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON DELETE CASCADE
    );
    """)

    # 9. Mock MCA Registry table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS mca_registry (
        cin TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        incorporation_date TEXT NOT NULL,
        company_class TEXT NOT NULL,
        company_category TEXT NOT NULL,
        company_status TEXT NOT NULL,
        registered_address TEXT NOT NULL,
        authorized_capital REAL,
        paid_up_capital REAL,
        directors TEXT
    );
    """)

    # Seed mock MCA registry if empty
    cursor.execute("SELECT COUNT(*) FROM mca_registry")
    if cursor.fetchone()[0] == 0:
        seed_mca_records = [
            (
                "U72900KA2020PTC134567",
                "Acme Technologies Private Limited",
                "2020-04-15",
                "Private",
                "Company limited by Shares",
                "Active",
                "Plot 42, Electronics City Phase 1, Hosur Road, Bengaluru, Karnataka 560100",
                5000000.0,
                2500000.0,
                json.dumps(["Aditya Sharma", "Pooja Hegde"])
            ),
            (
                "U72200MH2019PTC321980",
                "Vertex Solutions Private Limited",
                "2019-08-22",
                "Private",
                "Company limited by Shares",
                "Active",
                "Unit 502, B-Wing, Nesco IT Park, Western Express Highway, Goregaon East, Mumbai, Maharashtra 400063",
                2000000.0,
                1000000.0,
                json.dumps(["Rajesh Kumar", "Sunita Verma"])
            ),
            (
                "U74999DL2018PTC335412",
                "Nexus Innovations Private Limited",
                "2018-02-10",
                "Private",
                "Company limited by Shares",
                "Active",
                "Tower C, 4th Floor, DLF Cyber City, DLF Phase 2, Gurugram, Haryana 122002",
                10000000.0,
                8000000.0,
                json.dumps(["Vikramaditya Rao", "Ananya Deshmukh"])
            ),
            (
                "U51909WB2021PTC245678",
                "Apex Digital Retails Private Limited",
                "2021-11-05",
                "Private",
                "Company limited by Shares",
                "Active",
                "Sector V, Salt Lake, Bidhannagar, Kolkata, West Bengal 700091",
                1500000.0,
                500000.0,
                json.dumps(["Siddharth Ghosh", "Maitreyi Roy"])
            ),
            (
                "U29300TN2015PTC099882",
                "Kavach Security Systems Private Limited",
                "2015-06-30",
                "Private",
                "Company limited by Shares",
                "Strike Off",
                "No. 18, Anna Salai, Guindy, Chennai, Tamil Nadu 600032",
                1000000.0,
                500000.0,
                json.dumps(["K. Ramanathan"])
            ),
            (
                "U72900KA2021PTC148920",
                "Zenith Infotech Solutions Private Limited",
                "2021-03-12",
                "Private",
                "Company limited by Shares",
                "Active",
                "Plot 104, Cyber Park, Electronic City Phase 1, Hosur Road, Bengaluru, Karnataka 560100",
                5000000.0,
                2500000.0,
                json.dumps(["Vikram Malhotra", "Meera Krishnan"])
            ),
            (
                "U72200MH2020PTC342119",
                "ZetaLogix Mobility Solutions Private Limited",
                "2020-07-18",
                "Private",
                "Company limited by Shares",
                "Active",
                "Level 6, Nesco IT Park, Western Express Highway, Goregaon East, Mumbai, Maharashtra 400063",
                3000000.0,
                1500000.0,
                json.dumps(["Arjun Malhotra", "Rhea Sengupta"])
            ),
            (
                "U24230TG2019PTC135890",
                "Aetheris BioMed Solutions Private Limited",
                "2019-11-20",
                "Private",
                "Company limited by Shares",
                "Active",
                "Suite 401, BioTech Innovation Hub, HITEC City, Madhapur, Hyderabad, Telangana 500081",
                10000000.0,
                6000000.0,
                json.dumps(["Dr. Suresh Reddy", "Kavita Rao"])
            )
        ]
        cursor.executemany("""
            INSERT INTO mca_registry (
                cin, company_name, incorporation_date, company_class, company_category,
                company_status, registered_address, authorized_capital, paid_up_capital, directors
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, seed_mca_records)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Credora Database initialized successfully.")
