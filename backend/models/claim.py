from pydantic import BaseModel
from typing import Optional


class Claim(BaseModel):
    id: Optional[str] = None

    # -----------------------------
    # Member Information
    # -----------------------------

    member_id: str

    member_name: str

    member_age: Optional[int] = None

    member_join_date: Optional[str] = None

    # -----------------------------
    # Treatment Information
    # -----------------------------

    treatment_date: str

    claim_submission_date: Optional[str] = None

    diagnosis: str

    treatment_type: str

    claim_amount: float

    bill_amount: Optional[float] = None

    procedures: list[str] = []

    # -----------------------------
    # Provider Information
    # -----------------------------

    doctor_name: str

    doctor_registration: str

    hospital_name: Optional[str] = None

    network_hospital: bool = False

    # -----------------------------
    # Documents
    # -----------------------------
    document_patient_name: Optional[str] = None

    prescription_uploaded: bool = True

    bill_uploaded: bool = True

    report_uploaded: bool = False

    prescription_date: Optional[str] = None

    bill_date: Optional[str] = None

    report_date: Optional[str] = None

    # -----------------------------
    # Authorization
    # -----------------------------

    pre_authorized: bool = False

    cashless_request: bool = False

    # -----------------------------
    # Fraud / History
    # -----------------------------

    previous_claims_same_day: int = 0

    # -----------------------------
    # AI Extraction
    # -----------------------------

    extracted_from_document: bool = False

    extraction_confidence: float = 1.0

    medical_necessity_score: float = 1.0

    source_document_name: Optional[str] = None

    # -----------------------------
    # Policy Metadata
    # -----------------------------

    policy_active: bool = True

    member_covered: bool = True

    annual_limit: float = 50000

    annual_used: float = 0

    policy_join_date: Optional[str] = None

    # -----------------------------
    # Internal Adjudication Flags
    # -----------------------------

    provider_blacklisted: bool = False

    submission_days: int = 0

    service_category: Optional[str] = None

    audit_trail: Optional[list[dict]] = []

    field_confidence: Optional[dict] = {}