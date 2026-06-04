from pydantic import BaseModel
from typing import List, Dict, Any

class Decision(BaseModel):

    decision: str
    approved_amount: float = 0
    rejection_reasons: List[str] = []

    confidence_score: float

    notes: str = ""
    next_steps: str = ""

    flags: List[str] = []

    cashless_approved: bool = False

    network_discount: float = 0

    original_amount: float = 0
    excluded_amount: float = 0
    copay_applied: float = 0
    policy_limit_applied: float = 0

    rule_trace: Dict[str, str] = {}

    triggered_rules: List[str] = []
    failed_rules: List[str] = []
    passed_rules: List[str] = []

    audit_trace: List[str] = []

    completeness_score: float = 0

    review_category: str = ""

    provider_status: str = ""
    provider_cashless: str = ""

    waiting_period_trace: List[Dict[str, Any]] = []

    days_since_joining: int = 0

    bill_uploaded: bool = False
    prescription_uploaded: bool = False
    report_uploaded: bool = False

    missing_fields: List[str] = []