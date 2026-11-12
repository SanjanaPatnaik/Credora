# Credora — AI-Powered Vendor Onboarding & Verification System

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.162-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Credora** is an enterprise-grade AI-powered vendor onboarding, verification, and automated discrepancy resolution prototype. It automates information collection, document OCR processing, government and banking registry verification, cross-document reconciliation, and automated resolution of compliance mismatches for Indian Private Limited companies.

---

## 🌟 Primary USP: Automated Discrepancy Resolution

Traditional vendor onboarding systems stop at flagging errors, creating a bottleneck of manual emails and phone calls. **Credora actively resolves discrepancies**:

```
Discrepancy Detected (e.g. Bank Beneficiary Name Mismatch)
   ↓
1. Identifies exact field requiring remediation
   ↓
2. Explains the discrepancy and legal risk
   ↓
3. AI drafts a personalized, professional follow-up email
   ↓
4. Procurement Officer reviews, edits, and dispatches the email
   ↓
5. Records vendor's updated information or replacement document
   ↓
6. Automatically re-runs only the affected verification checks
   ↓
7. Recalculates risk score & transitions vendor to APPROVED
```

A secondary differentiator is an **evidence-backed, append-only cryptographic audit trail** with SHA-256 hash chaining guaranteeing proof of verification.

---

## 🏗️ 7-Stage Pipeline Architecture

```
[Vendor Intake Form + 4 Document Uploads]
                     ↓
┌────────────────────────────────────────────────────────┐
│ Stage 1: Vendor Intake & Cryptographic Ingestion      │
│ - Unique Vendor ID generation (VEN-YYYYMM-XXXX)        │
│ - SHA-256 file hashing & document storage              │
└────────────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ Stage 2: Document Processing & Classification          │
│ - PyMuPDF selectable text & OCR fallback extraction   │
│ - Document Classifier (Detects PAN, GST, Cheque, COI) │
│ - Flags Document Mismatches (e.g. Utility Bill upload) │
│ - Field extraction with OCR confidence scoring (0-100%)│
└────────────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ Stage 3: Individual Authority Verification             │
│ - 3.1 Company PAN: Format check + Setu PAN API         │
│ - 3.2 GST Certificate: Format check + Setu GST API     │
│ - 3.3 Cancelled Cheque: ₹1 Mock Penny-Drop (NPCI Sim)  │
│ - 3.4 Certificate of Incorporation: Mock MCA Registry │
└────────────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ Stage 4: Cross-Document Consistency Matrix             │
│ - RapidFuzz multi-way fuzzy legal name matching        │
│ - PAN embedded alignment (GSTIN characters 3-12)       │
│ - CIN active registry check                            │
│ - Bank Account Number & IFSC exact reconciliation     │
│ - Beneficiary Name vs Company Legal Entity check       │
│ - Registered Office address tolerance matching         │
└────────────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ Stage 5: Rule-Based Risk Engine                        │
│ - Composite risk score calculation (0.0 to 100.0)      │
│ - Rule-based overrides (Critical findings override)   │
│ - Risk categorization: LOW, MEDIUM, HIGH, CRITICAL    │
└────────────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ Stage 6: Decision & Action Center                      │
│ - Automated Decision: APPROVED, MANUAL_REVIEW, REJECTED│
│ - Automated Follow-Up Email Generator                  │
│ - Officer Review, Edit & Dispatch Workflow             │
│ - Vendor Resolution & Re-verification Loop             │
└────────────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────────────┐
│ Stage 7: Evidence-Backed Audit Trail & Dashboard       │
│ - Real-time Live Pipeline Step Visualizer              │
│ - Append-only chronological audit log                  │
│ - Cryptographic SHA-256 hash chaining                  │
└────────────────────────────────────────────────────────┘
```

---

## 📋 Required Documents & Fields

| Document | Purpose | Key Extracted & Validated Fields |
|---|---|---|
| **Company PAN Card** | Legal Tax Identity | PAN Number (`[A-Z]{5}[0-9]{4}[A-Z]`, 4th char `C`), Holder Name, Category |
| **GST Registration Certificate** | Active Taxpayer Status | GSTIN (15-char), Legal Name, Trade Name, Registered Address, Status (`Active`) |
| **Cancelled Cheque** | Bank Account Proof | Account Number (9-18 digits), IFSC (`[A-Z]{4}0[A-Z0-9]{6}`), Bank Name, Printed Name |
| **Certificate of Incorporation** | Corporate Existence | CIN (21-char), Legal Entity Name, Date of Incorporation, Class (`Private Limited`) |

---

## ⚡ Quick Start (Run the Prototype)

### 1. One-Command Launch, Stop & Restart
```bash
cd /Users/sanjanapatnaik/Documents/VendorVerification_Project/Credora

# Start
./start.sh

# Stop
./stop.sh

# Restart
./restart.sh
```
This automatically manages dependencies, builds the frontend, and serves the application at **http://127.0.0.1:8000**.

### 2. Manual Development Mode
If you prefer running frontend with Vite hot-reloading and FastAPI reload:

**Terminal 1 — Backend:**
```bash
source venv/bin/activate
uvicorn main:app --app-dir backend --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
export PATH="../tools/node/bin:$PATH"
npm run dev
# Open http://localhost:5173
```

---

## 🎯 5-Minute Demonstration Guide

The application includes pre-loaded sample datasets and 1-click scenario loaders matching Section 9 of the specification:

