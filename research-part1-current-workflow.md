# Research Part 1: Current Workflow Analysis
## Understanding the Actual Process Before, During, and After Training

**Problem Statement ID:** 26135
**Source:** PMKVY 4.0 Guidelines, CAG Audit Report No. 20 of 2025, NSDC Documentation

---

## 1. BEFORE TRAINING: Registration & Enrollment

### How is a Trainee Registered?

**Source: PMKVY 4.0 Guidelines (September 2023)**

| Step | Process | System |
|------|---------|--------|
| 1 | Candidate registers on Skill India Digital (SID) portal or Mobile App | Skill India Digital Hub (SIDH) |
| 2 | Profile verification through mobile-based OTP (e-KYC) | Aadhaar-based |
| 3 | De-duplication check against existing SID database | SID database |
| 4 | Candidate profiling (fetches data from e-Shram, NCS) | Cross-platform integration |
| 5 | Online counselling for course selection | SID portal |
| 6 | Training Centre selection based on availability and ratings | SID portal |

**Source:** PMKVY 4.0 Guidelines, Chapter V, Section 1.2-1.4

### What Identifiers are Generated?

| Identifier | System | Purpose |
|------------|--------|---------|
| **Aadhaar Number** | UIDAI | Primary identity (12-digit) |
| **Skill India Digital ID** | SIDH | Platform-specific trainee ID |
| **e-Shram UAN** | e-Shram | Universal Account Number for unorganised workers |
| **NCS Registration ID** | NCS | National Career Service ID |
| **Batch ID** | Training Provider | Training batch identifier |
| **Certification ID** | SSC (Sector Skill Council) | Post-assessment certification |

**Key Finding:** There is NO single unified identifier across all skilling programs. Each system generates its own ID.
- Source: CAG Report No. 20 of 2025, Para 2.2

### Is Aadhaar Used?

**YES - Mandatory for PMKVY 4.0**

| Aspect | Details |
|--------|---------|
| Authentication | Aadhaar-based e-KYC via OTP |
| Attendance | Aadhaar Enabled Biometric Attendance System (AEBAS) |
| Certification | Aadhaar validation required before certificate issuance |
| Reward Disbursement | Aadhaar-linked bank account mandatory |
| De-duplication | Based on Aadhaar to prevent same person enrolling twice |

**Source:** PMKVY Process Manual V3.3, Section 3.8

### What Demographic Information is Collected?

**Source: PMKVY Process Manual, Section 6**

