from models.claim import Claim
from models.decision import Decision
from database.mongodb import (
    members_collection, policies_collection, providers_collection,
    claim_history_collection, claims_collection
)
from datetime import datetime
import re
import logging

# Setup logging
logger = logging.getLogger(__name__)

# ==================================================
# CONFIGURATION
# ==================================================

# Financial Limits
PER_CLAIM_LIMIT = 7000
MIN_CLAIM_AMOUNT = 500
COPAY_PERCENTAGE = 10
HIGH_VALUE_THRESHOLD = 25000

# Completeness Score Thresholds
COMPLETENESS_CRITICAL = 40
COMPLETENESS_WARNING = 60

# Date mismatch threshold (in days)
DATE_MISMATCH_THRESHOLD = 30

# Exclusions List
EXCLUSIONS = [
    "weight loss", "cosmetic procedure", "experimental treatment",
    "obesity", "bariatric", "lasik", "infertility", "hiv", "aids",
    "alcoholism", "drug abuse", "adventure sports"
]

# Waiting Period Defaults (in days)
WAITING_PERIODS = {
    "initial": 30, "diabetes": 90, "hypertension": 90,
    "maternity": 270, "joint_replacement": 730
}

# Service Coverage
COVERED_SERVICES = [
    "consultation", "diagnostic", "pharmacy", "dental", "vision",
    "mri", "ct scan", "laboratory", "ayurveda", "homeopathy", "panchakarma therapy"
]

DIAGNOSTIC_SERVICES = ["diagnostic", "mri", "ct scan", "laboratory"]

# Default Sub-limits
DEFAULT_DENTAL_LIMIT = 5000
DEFAULT_VISION_LIMIT = 4000
DEFAULT_PER_CLAIM_LIMIT = 7000

# Decision Priority
DECISION_PRIORITY = {"REJECTED": 4, "MANUAL_REVIEW": 3, "PARTIAL": 2, "APPROVED": 1}

# Required Fields
REQUIRED_FIELDS = {
    "member_name": "Member Name", "member_id": "Member ID",
    "doctor_name": "Doctor Name", "doctor_registration": "Doctor Registration",
    "hospital_name": "Hospital/Clinic Name", "diagnosis": "Diagnosis",
    "treatment_type": "Treatment Type", "treatment_date": "Treatment Date",
    "claim_amount": "Claim Amount", "prescription_date": "Prescription Date",
    "bill_date": "Bill Date"
}

DOCTOR_REG_PATTERN = r"^[A-Z]{2,4}(/[A-Z]{2})?/\d+/\d{4}$"

# Document type keywords for OCR detection
DOCUMENT_TYPE_KEYWORDS = {
    "bill": ["invoice", "bill", "receipt", "payment", "amount", "total", "tax"],
    "prescription": ["prescription", "rx", "dosage", "medication", "sig", "take", "tablet", "capsule"],
    "report": ["lab report", "diagnostic report", "test results", "pathology", "radiology", 
               "mri report", "ct report", "x-ray", "ultrasound", "blood test", "urine test"]
}

# ==================================================
# UTILITY FUNCTIONS
# ==================================================

def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            pass
    return None

def detect_document_type(ocr_text):
    """
    Detect document type from OCR extracted text.
    Returns: 'bill', 'prescription', 'report', or 'unknown'
    """
    if not ocr_text:
        return 'unknown'
    
    ocr_text_lower = ocr_text.lower()
    
    # Check for prescription first (most specific)
    prescription_score = sum(1 for keyword in DOCUMENT_TYPE_KEYWORDS["prescription"] if keyword in ocr_text_lower)
    if prescription_score >= 2:
        return 'prescription'
    
    # Check for report
    report_score = sum(1 for keyword in DOCUMENT_TYPE_KEYWORDS["report"] if keyword in ocr_text_lower)
    if report_score >= 2:
        return 'report'
    
    # Check for bill
    bill_score = sum(1 for keyword in DOCUMENT_TYPE_KEYWORDS["bill"] if keyword in ocr_text_lower)
    if bill_score >= 2:
        return 'bill'
    
    return 'unknown'

