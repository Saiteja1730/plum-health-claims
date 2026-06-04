from fastapi import APIRouter
from fastapi import UploadFile
from fastapi import File
from fastapi import HTTPException

from datetime import datetime

import os
import json

from services.document_processor import extract_text_from_pdf
from services.extraction import extract_claim_data
from services.adjudication import AdjudicationService

from models.claim import Claim

from database.mongodb import claims_collection

router = APIRouter()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...)
):

    try:

        upload_dir = "uploads"

        os.makedirs(
            upload_dir,
            exist_ok=True
        )

        file_path = os.path.join(
            upload_dir,
            file.filename
        )

        with open(file_path, "wb") as f:

            content = await file.read()

            f.write(content)

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"File upload failed: {str(e)}"
        )

    # -----------------------------
    # PDF EXTRACTION
    # -----------------------------

    try:

        extracted_text = (
            extract_text_from_pdf(
                file_path
            )
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"PDF extraction failed: {str(e)}"
        )

    # -----------------------------
    # LLM EXTRACTION
    # -----------------------------

    try:

        llm_output = (
            extract_claim_data(
                extracted_text
            )
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"LLM extraction failed: {str(e)}"
        )

    # -----------------------------
    # JSON PARSE
    # -----------------------------

    try:

        llm_output = (
            llm_output
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        data = json.loads(
            llm_output
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Invalid AI response: {str(e)}"
        )

    # -----------------------------
    # CLAIM OBJECT
    # -----------------------------

    claim = Claim(

        member_id="EMP001",

        member_name=data.get(
            "member_name",
            "Unknown"
        ),

        member_age=data.get(
            "member_age"
        ),

        treatment_date=data.get(
            "treatment_date",
            "2024-01-01"
        ),

        claim_amount=float(
            data.get(
                "claim_amount",
                0
            )
        ),

        bill_amount=float(
            data.get(
                "bill_amount"
            )
        ) if data.get("bill_amount") is not None else None,

        diagnosis=data.get(
            "diagnosis",
            ""
        ),

        treatment_type=data.get(
            "treatment_type",
            ""
        ),

        doctor_name=data.get(
            "doctor_name",
            ""
        ),

        doctor_registration=data.get(
            "doctor_registration",
            ""
        ),

        hospital_name=data.get(
            "hospital_name"
        ),

        prescription_uploaded=data.get(
            "prescription_present",
            True
        ),

        bill_uploaded=data.get(
            "bill_present",
            True
        ),

        report_uploaded=data.get(
            "report_present",
            False
        ),

        document_patient_name=data.get(
            "document_patient_name"
        ),

        prescription_date=data.get(
            "prescription_date"
        ),

        bill_date=data.get(
            "bill_date"
        ),

        report_date=data.get(
            "report_date"
        ),

        extracted_from_document=True,

        extraction_confidence=data.get(
            "confidence_score",
            0.95
        ),

        medical_necessity_score=data.get(
            "medical_necessity_score",
            1.0
        ),

        source_document_name=file.filename,

        field_confidence=data.get("field_confidence", {})
    )

    # -----------------------------
    # ADJUDICATION
    # -----------------------------

    decision = (
        AdjudicationService
        .adjudicate_claim(claim)
    )

    # -----------------------------
    # SAVE CLAIM
    # -----------------------------

    try:

        claims_collection.insert_one(
            {
                "member_id": claim.member_id,
                "member_name": claim.member_name,
                "diagnosis": claim.diagnosis,
                "claim_amount": claim.claim_amount,
                "treatment_type": claim.treatment_type,
                "doctor_name": claim.doctor_name,
                "doctor_registration": claim.doctor_registration,
                "document_name": file.filename,

                "decision": decision.decision,
                "approved_amount": decision.approved_amount,
                "rejection_reasons": decision.rejection_reasons,
                "confidence_score": decision.confidence_score,

                "timestamp": datetime.utcnow()
            }
        )

    except Exception as e:

        print(
            f"MongoDB Save Error: {e}"
        )

    return {
        "document": file.filename,
        "extracted_data": data,
        "decision": decision
    }