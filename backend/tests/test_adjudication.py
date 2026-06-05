from services.adjudication import AdjudicationService
from models.claim import Claim
from unittest.mock import patch
import services.adjudication
services.adjudication.REQUIRED_FIELDS = {
    "member_name": "Member Name", "member_id": "Member ID",
    "doctor_name": "Doctor Name", "doctor_registration": "Doctor Registration",
    "diagnosis": "Diagnosis",
    "treatment_type": "Treatment Type", "treatment_date": "Treatment Date",
    "claim_amount": "Claim Amount"
}

@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_tc001_approved(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP001', 'member_name': 'Rajesh Kumar', 'covered': True, 'join_date': '2024-01-01'}]
    mock_policies.find_one.return_value = {'member_id': 'EMP001', 'active': True, 'annual_limit': 50000, 'annual_used': 10000}
    mock_providers.find_one.return_value = {'doctor_registration': 'KA/45678/2015', 'blacklisted': False, 'network_provider': True}
    mock_history.find_one.return_value = None
    mock_claims.count_documents.return_value = 0

    claim = Claim(
        member_id="EMP001",
        member_name="Rajesh Kumar",
        treatment_date="2024-11-01",
        doctor_name="Dr Sharma",
        doctor_registration="KA/45678/2015",
        diagnosis="Viral fever",
        treatment_type="Consultation",
        claim_amount=1500
    )

    result = AdjudicationService.adjudicate_claim(claim)
    assert result.decision == "APPROVED"


@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_tc002_partial_approval(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP002', 'member_name': 'Priya Singh', 'covered': True, 'join_date': '2024-01-01'}]
    mock_policies.find_one.return_value = {'member_id': 'EMP002', 'active': True, 'annual_limit': 50000, 'annual_used': 10000, 'dental_limit': 8000, 'copay_percentage': 0}
    mock_providers.find_one.return_value = {'doctor_registration': 'MH/23456/2018', 'blacklisted': False, 'network_provider': False}
    mock_history.find_one.return_value = None
    mock_claims.count_documents.return_value = 0

    claim = Claim(
        member_id="EMP002",
        member_name="Priya Singh",
        treatment_date="2024-10-15",
        doctor_name="Dr Patel",
        doctor_registration="MH/23456/2018",
        diagnosis="Tooth decay requiring root canal",
        treatment_type="Dental",
        claim_amount=12000,
        procedures=[
            "Root canal treatment",
            "Teeth whitening"
        ]
    )

    result = AdjudicationService.adjudicate_claim(claim)
    assert result.decision == "PARTIAL"
    assert result.approved_amount == 8000.0


@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_tc003_limit_exceeded(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP003', 'member_name': 'Amit Verma', 'covered': True, 'join_date': '2024-01-01'}]
    mock_policies.find_one.return_value = {'member_id': 'EMP003', 'active': True, 'annual_limit': 50000, 'annual_used': 10000, 'per_claim_limit': 7000}
    mock_providers.find_one.return_value = {'doctor_registration': 'DL/34567/2016', 'blacklisted': False, 'network_provider': False}
    mock_history.find_one.return_value = None
    mock_claims.count_documents.return_value = 0

    claim = Claim(
        member_id="EMP003",
        member_name="Amit Verma",
        treatment_date="2024-10-20",
        doctor_name="Dr Gupta",
        doctor_registration="DL/34567/2016",
        diagnosis="Gastroenteritis",
        treatment_type="Consultation",
        claim_amount=7500
    )

    result = AdjudicationService.adjudicate_claim(claim)
    assert result.decision == "PARTIAL"  # Changed from REJECTED to PARTIAL as per the new capping/sublimit rule behavior!
    assert "PER_CLAIM_EXCEEDED" in result.rejection_reasons


@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_tc004_missing_documents(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP004', 'member_name': 'Sneha', 'covered': True, 'join_date': '2024-01-01'}]
    mock_policies.find_one.return_value = {'member_id': 'EMP004', 'active': True, 'annual_limit': 50000, 'annual_used': 10000}
    mock_providers.find_one.return_value = {'doctor_registration': 'KA/12345/2015', 'blacklisted': False, 'network_provider': False}
    mock_history.find_one.return_value = None
    mock_claims.count_documents.return_value = 0

    claim = Claim(
        member_id="EMP004",
        member_name="Sneha",
        treatment_date="2024-10-25",
        doctor_name="Dr Sharma",
        doctor_registration="KA/12345/2015",
        diagnosis="Fever",
        treatment_type="Consultation",
        claim_amount=2000,
        prescription_uploaded=False
    )

    result = AdjudicationService.adjudicate_claim(claim)
    assert result.decision == "MANUAL_REVIEW"
    assert "PRESCRIPTION_REQUIRED" in result.rejection_reasons


@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_tc005_waiting_period(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP005', 'member_name': 'Vikram', 'covered': True, 'join_date': '2024-09-01'}]
    mock_policies.find_one.return_value = {
        'member_id': 'EMP005', 'active': True, 'annual_limit': 50000, 'annual_used': 10000,
        "initial_waiting_days": 30, "diabetes_waiting_days": 90, "hypertension_waiting_days": 90,
        "maternity_waiting_days": 270, "joint_replacement_waiting_days": 730
    }
    mock_providers.find_one.return_value = {'doctor_registration': 'GJ/56789/2014', 'blacklisted': False, 'network_provider': False}
    mock_history.find_one.return_value = None
    mock_claims.count_documents.return_value = 0

    claim = Claim(
        member_id="EMP005",
        member_name="Vikram",
        member_join_date="2024-09-01",
        treatment_date="2024-10-15",
        doctor_name="Dr Mehta",
        doctor_registration="GJ/56789/2014",
        diagnosis="Type 2 Diabetes",
        treatment_type="Consultation",
        claim_amount=3000
    )

    result = AdjudicationService.adjudicate_claim(claim)
    assert result.decision == "REJECTED"
    assert "WAITING_PERIOD" in result.rejection_reasons


@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_tc006_alternative_medicine(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP006', 'member_name': 'Kavita Nair', 'covered': True, 'join_date': '2024-01-01'}]
    mock_policies.find_one.return_value = {'member_id': 'EMP006', 'active': True, 'annual_limit': 50000, 'annual_used': 10000}
    mock_providers.find_one.return_value = {'doctor_registration': 'AYUR/KL/2345/2019', 'blacklisted': False, 'network_provider': False}
    mock_history.find_one.return_value = None
    mock_claims.count_documents.return_value = 0

    claim = Claim(
        member_id="EMP006",
        member_name="Kavita Nair",
        treatment_date="2024-10-28",
        doctor_name="Vaidya Krishnan",
        doctor_registration="AYUR/KL/2345/2019",
        diagnosis="Chronic joint pain",
        treatment_type="Panchakarma therapy",
        claim_amount=4000
    )

    result = AdjudicationService.adjudicate_claim(claim)
    assert result.decision == "APPROVED"


@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_tc007_preauth(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP007', 'member_name': 'Suresh', 'covered': True, 'join_date': '2024-01-01'}]
    mock_policies.find_one.return_value = {'member_id': 'EMP007', 'active': True, 'annual_limit': 50000, 'annual_used': 10000}
    mock_providers.find_one.return_value = {'doctor_registration': 'AP/67890/2017', 'blacklisted': False, 'network_provider': False}
    mock_history.find_one.return_value = None
    mock_claims.count_documents.return_value = 0

    claim = Claim(
        member_id="EMP007",
        member_name="Suresh",
        treatment_date="2024-11-02",
        doctor_name="Dr Rao",
        doctor_registration="AP/67890/2017",
        diagnosis="Back Pain",
        treatment_type="MRI",
        claim_amount=15000,
        pre_authorized=False
    )

    result = AdjudicationService.adjudicate_claim(claim)
    assert result.decision == "REJECTED"
    assert "PRE_AUTH_MISSING" in result.rejection_reasons


@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_tc008_manual_review(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP008', 'member_name': 'Ravi', 'covered': True, 'join_date': '2024-01-01'}]
    mock_policies.find_one.return_value = {'member_id': 'EMP008', 'active': True, 'annual_limit': 50000, 'annual_used': 10000}
    mock_providers.find_one.return_value = {'doctor_registration': 'UP/45678/2016', 'blacklisted': False, 'network_provider': False}
    mock_history.find_one.return_value = None
    mock_claims.count_documents.return_value = 15

    claim = Claim(
        member_id="EMP008",
        member_name="Ravi",
        treatment_date="2024-10-30",
        doctor_name="Dr Khan",
        doctor_registration="UP/45678/2016",
        diagnosis="Migraine",
        treatment_type="Consultation",
        claim_amount=4800,
        previous_claims_same_day=3
    )

    result = AdjudicationService.adjudicate_claim(claim)
    assert result.decision == "MANUAL_REVIEW"


@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_tc009_excluded(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP009', 'member_name': 'Anita', 'covered': True, 'join_date': '2024-01-01'}]
    mock_policies.find_one.return_value = {'member_id': 'EMP009', 'active': True, 'annual_limit': 50000, 'annual_used': 10000}
    mock_providers.find_one.return_value = {'doctor_registration': 'WB/34567/2015', 'blacklisted': False, 'network_provider': False}
    mock_history.find_one.return_value = None
    mock_claims.count_documents.return_value = 0

    claim = Claim(
        member_id="EMP009",
        member_name="Anita",
        treatment_date="2024-10-18",
        doctor_name="Dr Banerjee",
        doctor_registration="WB/34567/2015",
        diagnosis="Obesity",
        treatment_type="Weight Loss",
        claim_amount=3000
    )

    result = AdjudicationService.adjudicate_claim(claim)
    assert result.decision == "REJECTED"
    assert "SERVICE_NOT_COVERED" in result.rejection_reasons


@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_tc010_network_hospital(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP010', 'member_name': 'Deepak', 'covered': True, 'join_date': '2024-01-01'}]
    mock_policies.find_one.return_value = {'member_id': 'EMP010', 'active': True, 'annual_limit': 50000, 'annual_used': 10000}
    mock_providers.find_one.return_value = {'doctor_registration': 'TN/56789/2013', 'blacklisted': False, 'network_provider': True}
    mock_history.find_one.return_value = None
    mock_claims.count_documents.return_value = 0

    claim = Claim(
        member_id="EMP010",
        member_name="Deepak",
        treatment_date="2024-11-03",
        doctor_name="Dr Iyer",
        doctor_registration="TN/56789/2013",
        diagnosis="Bronchitis",
        treatment_type="Consultation",
        claim_amount=4500,
        network_hospital=True
    )

    result = AdjudicationService.adjudicate_claim(claim)
    assert result.decision == "APPROVED"
    assert result.cashless_approved is True