| Category | Data Points |
|----------|-------------|
| **Identity** | Aadhaar number/EID, Alternate IDs (Voter's Card, PAN) |
| **Contact** | Mobile number, Email (optional) |
| **Banking** | Bank account number, Bank name, Branch, IFSC code |
| **Demographics** | Name, Age, Date of Birth, Gender, Category (SC/ST/OBC/General) |
| **Education** | Educational qualification, Previous training |
| **Address** | Permanent address, Current address, District, State |
| **Experience** | Prior work experience, Current employment status |
| **Course Details** | Preferred job role, Sector, Training fee |

---

## 2. DURING TRAINING: Attendance, Assessment, Certification

### Attendance Tracking

**Source: PMKVY 4.0 Guidelines, Section 6**

| System | Technology | Purpose |
|--------|------------|---------|
| AEBAS | Aadhaar Enabled Biometric Attendance System | Daily attendance of candidates, trainers, assessors |
| FAAS | Facial Authentication Attendance System | New in PMKVY 4.0 for remote verification |
| Real-time Dashboard | SIDH platform | Live monitoring of attendance |

**Key Finding:** 70% biometric attendance is the assessment-eligibility threshold under PMKVY 4.0

### Assessment Process

**Source: PMKVY Process Manual, Section 3.6**

| Step | Responsibility | System |
|------|----------------|--------|
| 1 | Training Partner uploads batch details | SDMS |
| 2 | SSC registers Assessment Agency | SDMS |
| 3 | Assessor conducts on-site assessment | Physical verification |
| 4 | Candidate provides photo ID proof | Aadhaar/Voter ID/PAN |
| 5 | Assessment results uploaded | SDMS |
| 6 | Results verified by SSC | SDMS |

### Certification

**Source: PMKVY Process Manual, Section 3.9**

| Step | Action | System |
|------|--------|--------|
| 1 | Training Partner uploads Aadhaar details | SDMS |
| 2 | SSC validates Aadhaar | UIDAI authentication |
| 3 | SSC issues certificate | Digital certificate |
| 4 | Certificate dispatched to Training Partner | Physical/Online |
| 5 | Digital certificate available on DigiLocker | DigiLocker integration |

**Key Finding:** Certificate is ONLY issued after successful Aadhaar validation

---

## 3. AFTER TRAINING: The Critical Gap

### How is Placement Recorded?

**Source: PMKVY 4.0 Guidelines, Section 11 + CAG Report**

| Method | Description |
|--------|-------------|
| Training Partner Reports | TP reports placement data to SDMS |
| Rozgar Melas | Job fairs organized by TPs/SSCs/NSDC |
| Apprenticeship Melas | Linked with NAPS/NATS |
| Professional Agencies | May be engaged for placement facilitation |

**CRITICAL FINDING - PMKVY 4.0 Changed the Approach:**
- **PMKVY 1.0-3.0:** Placements were tracked; payments tied to placement outcomes
- **PMKVY 4.0:** Focus shifted to "empower trained candidates to choose their varied career path" through OJT
- **Source:** Lok Sabha Unstarred Question No. 1356 (27/07/2026)

### Who Records Placement?

| Stakeholder | Role |
|-------------|------|
| Training Partner (TP) | Primary reporter of placement data |
| Sector Skill Council (SSC) | Validates and certifies |
| NSDC | Aggregates and reports |
| Candidate (self-report) | Through SIDH portal |

### When is Placement Recorded?

| Timeline | Action |
|----------|--------|
| Post-certification | TP reports initial placement |
| Within 1 year | NSDC tracks candidates through SIDH |
| Quarterly calls | 4 calls in 1 year (mandated) |
| WhatsApp/Chatbot | Automated follow-ups |

### What Qualifies as "Placed"?

| Criteria | Description | Issue |
|----------|-------------|-------|
| Employment | Full-time/part-time job | Self-reported, not always verified |
| Self-employment | Started own business | Difficult to verify |
| Apprenticeship | Under NAPS/NATS | More verifiable through portal |
| Wage employment | Daily/weekly wage work | Often informal, hard to track |

**CAG Finding:** "In Kerala, incorrect placement documents were produced by Training Partners as proof of placement of candidates"
- Source: CAG Report No. 20 of 2025, Para 3.6

### Is Employment Verified?

| Verification Method | Description | Reliability |
|---------------------|-------------|-------------|
| Call Validation (CV) | Third-party calls to verify | Medium |
| Out-Bound Dialling (OBD) | IVR-based feedback | Low-Medium |
| Surprise Visits | Physical verification at employer premises | High but limited |
| Employer Verification | Direct employer contact | Limited scale |
| Candidate Feedback | Self-report through portal | Low (self-reported) |

**CAG Finding:** "bank account details for 95.53 percent of the beneficiaries across states were either entered as zero, left blank, or were not available"
- Source: Indian Express report on CAG findings (December 2025)

### Is Salary Verified?

**NO - This is a major gap.**

| Data Point | Available? |
|------------|------------|
| Starting salary | Sometimes self-reported |
| Current salary | Rarely tracked |
| Salary progression | Not tracked |
| Benefits | Not tracked |

### Is Employment Still Active After 3 Months?

| Tracking Mechanism | Description |
|-------------------|-------------|
| 1-year post-certification tracking | IT-based tracking through SIDH |
| Quarterly calls | 4 calls in 1 year |
| WhatsApp/Chatbot | Automated follow-ups |
| App-based tracking | Through Skill India Digital app |

**PMKVY 3.0 Monitoring Guidelines:** "For monitoring placements, monitoring of reported placed needs to be done including their placement status 6 months and 12 months after initial placement"

### What Happens in Specific Scenarios?

| Scenario | Current Handling | Gap |
|----------|------------------|-----|
| **Self-employment** | Candidate reports as self-employed | No verification mechanism |
| **Migration** | Phone number change causes loss of contact | Major issue |
| **Phone number change** | Training center cannot follow up | No alternative contact mechanism |
| **Job change** | Not tracked | No mechanism to track career progression |
| **Unemployment** | Not systematically recorded | Cannot identify skill gaps |

---

## 4. THE DATA INTEGRATION PROBLEM

### Existing Systems and Their Data

| System | Operator | Data Available | Integration Status |
|--------|----------|----------------|-------------------|
| **Skill India Digital Hub (SIDH)** | MSDE/NSDC | Training, certification, basic tracking | Central platform |
| **e-Shram** | Ministry of Labour | 30.48 crore unorganised workers | Partial integration |
| **National Career Service (NCS)** | Ministry of Labour | 2+ crore jobseekers | Partial integration |
| **Udyam** | Ministry of MSME | MSME registrations | Separate system |
| **NAPS** | MSDE | 52.98 lakh apprentices | Separate portal |
| **NATS** | Ministry of Education | Graduate/diploma apprentices | Separate portal |
| **Mahaswayam** | Maharashtra State | State-level skill/employment data | State portal |

### The Convergence Problem

**Source: CAG Report No. 20 of 2025, Para 2.2**

> "Even after completion of three phases of PMKVY, convergence between efforts of different Central Ministries and between Central and State Departments was not effective."

---

## 5. KEY GAPS IDENTIFIED

| # | Gap | Impact |
|---|-----|--------|
| 1 | **No unified trainee identity** across programs | Cannot track same person across schemes |
| 2 | **Placement data unreliable** | Self-reported, often incorrect |
| 3 | **Salary/wage data not tracked** | Cannot measure economic impact |
| 4 | **Retention data not tracked** | Only placement, not sustainability |
| 5 | **Self-employment not verified** | Difficult to validate |
| 6 | **Phone dependency** | Trainees become unreachable |
| 7 | **Employer non-cooperation** | No incentive to report |
| 8 | **Data fragmentation** | Multiple portals, no single view |
| 9 | **No longitudinal tracking** | Only 1-year post-certification |
| 10 | **Skill gap analysis missing** | Cannot align training with market demand |

---

## 6. STATISTICS THAT MATTER

| Metric | Value | Source |
|--------|-------|--------|
| PMKVY 1.0-3.0 certified candidates (STT/SP) | 56.14 lakh | CAG Report 2025 |
| PMKVY 1.0-3.0 placed candidates | 23.18 lakh (41%) | CAG Report 2025 |
| Candidates with invalid/missing bank details | 94.53% | CAG Report 2025 |
| Payouts pending for candidates | 34+ lakh | CAG Report 2025 |
| e-Shram registrations | 30.48 crore | PIB December 2024 |
| NCS registered jobseekers | 2+ crore | NCS Portal |
| NAPS apprentices (current year) | 5.25 lakh | Lok Sabha Question 2026 |
| Maharashtra NAPS apprentices (2025-26) | 1,18,214 | Lok Sabha Question 2026 |
| Dropouts under PMKVY (2015-2022) | 5,22,538 | Lok Sabha Question 2026 |
| SIDH PMKVY 4.0 registrations | 35.17 lakh | Lok Sabha Question 2026 |

---

## 7. CONCLUSION: THE ACTUAL PROBLEM

The current system is excellent at tracking:
- Registration
- Attendance (biometric)
- Assessment
- Certification
- Basic placement (self-reported)

The current system FAILS at:
- Longitudinal outcome tracking (beyond 1 year)
- Salary/wage verification
- Job retention measurement
- Self-employment verification
- Cross-program identity linkage
- Employer data validation
- Skill gap identification based on outcomes
- Evidence-based policy making

**The problem is NOT about training delivery. The problem is about MEASURING WHAT HAPPENS AFTER TRAINING.**

---

## SOURCES

1. PMKVY 4.0 Guidelines (September 2023)
2. PMKVY Process Manual V3.3
3. CAG Performance Audit Report No. 20 of 2025
4. MSDE Monitoring Guidelines PMKVY 3.0
5. Lok Sabha Unstarred Questions (2026)
6. PIB Press Releases
7. Skill India Digital Hub - https://www.skillindiadigital.gov.in/
8. Indian Express CAG Report Coverage (December 2025)
