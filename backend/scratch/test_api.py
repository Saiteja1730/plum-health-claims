import json, urllib.request

data = json.dumps({
    "member_id": "EMP001",
    "member_name": "Rajesh Kumar",
    "member_age": 30,
    "treatment_date": "2026-06-01",
    "claim_amount": 1200,
    "diagnosis": "Common Cold",
    "treatment_type": "consultation",
    "doctor_name": "Dr. A. K. Sharma",
    "doctor_registration": "DL/12345/2018",
    "hospital_name": "Max Clinic Delhi",
    "prescription_uploaded": True,
    "bill_uploaded": True,
    "report_uploaded": False,
    "document_patient_name": "Rajesh Kumar",
    "prescription_date": "01/06/2026",
    "bill_date": "01/06/2026",
    "extraction_confidence": 0.95,
    "medical_necessity_score": 0.95
}).encode('utf-8')

req = urllib.request.Request('http://127.0.0.1:8000/claims/process', data=data, headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
result = json.loads(resp.read())

print("Decision:", result.get("decision"))
print("Claim ID:", result.get("claim_id"))
print("Approved:", result.get("approved_amount"))
print("Passed rules:", result.get("passed_rules", []))
print("Failed rules:", result.get("failed_rules", []))
print("Timestamp:", result.get("timestamp"))