### Part 1: Happy Path (100% Compliant)
1. In the top navigation, click **Demo Scenarios** or use **New Vendor Intake** → click **Load Happy Path (Acme)**.
2. Observe real PyMuPDF extraction of `AABCA1234C`, `29AABCA1234C1Z5`, and `U72900KA2020PTC134567`.
3. Check the **Cross-Document Matrix**: All attributes match with 100% score.
4. Risk score: `0.0` (`LOW`) → Decision: **`APPROVED`**.

### Part 2: Edge Case 1 — Bank Beneficiary Mismatch (Primary USP Demo)
1. Click **Demo Scenarios** → Launch **Demo 2: Edge Case 1 (Vertex Solutions)**.
2. The cancelled cheque uploaded has printed name `RAJESH KUMAR` (Director personal savings account).
3. The simulated Penny-Drop confirms account active, but beneficiary is `RAJESH KUMAR` instead of `Vertex Solutions Private Limited`.
4. System flags **High Severity Discrepancy** → Decision: **`MANUAL_REVIEW`**.
5. Click **Generate Follow-up Email**: The AI drafts a personalized email referencing the specific bank account and company legal name.
6. Click **Approve & Send Email**: Status transitions to `Awaiting Info`, recorded in audit trail.
7. Click **Simulate Vendor Correction & Re-verify**: Checks "Upload Valid Corporate Cheque" (`501004321111`) and submits.
8. System re-runs only the affected checks with fresh OCR → Discrepancy marked **RESOLVED** → Risk drops to **`LOW`** → Status transitions to **`APPROVED`** 🎉!

### Part 3: Edge Case 2 — Document Classification Mismatch
1. Click **Demo Scenarios** → Launch **Demo 3: Edge Case 2 (Nexus Innovations)**.
2. An electricity utility bill was uploaded where a GST Certificate was expected.
3. The Document Classifier catches the mismatch: `Expected GST Certificate, Detected Utility Bill`.
4. Prevents erroneous API calls → Flags Critical Risk → Decision: **`REJECTED`**.

---

## 🗄️ Project File Structure

```
Credora/
├── backend/
│   ├── main.py                     # FastAPI REST API & SPA static server
│   ├── database.py                 # SQLite initialization & Mock MCA Registry seed
│   ├── sample_data_generator.py    # PyMuPDF generator for genuine sample PDFs
│   ├── data/
│   │   ├── uploads/                # Vendor document uploads organized by vendor_id
│   │   └── sample_docs/            # Pre-generated sample documents for demo suite
│   └── services/
│       ├── intake_service.py       # Vendor intake, document hashing & re-upload
│       ├── ocr_service.py          # PyMuPDF digital PDF text & layout extraction
│       ├── document_classifier.py  # Legal marker classification & mismatch detector
│       ├── extraction_service.py   # Field extraction with confidence scores & regex
│       ├── pan_verifier.py         # Setu PAN verification client & simulator
│       ├── gst_verifier.py         # Setu GST verification client & simulator
│       ├── bank_verifier.py        # NPCI simulated ₹1 Penny-Drop verification
│       ├── cin_verifier.py         # Mock MCA Company Master Data verification
│       ├── matching_service.py     # RapidFuzz multi-way cross-document matrix
│       ├── risk_service.py         # Rule-based composite risk scoring engine
│       ├── decision_service.py     # Decision generator & policy evaluator
│       ├── followup_service.py     # Primary USP: Email draft, edit & resolution
│       ├── audit_service.py        # Append-only SHA-256 chained audit ledger
│       └── pipeline_service.py     # 7-Stage pipeline orchestrator
├── frontend/
│   ├── src/
│   │   ├── api.js                  # Centralized REST API client
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Top navigation with live status badges
│   │   │   ├── StatsCards.jsx      # Metrics overview cards
│   │   │   ├── VendorList.jsx      # Searchable & filterable vendor queue
│   │   │   ├── PipelineVisualizer.jsx # Interactive live 8-step execution bar
│   │   │   ├── DiscrepancyCenter.jsx  # Primary USP: Discrepancy cards & email modal
│   │   │   ├── CrossDocumentMatrix.jsx# Multi-way reconciliation table
│   │   │   ├── DocumentInspector.jsx  # Document previews & OCR confidence table
│   │   │   ├── VerificationRegistryView.jsx # Setu, Bank & MCA registry logs
│   │   │   ├── AuditTrailView.jsx     # Cryptographic timeline with SHA-256 hashes
│   │   │   ├── VendorIntakePortal.jsx # Self-service onboarding wizard
│   │   │   ├── DemoShowcase.jsx       # 1-Click 5-minute guided demonstration suite
│   │   │   ├── DecisionModal.jsx      # Procurement officer override modal + confetti
│   │   │   └── VendorDetailsView.jsx  # Comprehensive vendor inspection workspace
│   │   ├── App.jsx                 # Master application controller
│   │   ├── index.css               # Tailwind CSS & custom styling
│   │   └── main.jsx                # React root mount
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── start.sh                        # One-command full-stack startup script
└── README.md                       # Complete documentation
```

---

## 🔒 Security & Verification Distinction

As mandated by Section 7 of the specification:
- Real API integrations for Setu PAN and GST are provided behind common interfaces. When sandbox credentials (`SETU_CLIENT_ID`, `SETU_CLIENT_SECRET`) are present in environment variables, live endpoints are used; otherwise, high-fidelity sandbox simulation is employed.
- All simulated verification responses (Mock Penny-Drop, Mock MCA Registry) are **clearly labeled as simulated** in both API responses and UI badges.
- All verification steps produce an **evidence-backed SHA-256 hash chain** stored in SQLite that proves tamper-resistance.

---

## 📄 License

MIT License — Credora Vendor Verification Project.
