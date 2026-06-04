from services.adjudication import AdjudicationService
from models.claim import Claim
from unittest.mock import patch

@patch('services.adjudication.members_collection')
@patch('services.adjudication.policies_collection')
@patch('services.adjudication.providers_collection')
@patch('services.adjudication.claim_history_collection')
@patch('services.adjudication.claims_collection')
def test_debug(mock_claims, mock_history, mock_providers, mock_policies, mock_members):
    mock_members.find.return_value = [{'member_id': 'EMP002', 'member_name': 'Priya Singh', 'covered': True, 'join_date': '2024-09-01'}]
    mock_policies.find_one.return_value = {'member_id': 'EMP002', 'active': True, 'annual_limit': 50000, 'annual_used': 10000}
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
    print("Decision:", result.decision)
    print("Reasons:", result.rejection_reasons)
    print("Notes:", result.notes)

test_debug()
