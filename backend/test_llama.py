from services.extraction import extract_claim_data

text = """
Patient: Rajesh Kumar

Doctor: Dr Sharma

Diagnosis: Viral Fever

Treatment: Consultation

Amount: 1500

Date: 2024-11-01
"""

result = extract_claim_data(text)

print(result)