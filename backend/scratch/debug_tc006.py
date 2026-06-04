from services.adjudication import AdjudicationService
from models.claim import Claim
from unittest.mock import patch

@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_debug(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP006', 'member_name': 'Kavita Nair', 'covered': True, 'join_date': '2024-10-28'}]
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
    print("Decision:", result.decision)
    print("Reasons:", result.rejection_reasons)

test_debug()
