import json, urllib.request

BASE = "http://127.0.0.1:8000"

def post(path, payload):
    data = json.dumps(payload).encode("utf-8")
    req  = urllib.request.Request(f"{BASE}{path}", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())

BASE_PAYLOAD = dict(
    member_id="EMP001", member_name="Rajesh Kumar", member_age=30,
    treatment_date="2026-06-01",
    doctor_name="Dr. A. K. Sharma", doctor_registration="DL/12345/2018",
    hospital_name="Max Clinic Delhi",
    prescription_uploaded=True, bill_uploaded=True, report_uploaded=False,
    document_patient_name="Rajesh Kumar",
    prescription_date="01/06/2026", bill_date="01/06/2026",
    extraction_confidence=0.95, medical_necessity_score=0.95,
    previous_claims_same_day=0, network_hospital=False,
    pre_authorized=False, cashless_request=False, treatment_type="consultation"
)

def run(title, expected, **overrides):
    payload = {**BASE_PAYLOAD, **overrides}
    r = post("/claims/process", payload)
    status = "PASS" if r["decision"] == expected else f"FAIL (got {r['decision']})"
    print(f"{status} | {title} | expected={expected} | failed={r.get('failed_rules', [])}")

print("\n=== SANDBOX VERIFICATION SUITE ===\n")
run("APPROVED (clean pass)",          "APPROVED",       claim_amount=1200, diagnosis="Common Cold")
run("REJECTED (excluded condition)",  "REJECTED",       claim_amount=4500, diagnosis="Obesity bariatric weight loss")
run("REJECTED (waiting period)",      "REJECTED",       claim_amount=2200, diagnosis="Chronic diabetes checkup",
    member_id="EMP005", member_name="Neha Sharma", document_patient_name="Neha Sharma")
run("REJECTED (policy inactive)",     "REJECTED",       claim_amount=1500, diagnosis="Viral Fever", member_id="EMP003", member_name="Amit Verma", document_patient_name="Amit Verma")
run("REJECTED (patient mismatch)",    "REJECTED",       claim_amount=1500, diagnosis="Viral Fever", document_patient_name="Jane Smith")
run("REJECTED (date mismatch)",       "REJECTED",       claim_amount=1500, diagnosis="Viral Fever", prescription_date="01/04/2026", bill_date="10/06/2026")
run("PARTIAL (per-claim limit)",      "PARTIAL",        claim_amount=10000, diagnosis="Gastroenteritis")
run("PARTIAL (dental sublimit)",      "PARTIAL",        claim_amount=5500, diagnosis="Root canal", treatment_type="dental")
run("PARTIAL (vision sublimit)",      "PARTIAL",        claim_amount=4500, diagnosis="Spectacles", treatment_type="vision")
run("MANUAL_REVIEW (high value)",     "MANUAL_REVIEW",  claim_amount=30000, diagnosis="Post op")
run("REJECTED (blacklisted provider)","REJECTED",       claim_amount=1500, diagnosis="Checkup", doctor_registration="FRAUD/00001/2020", hospital_name="Blacklisted Provider Center")
print("\n=== DONE ===")
