from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


def extract_claim_data(document_text: str):

    prompt = f"""
You are an expert Indian health insurance claim processor.

Analyze the medical document and extract information.

Return ONLY VALID JSON.

Schema:

{{
    "member_name": "",
    "document_patient_name": "",
    "member_age": null,
    "doctor_name": "",
    "doctor_registration": "",
    "hospital_name": "",
    "diagnosis": "",
    "treatment_type": "",
    "claim_amount": 0,
    "bill_amount": 0,
    "treatment_date": "",
    "prescription_date": "",
    "bill_date": "",
    "report_date": "",
    "document_type": "",
    "prescription_present": false,
    "bill_present": false,
    "report_present": false,
    "confidence_score": 0.0,
    "medical_necessity_score": 0.0,
    "field_confidence": {{
        "member_name": 0.0,
        "document_patient_name": 0.0,
        "member_age": 0.0,
        "doctor_name": 0.0,
        "doctor_registration": 0.0,
        "hospital_name": 0.0,
        "diagnosis": 0.0,
        "treatment_type": 0.0,
        "claim_amount": 0.0,
        "treatment_date": 0.0,
        "prescription_date": 0.0,
        "bill_date": 0.0,
        "report_date": 0.0,
        "document_type": 0.0
    }}
}}

Rules:

- confidence_score between 0 and 1
- medical_necessity_score between 0 and 1
- For field_confidence, estimate a confidence score between 0 and 1 for each extracted field based on how clearly and unambiguously it is mentioned in the text. If a field was not found/extracted, set its confidence to 0.

- If diagnosis, treatment and doctor are present,
  assume prescription_present=true

- If amount, invoice or billing information exists,
  assume bill_present=true

- If laboratory findings or test results exist,
  assume report_present=true

- Extract doctor registration if visible

- Extract patient name from document

- Extract prescription date if present

- Extract bill date if present

- Extract report date if present

- Return valid JSON only

Document:

{document_text}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0
    )

    return response.choices[0].message.content