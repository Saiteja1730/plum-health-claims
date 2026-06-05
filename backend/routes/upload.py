from fastapi import APIRouter
from fastapi import UploadFile
from fastapi import File
from fastapi import HTTPException

from datetime import datetime, timezone

import os
import json
import hashlib

from services.document_processor import extract_text_from_pdf
from services.extraction import extract_claim_data
from services.adjudication import AdjudicationService

from models.claim import Claim

from database.mongodb import claims_collection

router = APIRouter()


# -------------------------------------------------------
# VISION CATEGORY NORMALIZATION (Item #8)
# -------------------------------------------------------

VISION_ALIASES = [
    "vision", "eye checkup", "eye consultation",
    "vision consultation", "ophthalmology consultation",
    "ophthalmology", "eye"
]


def normalize_treatment_type(treatment_type: str) -> str:
    """Normalize treatment type categories so vision variants map to 'vision'."""
    if not treatment_type:
        return treatment_type
    lower = treatment_type.strip().lower()
    if lower in VISION_ALIASES:
        return "vision"
    return treatment_type.strip()


# -------------------------------------------------------
# DOCUMENT HASH FOR DEDUP (Item #2)
# -------------------------------------------------------

def compute_document_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...)
):
    # Read file content once
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"File read failed: {str(e)}"
        )

    # -------------------------------------------------------
    # DUPLICATE CHECK VIA DOCUMENT HASH (Item #2)
    # -------------------------------------------------------
    doc_hash = compute_document_hash(content)
    existing_claim = claims_collection.find_one(
        {"document_hash": doc_hash},
        {"_id": 0}
    )
    if existing_claim:
        return {
            "document": file.filename,
            "claim_id": existing_claim.get("claim_id"),
            "extracted_data": existing_claim,
            "decision": {
                "decision": existing_claim.get("decision"),
                "approved_amount": existing_claim.get("approved_amount"),
                "rejection_reasons": existing_claim.get("rejection_reasons", []),
                "confidence_score": existing_claim.get("confidence_score", 0),
                "notes": existing_claim.get("notes", ""),
            },
            "duplicate": True,
            "message": "This document has already been processed. Returning existing claim."
        }

    # Save file to disk
    try:
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"File upload failed: {str(e)}"
        )

    # -------------------------------------------------------
    # PDF EXTRACTION
    # -------------------------------------------------------
    try:
        extracted_text = extract_text_from_pdf(file_path)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF extraction failed: {str(e)}"
        )

    # -------------------------------------------------------
    # LLM EXTRACTION
    # -------------------------------------------------------
    try:
        llm_output = extract_claim_data(extracted_text)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM extraction failed: {str(e)}"
        )

    # -------------------------------------------------------
    # JSON PARSE
    # -------------------------------------------------------
    try:
        llm_output = (
            llm_output
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )
        data = json.loads(llm_output)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid AI response: {str(e)}"
        )

    # -------------------------------------------------------
    # MEMBER LOOKUP FROM DB (Items #13, #14, #12)
    # -------------------------------------------------------
    from database.mongodb import members_collection, policies_collection, providers_collection

    extracted_member_id = data.get("member_id", "").strip()
    member_found = False
    member_covered = False
    member_join_date = ""
    policy_join_date = ""
    db_member_name = ""
    db_member_age = 0
    policy_active = False

    if extracted_member_id:
        member_doc = members_collection.find_one({"member_id": extracted_member_id})
        if member_doc:
            member_found = True
            member_covered = member_doc.get("covered", False)
            member_join_date = member_doc.get("join_date", "")
            db_member_name = member_doc.get("member_name", "")
            db_member_age = member_doc.get("member_age", 0)

            # Also get policy join date and status
            policy_doc = policies_collection.find_one({"member_id": extracted_member_id})
            if policy_doc:
                policy_active = policy_doc.get("active", False)
                policy_join_date = policy_doc.get("policy_join_date", member_join_date)
            else:
                policy_active = False

    # Enrich extracted data with DB info for frontend
    data["member_found"] = member_found
    data["member_covered"] = member_covered
    data["member_join_date"] = member_join_date
    data["policy_join_date"] = policy_join_date or member_join_date
    data["policy_active"] = policy_active
    if db_member_name:
        data["db_member_name"] = db_member_name
    if db_member_age:
        data["db_member_age"] = db_member_age

    # Use extracted member_id
    resolved_member_id = extracted_member_id if extracted_member_id else ""

    # -------------------------------------------------------
    # PROVIDER LOOKUP (Item #19)
    # -------------------------------------------------------
    provider_blacklisted = False
    provider_network = False
    provider_found = False
    provider_metadata = {}

    extracted_doctor_reg = data.get("doctor_registration", "").strip()
    if extracted_doctor_reg:
        provider_doc = providers_collection.find_one({"doctor_registration": extracted_doctor_reg})
        if provider_doc:
            provider_found = True
            provider_blacklisted = provider_doc.get("blacklisted", False)
            provider_network = provider_doc.get("network_provider", False)
            provider_metadata = {
                "doctor_name": provider_doc.get("doctor_name", ""),
                "hospital_name": provider_doc.get("hospital_name", ""),
                "specialization": provider_doc.get("specialization", ""),
                "blacklisted": provider_blacklisted,
                "network_provider": provider_network,
                "cashless_eligible": provider_network and not provider_blacklisted,
            }

    data["provider_found"] = provider_found
    data["provider_metadata"] = provider_metadata

    # -------------------------------------------------------
    # NORMALIZE TREATMENT TYPE (Item #8)
    # -------------------------------------------------------
    raw_treatment_type = data.get("treatment_type", "")
    normalized_treatment_type = normalize_treatment_type(raw_treatment_type)

    # -------------------------------------------------------
    # BUILD OCR EXTRACTION RECORD (Items #16, #18)
    # -------------------------------------------------------
    ocr_extraction = {
        "raw_text_length": len(extracted_text),
        "extracted_fields": {
            "member_id": data.get("member_id", ""),
            "member_name": data.get("member_name", ""),
            "doctor_name": data.get("doctor_name", ""),
            "hospital_name": data.get("hospital_name", ""),
            "diagnosis": data.get("diagnosis", ""),
            "treatment_date": data.get("treatment_date", ""),
            "claim_amount": data.get("claim_amount", 0),
            "treatment_type": raw_treatment_type,
            "normalized_treatment_type": normalized_treatment_type,
        },
        "confidence_score": data.get("confidence_score", 0),
        "field_confidence": data.get("field_confidence", {}),
        "document_type": data.get("document_type", "unknown"),
        "extraction_timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # -------------------------------------------------------
    # SMART DOCUMENT DETECTION (single PDF = combined doc)
    # -------------------------------------------------------
    # If the PDF contains diagnosis/doctor/amount, all docs are implicitly present
    has_clinical_data = bool(data.get("diagnosis")) and bool(data.get("doctor_name"))
    has_billing_data = bool(data.get("claim_amount")) or bool(data.get("bill_amount"))

    bill_present = data.get("bill_present", False) or has_billing_data
    prescription_present = data.get("prescription_present", False) or has_clinical_data
    report_present = data.get("report_present", False)

    # Date fallbacks: use treatment_date if specific dates weren't extracted
    treatment_date = data.get("treatment_date", "")
    prescription_date = data.get("prescription_date") or data.get("bill_date") or treatment_date or None
    bill_date = data.get("bill_date") or treatment_date or None
    report_date = data.get("report_date") or None

    # Update data dict so the frontend receives the smart-detected values
    data["prescription_present"] = prescription_present
    data["bill_present"] = bill_present
    data["report_present"] = report_present
    data["prescription_date"] = prescription_date
    data["bill_date"] = bill_date
    data["treatment_date"] = treatment_date

    # -------------------------------------------------------
    # CLAIM OBJECT
    # -------------------------------------------------------
    claim = Claim(
        member_id=resolved_member_id,
        member_name=data.get("member_name", db_member_name or "Unknown"),
        member_age=data.get("member_age", db_member_age or 0),
        treatment_date=treatment_date,
        claim_amount=float(data.get("claim_amount", 0)),
        bill_amount=float(data.get("bill_amount")) if data.get("bill_amount") is not None else None,
        diagnosis=data.get("diagnosis", ""),
        treatment_type=normalized_treatment_type,
        doctor_name=data.get("doctor_name", ""),
        doctor_registration=data.get("doctor_registration", ""),
        hospital_name=data.get("hospital_name"),
        prescription_uploaded=prescription_present,
        bill_uploaded=bill_present,
        report_uploaded=report_present,
        document_patient_name=data.get("document_patient_name"),
        prescription_date=prescription_date,
        bill_date=bill_date,
        report_date=report_date,
        extracted_from_document=True,
        extraction_confidence=data.get("confidence_score", 0.95),
        medical_necessity_score=data.get("medical_necessity_score", 1.0),
        source_document_name=file.filename,
        field_confidence=data.get("field_confidence", {}),
        # DB-enriched fields
        policy_active=policy_active,
        member_covered=member_covered,
        member_join_date=member_join_date,
        policy_join_date=policy_join_date or member_join_date,
        provider_blacklisted=provider_blacklisted,
        network_hospital=provider_network,
    )

    # -------------------------------------------------------
    # ADJUDICATION
    # -------------------------------------------------------
    decision = AdjudicationService.adjudicate_claim(claim)

    return {
        "document": file.filename,
        "extracted_data": data,
        "decision": decision
    }