# ==================================================
# ADJUDICATION SERVICE
# ==================================================

class AdjudicationService:
    
    @staticmethod
    def adjudicate_claim(claim: Claim) -> Decision:
        state = AdjudicationService._init_state(claim)
        
        # Log extracted dates
        AdjudicationService._log_extracted_dates(claim)
        
        AdjudicationService._validate_completeness(state, claim)
        AdjudicationService._validate_required_fields(state, claim)
        AdjudicationService._validate_ocr_confidence(state, claim)
        AdjudicationService._validate_documents(state, claim)
        AdjudicationService._validate_member(state, claim)
        AdjudicationService._validate_policy(state, claim)
        AdjudicationService._validate_waiting_period(state, claim)
        AdjudicationService._validate_provider(state, claim)
        AdjudicationService._validate_patient_mismatch(state, claim)
        AdjudicationService._validate_dates(state, claim)
        AdjudicationService._validate_coverage(state, claim)
        AdjudicationService._validate_duplicate(state, claim)
        AdjudicationService._validate_fraud(state, claim)
        AdjudicationService._validate_limits(state, claim)
        
        return AdjudicationService._calculate_pricing(state, claim)
    
    @staticmethod
    def _init_state(claim):
        return {
            "decision_status": "APPROVED",
            "rejection_reasons": [],
            "audit_trace": [],
            "waiting_period_trace": [],
            "days_since_joining": 0,
            "rule_trace": {
                "MANDATORY_FIELDS": "PASS", "DOCUMENT_COMPLETENESS": "PASS",
                "MEMBER_VALIDATION": "PASS", "POLICY_VALIDATION": "PASS",
                "ANNUAL_LIMIT": "PASS", "WAITING_PERIOD": "PASS",
                "DOCTOR_REG": "PASS", "PROVIDER_BLACKLIST": "PASS",
                "PATIENT_MISMATCH": "PASS", "DATE_MISMATCH": "PASS",
                "LATE_SUBMISSION": "PASS", "DATE_VALIDATION": "PASS",
                "SERVICE_COVERAGE": "PASS", "MINIMUM_CLAIM": "PASS",
                "EXCLUDED_CONDITION": "PASS", "MEDICAL_NECESSITY": "PASS",
                "DUPLICATE_CLAIM": "PASS", "FRAUD_CHECK": "PASS",
                "HIGH_VALUE_CLAIM": "PASS", "PER_CLAIM_LIMIT": "PASS",
                "MRI_PRE_AUTH": "PASS", "DIAGNOSTIC_REPORT": "PASS",
                "FREQUENT_CLAIMS_CHECK": "PASS", "NETWORK_DISCOUNT": "INFO",
                "CASHLESS_APPROVED": "INFO", "PRICING_CALCULATION": "PASS"
            },
            "review_category": "",
            "notes": [],
            "next_steps": "Proceed with payment processing",
            "adjusted_claim_amount": claim.claim_amount,
            "member": None,
            "policy": None,
            "is_network": False,
            "provider_status": "Out of Network",
            "provider_cashless": "Not Eligible",
            "limit_applied": 0,
            "completeness_score": 0
        }
    
    @staticmethod
    def _log_extracted_dates(claim):
        """Log extracted dates for audit trail"""
        logger.info(f"Claim {claim.id} - Extracted dates: "
                   f"bill_date={claim.bill_date}, "
                   f"prescription_date={claim.prescription_date}, "
                   f"report_date={claim.report_date}")
    
    @staticmethod
    def _set_status(state, new_status):
        if DECISION_PRIORITY.get(new_status, 1) > DECISION_PRIORITY.get(state["decision_status"], 1):
            state["decision_status"] = new_status
    
    @staticmethod
    def _reject_rule(state, rule_name, reason, review_category, note, next_step):
        """For rules that should result in REJECTED decision"""
        AdjudicationService._set_status(state, "REJECTED")
        
        if reason not in state["rejection_reasons"]:
            state["rejection_reasons"].append(reason)
        if rule_name:
            state["rule_trace"][rule_name] = "FAIL"
        state["notes"].append(note)
        state["next_steps"] = next_step
        if review_category:
            state["review_category"] = review_category
        state["audit_trace"].append(f"{rule_name if rule_name else 'RULE'}: REJECTED - {note[:100]}")
    
    @staticmethod
    def _manual_review_rule(state, rule_name, reason, review_category, note, next_step):
        """For rules that should result in MANUAL_REVIEW decision"""
        AdjudicationService._set_status(state, "MANUAL_REVIEW")
        
        if reason not in state["rejection_reasons"]:
            state["rejection_reasons"].append(reason)
        if rule_name:
            state["rule_trace"][rule_name] = "FAIL"
        state["notes"].append(note)
        state["next_steps"] = next_step
        if review_category:
            state["review_category"] = review_category
        state["audit_trace"].append(f"{rule_name if rule_name else 'RULE'}: MANUAL_REVIEW - {note[:100]}")
    
    # ==================================================
    # VALIDATION FUNCTIONS
    # ==================================================
    
    @staticmethod
    def _validate_completeness(state, claim):
        """
        Calculate completeness score dynamically from actual extracted fields and uploaded documents.
        Document upload flags are determined by OCR detection, not hardcoded.
        """
        score_items = [
            ("member_name", bool(claim.member_name)),
            ("member_id", bool(claim.member_id)),
            ("hospital_name", bool(claim.hospital_name)),
            ("doctor_name", bool(claim.doctor_name)),
            ("doctor_registration", bool(claim.doctor_registration)),
            ("diagnosis", bool(claim.diagnosis)),
            ("treatment_type", bool(claim.treatment_type)),
            ("claim_amount", bool(claim.claim_amount and claim.claim_amount > 0)),
            ("bill_uploaded", claim.bill_uploaded),  # From OCR detection
            ("prescription_uploaded", claim.prescription_uploaded),  # From OCR detection
            ("report_uploaded", claim.report_uploaded)  # From OCR detection
        ]
        
        # Calculate completeness score properly
        present = sum(1 for _, present in score_items if present)
        completeness_score = round((present / len(score_items)) * 100, 2)
        state["completeness_score"] = completeness_score
        
        logger.info(f"Claim {claim.id} - Completeness score: {completeness_score}% "
                   f"({present}/{len(score_items)} fields present)")
        
        if completeness_score < COMPLETENESS_CRITICAL:
            AdjudicationService._manual_review_rule(state, "DOCUMENT_COMPLETENESS", "Incomplete Documentation",
                "MISSING_DOCUMENTS", f"Document completeness score ({completeness_score:.0f}%) falls below {COMPLETENESS_CRITICAL}% (Extraction Failed)",
                "Auditor must manually re-extract or key in all data")
        elif completeness_score < COMPLETENESS_WARNING:
            AdjudicationService._manual_review_rule(state, "DOCUMENT_COMPLETENESS", "Incomplete Documentation",
                "MISSING_DOCUMENTS", f"Document completeness score ({completeness_score:.0f}%) is below {COMPLETENESS_WARNING}%",
                "Auditor must request missing details from claimant")
    
    @staticmethod
    def _validate_required_fields(state, claim):
        for attr, label in REQUIRED_FIELDS.items():
            val = getattr(claim, attr, None)
            is_missing = (attr == "claim_amount" and (val is None or val <= 0)) or (attr != "claim_amount" and (not val or str(val).strip() == ""))
            if is_missing:
                AdjudicationService._manual_review_rule(state, "MANDATORY_FIELDS", f"Missing {label}",
                    "MISSING_DOCUMENTS", f"Missing {label}", "Request missing information")
                break
    
    @staticmethod
    def _validate_ocr_confidence(state, claim):
        if claim.extraction_confidence < 0.85:
            AdjudicationService._manual_review_rule(state, None, "OCR Confidence Too Low",
                "DATA_MISMATCH", f"OCR confidence too low: {claim.extraction_confidence:.2%}", "Manual verification required")
    
    @staticmethod
    def _validate_documents(state, claim):
        dates_to_check = [claim.treatment_date, claim.bill_date, claim.prescription_date]
        if claim.report_uploaded:
            dates_to_check.append(claim.report_date)
        
        if any(d and parse_date(d) is None for d in dates_to_check):
            AdjudicationService._manual_review_rule(state, "DATE_VALIDATION", "Missing or Unreadable Dates",
                "DATA_MISMATCH", "Missing or unreadable dates in documents", "Verify all dates")
        
        if not claim.bill_uploaded:
            AdjudicationService._manual_review_rule(state, "MANDATORY_FIELDS", "Missing Bill",
                "MISSING_DOCUMENTS", "Bill/Invoice document not detected in uploaded files", 
                "Please upload bill/invoice document")
        
        if not claim.prescription_uploaded:
            AdjudicationService._manual_review_rule(state, "MANDATORY_FIELDS", "Missing Prescription",
                "MISSING_DOCUMENTS", "Prescription document not detected in uploaded files",
                "Please upload prescription document")
        
        # Log document detection results
        logger.info(f"Claim {claim.id} - Document detection: "
                   f"bill={claim.bill_uploaded}, "
                   f"prescription={claim.prescription_uploaded}, "
                   f"report={claim.report_uploaded}")
    
    @staticmethod
    def _validate_member(state, claim):
        matching_members = []
        if claim.member_id:
            matching_members = list(members_collection.find({"member_id": claim.member_id}))
        
        if not matching_members and claim.member_name:
            name_query = claim.member_name.strip()
            matching_members = list(members_collection.find({
                "member_name": {"$regex": f"^{re.escape(name_query)}$", "$options": "i"}
            }))
            if not matching_members:
                matching_members = list(members_collection.find({
                    "member_name": {"$regex": re.escape(name_query), "$options": "i"}
                }))
        
        if not matching_members:
            AdjudicationService._manual_review_rule(state, "MEMBER_VALIDATION", "MEMBER_NOT_FOUND",
                "MISSING_DOCUMENTS", "Member records not found in registry database",
                "Manual review required to verify member identity")
        elif len(matching_members) > 1:
            AdjudicationService._manual_review_rule(state, "MEMBER_VALIDATION", "Multiple Member Records",
                "POLICY_EXCEPTION", "Multiple matching member records found for the given name",
                "Auditor must manually verify the correct Member ID")
            state["member"] = matching_members[0]
        else:
            state["member"] = matching_members[0]
            if not state["member"].get("covered", True) or not claim.member_covered:
                AdjudicationService._reject_rule(state, "MEMBER_VALIDATION", "MEMBER_NOT_COVERED",
                    "POLICY_EXCEPTION", "Member is not active on employer coverage list",
                    "Reject claim and notify member")
    
    @staticmethod
    def _validate_policy(state, claim):
        if not state["member"]:
            return
        
        member_id_to_query = state["member"].get("member_id") or claim.member_id
        state["policy"] = policies_collection.find_one({"member_id": member_id_to_query})
        
        if not state["policy"]:
            AdjudicationService._manual_review_rule(state, "POLICY_VALIDATION", "POLICY_NOT_FOUND",
                "MISSING_DOCUMENTS", "No policy found for member", "Manual review required to verify policy status")
            return
        
        if not state["policy"].get("active", True) or not claim.policy_active:
            AdjudicationService._reject_rule(state, "POLICY_VALIDATION", "POLICY_INACTIVE",
                "POLICY_EXCEPTION", "Insured policy status is inactive or expired",
                "Notify member of coverage lapse status")
            return
        
        annual_limit = state["policy"].get("annual_limit", 50000)
        annual_used = state["policy"].get("annual_used", 0)
        
        if annual_used + state["adjusted_claim_amount"] > annual_limit:
            AdjudicationService._reject_rule(state, "ANNUAL_LIMIT", "ANNUAL_LIMIT_EXCEEDED",
                "POLICY_EXCEPTION", "Cumulative claims exceed policy annual cap limit",
                "Reject payout due to exhausted annual limit")
            state["rule_trace"]["POLICY_VALIDATION"] = "FAIL"
    
    @staticmethod
    def _validate_waiting_period(state, claim):
        # Run waiting period only when BOTH member AND policy exist
        if not state["member"] or not state["policy"]:
            return
        
        join_dt = None
        if state["member"]:
            try:
                join_dt = datetime.strptime(state["member"].get("join_date", "2024-01-01"), "%Y-%m-%d")
            except:
                pass
        
        if not join_dt:
            try:
                join_dt = datetime.strptime(claim.member_join_date or "01/01/2024", "%d/%m/%Y")
            except:
                join_dt = datetime(2024, 1, 1)
        
        try:
            treatment_dt = datetime.strptime(claim.treatment_date, "%Y-%m-%d") if "-" in claim.treatment_date else datetime.strptime(claim.treatment_date, "%d/%m/%Y")
        except:
            treatment_dt = datetime.now()
        
        days_since_joining = (treatment_dt - join_dt).days
        state["days_since_joining"] = days_since_joining
        diagnosis_lower = claim.diagnosis.lower()
        
        waiting_checks = [
            ("Initial Waiting Period", WAITING_PERIODS["initial"], True, f"Tenure ({days_since_joining} days) vs required {WAITING_PERIODS['initial']} days"),
            ("Diabetes Waiting Period", WAITING_PERIODS["diabetes"], "diabetes" in diagnosis_lower, f"Diabetes claim requires {WAITING_PERIODS['diabetes']} days"),
            ("Hypertension Waiting Period", WAITING_PERIODS["hypertension"], "hypertension" in diagnosis_lower or "blood pressure" in diagnosis_lower, f"Hypertension claim requires {WAITING_PERIODS['hypertension']} days"),
            ("Maternity Waiting Period", WAITING_PERIODS["maternity"], "maternity" in diagnosis_lower, f"Maternity claim requires {WAITING_PERIODS['maternity']} days"),
            ("Joint Replacement Waiting Period", WAITING_PERIODS["joint_replacement"], "joint replacement" in diagnosis_lower or "knee replacement" in diagnosis_lower, f"Joint replacement requires {WAITING_PERIODS['joint_replacement']} days")
        ]
        
        for rule_name, required, applies, explanation in waiting_checks:
            status = "PASS" if not applies or days_since_joining >= required else "FAIL"
            state["waiting_period_trace"].append({
                "rule": rule_name, "status": status, "required": required, "actual": days_since_joining
            })
            
            if status == "FAIL":
                AdjudicationService._reject_rule(state, "WAITING_PERIOD", "WAITING_PERIOD",
                    "POLICY_EXCEPTION", explanation, "Reject claim as waiting period criteria is not met")
                state["audit_trace"].append(f"Waiting Period: FAILED - {rule_name}")
    
    @staticmethod
    def _validate_provider(state, claim):
        if not re.match(DOCTOR_REG_PATTERN, claim.doctor_registration):
            AdjudicationService._reject_rule(state, "DOCTOR_REG", "DOCTOR_REG_INVALID",
                "DATA_MISMATCH", "Doctor registration structure is invalid", "Request credentials confirmation")
            return
        
        provider = providers_collection.find_one({"doctor_registration": claim.doctor_registration})
        
        if provider:
            if provider.get("blacklisted", False) or claim.provider_blacklisted:
                AdjudicationService._reject_rule(state, "PROVIDER_BLACKLIST", "PROVIDER_BLACKLIST",
                    "FRAUD_SUSPECTED", "Doctor registration resides in the provider blacklist index",
                    "Reject claim and add provider reference log to fraud desk")
                state["provider_status"] = "Blacklisted"
                state["provider_cashless"] = "Not Eligible"
            elif provider.get("network_provider", False) and claim.network_hospital:
                state["is_network"] = True
                state["provider_status"] = "Preferred Network Partner"
                state["provider_cashless"] = "Eligible"
            else:
                state["provider_status"] = "Out of Network"
                state["provider_cashless"] = "Not Eligible"
    
    @staticmethod
    def _validate_patient_mismatch(state, claim):
        if claim.document_patient_name and claim.member_name:
            if claim.document_patient_name.strip().lower() != claim.member_name.strip().lower():
                AdjudicationService._reject_rule(state, "PATIENT_MISMATCH", "PATIENT_MISMATCH",
                    "DATA_MISMATCH", "Patient name on attachment does not match policy database name record",
                    "Verify name matches or request spouse/dependent records")
    
    @staticmethod
    def _validate_dates(state, claim):
        """
        DATE_MISMATCH triggers only when extracted document dates differ by configured threshold.
        """
        doc_dates = []
        date_sources = []
        
        if claim.bill_date:
            dt = parse_date(claim.bill_date)
            if dt:
                doc_dates.append(dt)
                date_sources.append(("bill", dt))
        
        if claim.prescription_date:
            dt = parse_date(claim.prescription_date)
            if dt:
                doc_dates.append(dt)
                date_sources.append(("prescription", dt))
        
        if claim.report_date and claim.report_uploaded:
            dt = parse_date(claim.report_date)
            if dt:
                doc_dates.append(dt)
                date_sources.append(("report", dt))
        
        # Log all extracted dates for audit
        logger.info(f"Claim {claim.id} - Date validation: {date_sources}")
        
        if len(doc_dates) >= 2:
            date_diff = (max(doc_dates) - min(doc_dates)).days
            logger.info(f"Claim {claim.id} - Max date difference: {date_diff} days (threshold: {DATE_MISMATCH_THRESHOLD})")
            
            if date_diff > DATE_MISMATCH_THRESHOLD:
                AdjudicationService._reject_rule(state, "DATE_MISMATCH", "DATE_MISMATCH",
                    "DATA_MISMATCH", f"Discrepancy between document dates exceeds {DATE_MISMATCH_THRESHOLD} days limit",
                    "Refer back to auditor Desk for date audits")
        
        if claim.submission_days > 30:
            AdjudicationService._reject_rule(state, "LATE_SUBMISSION", "LATE_SUBMISSION",
                "POLICY_EXCEPTION", "OPD claim was submitted past the 30-day policy filing timeline window",
                "Reject late submission file")
        
        today = datetime.now()
        for date_field, date_str in [("treatment", claim.treatment_date), ("bill", claim.bill_date), 
                                      ("prescription", claim.prescription_date), ("report", claim.report_date)]:
            if date_str:
                dt_parsed = parse_date(date_str)
                if dt_parsed and dt_parsed > today:
                    AdjudicationService._reject_rule(state, "DATE_VALIDATION", "INVALID_FUTURE_DATE",
                        "DATA_MISMATCH", f"Document contains future date in {date_field} field", "Verify submitted documents")
                    break
    
    @staticmethod
    def _validate_coverage(state, claim):
        diagnosis_lower = claim.diagnosis.lower()
        
        if claim.treatment_type.lower() not in COVERED_SERVICES:
            AdjudicationService._reject_rule(state, "SERVICE_COVERAGE", "SERVICE_NOT_COVERED",
                "POLICY_EXCEPTION", f"Treatment category '{claim.treatment_type}' not included in basic policy cover",
                "Reject claim")
        
        if claim.treatment_type.lower() == "mri" and not claim.pre_authorized:
            AdjudicationService._reject_rule(state, "MRI_PRE_AUTH", "PRE_AUTH_MISSING",
                "POLICY_EXCEPTION", "MRI treatment requires pre-authorization approval",
                "Reject claim due to missing pre-authorization")
        
        if claim.treatment_type.lower() in DIAGNOSTIC_SERVICES and not claim.report_uploaded:
            AdjudicationService._manual_review_rule(state, "DIAGNOSTIC_REPORT", "Missing Diagnostic Report",
                "MISSING_DOCUMENTS", f"Supporting diagnostic report required for treatment type: {claim.treatment_type}",
                "Request supporting diagnostic report from claimant")
        
        if state["adjusted_claim_amount"] < MIN_CLAIM_AMOUNT:
            AdjudicationService._reject_rule(state, "MINIMUM_CLAIM", "BELOW_MIN_AMOUNT",
                "POLICY_EXCEPTION", f"Claim total is below the policy minimum threshold of ₹{MIN_CLAIM_AMOUNT}",
                "Reject claim file")
        
        for excl in EXCLUSIONS:
            if excl in diagnosis_lower:
                AdjudicationService._reject_rule(state, "EXCLUDED_CONDITION", "EXCLUDED_CONDITION",
                    "POLICY_EXCEPTION", f"Diagnosis references condition exclusion: '{excl}'",
                    "Reject claim due to policy general exclusion list")
                break
        
        if claim.medical_necessity_score < 0.50:
            AdjudicationService._reject_rule(state, "MEDICAL_NECESSITY", "NOT_MEDICALLY_NECESSARY",
                "POLICY_EXCEPTION", f"Diagnosis necessity validation checks score below 50% ({claim.medical_necessity_score * 100:.0f}%)",
                "Reject claim file")
    
    @staticmethod
    def _validate_duplicate(state, claim):
        # Use resolved member_id from DB record if available, else fallback to claim field
        resolved_member_id = state["member"].get("member_id") if state["member"] else claim.member_id
        duplicate = claim_history_collection.find_one({
            "member_id": resolved_member_id,
            "treatment_date": claim.treatment_date,
            "hospital_name": claim.hospital_name,
            "claim_amount": state["adjusted_claim_amount"]
        })
        
        if duplicate:
            AdjudicationService._reject_rule(state, "DUPLICATE_CLAIM", "DUPLICATE_CLAIM",
                "FRAUD_SUSPECTED", "Similar claim transaction match is recorded on historical claims logs",
                "Reject duplication claim")
    
    @staticmethod
    def _validate_fraud(state, claim):
        """
        Frequent claim rule uses real MongoDB claim history.
        Uses the resolved member_id from the DB record (not the defaulted form value)
        so that EMP001 defaults don't trigger false fraud flags for other members.
        """
        # Use resolved member_id from the found DB member record, not the raw form value
        resolved_member_id = state["member"].get("member_id") if state["member"] else claim.member_id
        
        claims_today_count = 0
        if resolved_member_id and claim.treatment_date:
            claims_today_count = claims_collection.count_documents({
                "member_id": resolved_member_id,
                "treatment_date": claim.treatment_date
            })
        
        # Log claim count for audit
        logger.info(f"Claim {claim.id} - Claims on same day: {claims_today_count} for member {resolved_member_id}")
        
        if claims_today_count > 10:
            AdjudicationService._manual_review_rule(state, "FREQUENT_CLAIMS_CHECK", "EXCESSIVE_CLAIM_ACTIVITY",
                "FRAUD_SUSPECTED", f"Member submitted more than 10 claims on the same day ({claims_today_count} claims)",
                "Forward claim to fraud investigation queue")
            state["rule_trace"]["FRAUD_CHECK"] = "FAIL"
    
    @staticmethod
    def _validate_limits(state, claim):
        if state["adjusted_claim_amount"] > HIGH_VALUE_THRESHOLD:
            AdjudicationService._manual_review_rule(state, "HIGH_VALUE_CLAIM", "High Value Claim",
                "HIGH_VALUE_CLAIM", f"High-value claim transaction exceeds standard audit cap of ₹{HIGH_VALUE_THRESHOLD}",
                "Perform auditor manual verification checks")
        
        if not state["policy"]:
            return
        
        dental_limit = state["policy"].get("dental_limit", DEFAULT_DENTAL_LIMIT)
        vision_limit = state["policy"].get("vision_limit", DEFAULT_VISION_LIMIT)
        per_claim_limit = state["policy"].get("per_claim_limit", DEFAULT_PER_CLAIM_LIMIT)
        
        if claim.treatment_type.lower() == "dental" and state["adjusted_claim_amount"] > dental_limit:
            AdjudicationService._set_status(state, "PARTIAL")
            state["limit_applied"] = state["adjusted_claim_amount"] - dental_limit
            state["adjusted_claim_amount"] = dental_limit
            state["notes"].append(f"Dental sublimit of ₹{dental_limit} exceeded")
            state["next_steps"] = "Approve up to sublimit"
            state["rule_trace"]["PER_CLAIM_LIMIT"] = "FAIL"
            
        elif claim.treatment_type.lower() == "vision" and state["adjusted_claim_amount"] > vision_limit:
            AdjudicationService._set_status(state, "PARTIAL")
            state["limit_applied"] = state["adjusted_claim_amount"] - vision_limit
            state["adjusted_claim_amount"] = vision_limit
            state["notes"].append(f"Vision sublimit of ₹{vision_limit} exceeded")
            state["next_steps"] = "Approve up to sublimit"
            state["rule_trace"]["PER_CLAIM_LIMIT"] = "FAIL"
            
        elif state["adjusted_claim_amount"] > per_claim_limit:
            AdjudicationService._set_status(state, "PARTIAL")
            state["limit_applied"] = state["adjusted_claim_amount"] - per_claim_limit
            state["adjusted_claim_amount"] = per_claim_limit
            state["notes"].append(f"Per-claim cap limit of ₹{per_claim_limit} exceeded")
            state["next_steps"] = "Approve up to per-claim limit"
            state["rule_trace"]["PER_CLAIM_LIMIT"] = "FAIL"
        
        if claim.bill_amount is not None and state["adjusted_claim_amount"] > claim.bill_amount:
            AdjudicationService._manual_review_rule(state, "PRICING_CALCULATION", "CLAIM_AMOUNT_MISMATCH",
                "DATA_MISMATCH", f"Claim amount exceeds bill amount", "Manual verification required")
    
    @staticmethod
    def _calculate_pricing(state, claim):
        original_amount = claim.claim_amount
        excluded_amount = 0
        copay_applied = 0
        network_discount = 0
        approved_payable = 0
        
        if state["decision_status"] == "REJECTED":
            approved_payable = 0
            excluded_amount = original_amount
        else:
            base_amt = state["adjusted_claim_amount"]
            
            if state["is_network"]:
                network_discount = base_amt * 0.2
                base_amt = base_amt - network_discount
                state["rule_trace"]["NETWORK_DISCOUNT"] = "SUCCESS"
            
            copay_percentage = state["policy"].get("copay_percentage", COPAY_PERCENTAGE) if state["policy"] else COPAY_PERCENTAGE
            copay_applied = base_amt * (copay_percentage / 100.0)
            approved_payable = base_amt - copay_applied
            excluded_amount = original_amount - approved_payable
        
        cashless_approved = (claim.cashless_request or claim.network_hospital) and state["is_network"]
        if cashless_approved:
            state["rule_trace"]["CASHLESS_APPROVED"] = "SUCCESS"
        
        if state["decision_status"] == "MANUAL_REVIEW" and not state["review_category"]:
            state["review_category"] = "POLICY_EXCEPTION"
        
        failed_rules = [rule for rule, status in state["rule_trace"].items() if status == "FAIL"]
        passed_rules = [rule for rule, status in state["rule_trace"].items() if status == "PASS"]
        
        # Log final decision
        logger.info(f"Claim {claim.id} - Final decision: {state['decision_status']}, "
                   f"approved_amount: {approved_payable}, completeness: {state['completeness_score']}%")
        
        return Decision(
            decision=state["decision_status"],
            approved_amount=round(approved_payable, 2),
            rejection_reasons=state["rejection_reasons"],
            confidence_score=claim.extraction_confidence,
            notes="; ".join(state["notes"]) if state["notes"] else "All validation checks passed successfully.",
            next_steps=state["next_steps"],
            cashless_approved=cashless_approved,
            network_discount=network_discount,
            original_amount=original_amount,
            excluded_amount=round(excluded_amount, 2),
            copay_applied=round(copay_applied, 2),
            policy_limit_applied=round(state["limit_applied"], 2),
            rule_trace=state["rule_trace"],
            triggered_rules=state["rejection_reasons"],
            failed_rules=failed_rules,
            passed_rules=passed_rules,
            audit_trace=state["audit_trace"],
            completeness_score=state["completeness_score"],
            review_category=state["review_category"],
            provider_status=state["provider_status"],
            provider_cashless=state["provider_cashless"],
            waiting_period_trace=state["waiting_period_trace"],
            days_since_joining=state["days_since_joining"],
            # Document upload flags for frontend
            bill_uploaded=claim.bill_uploaded,
            prescription_uploaded=claim.prescription_uploaded,
            report_uploaded=claim.report_uploaded
        )