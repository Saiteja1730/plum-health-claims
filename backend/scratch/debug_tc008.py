from services.adjudication import AdjudicationService
from models.claim import Claim
from unittest.mock import patch

@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_debug(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP008', 'member_name': 'Ravi', 'covered': True, 'join_date': '2024-10-30'}]
    mock_policies.find_one.return_value = {'member_id': 'EMP008', 'active': True, 'annual_limit': 50000, 'annual_used': 10000}
    mock_providers.find_one.return_value = {'doctor_registration': 'UP/45678/2016', 'blacklisted': False, 'network_provider': False}
    mock_history.find_one.return_value = None
    mock_claims.count_documents.return_value = 0

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
    print("Decision:", result.decision)
    print("Reasons:", result.rejection_reasons)

test_debug()
