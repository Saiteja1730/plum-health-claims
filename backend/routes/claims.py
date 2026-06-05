from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from models.claim import Claim
from services.adjudication import AdjudicationService
from database.mongodb import claims_collection
from datetime import datetime, timezone
import json
import io

router = APIRouter()


# ----------------------------------
# CLAIM ID GENERATOR
# ----------------------------------

def generate_claim_id() -> str:
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"CLM-{today_str}-"
    today_count = claims_collection.count_documents({
        "claim_id": {"$regex": f"^{prefix}"}
    })
    return f"{prefix}{today_count + 1:03d}"


# ----------------------------------
# PROCESS CLAIM
# ----------------------------------

@router.post("/process")
def process_claim(claim: Claim):
    try:
        decision = AdjudicationService.adjudicate_claim(claim)
        claim_id = generate_claim_id()
        now = datetime.now(timezone.utc)

        claim_document = {
            "claim_id": claim_id,
            "created_at": now,
            "timestamp": now,
            "member_id": claim.member_id,
            "member_name": claim.member_name,
            "member_age": claim.member_age,
            "treatment_date": claim.treatment_date,
            "claim_submission_date": claim.claim_submission_date,
            "diagnosis": claim.diagnosis,
            "treatment_type": claim.treatment_type,
            "claim_amount": claim.claim_amount,
            "bill_amount": claim.bill_amount,
            "procedures": claim.procedures,
            "doctor_name": claim.doctor_name,
            "doctor_registration": claim.doctor_registration,
            "hospital_name": claim.hospital_name,
            "network_hospital": claim.network_hospital,
            "prescription_uploaded": claim.prescription_uploaded,
            "bill_uploaded": claim.bill_uploaded,
            "report_uploaded": claim.report_uploaded,
            "prescription_date": claim.prescription_date,
            "bill_date": claim.bill_date,
            "report_date": claim.report_date,
            "document_patient_name": claim.document_patient_name,
            "pre_authorized": claim.pre_authorized,
            "cashless_request": claim.cashless_request,
            "previous_claims_same_day": claim.previous_claims_same_day,
            "extraction_confidence": claim.extraction_confidence,
            "medical_necessity_score": claim.medical_necessity_score,
            "source_document_name": claim.source_document_name,
            "policy_active": claim.policy_active,
            "member_covered": claim.member_covered,
            "annual_limit": claim.annual_limit,
            "annual_used": claim.annual_used,
            "provider_blacklisted": claim.provider_blacklisted,
            "submission_days": claim.submission_days,
            "service_category": claim.service_category,
            "audit_trail": claim.audit_trail,
            "field_confidence": claim.field_confidence,
            # Decision fields
            "decision": decision.decision,
            "approved_amount": decision.approved_amount,
            "original_amount": decision.original_amount,
            "excluded_amount": decision.excluded_amount,
            "copay_applied": decision.copay_applied,
            "policy_limit_applied": decision.policy_limit_applied,
            "rule_trace": decision.rule_trace,
            "triggered_rules": decision.triggered_rules,
            "completeness_score": decision.completeness_score,
            "review_category": decision.review_category,
            "rejection_reasons": decision.rejection_reasons,
            "confidence_score": decision.confidence_score,
            "notes": decision.notes,
            "next_steps": decision.next_steps,
            "cashless_approved": decision.cashless_approved,
            "network_discount": decision.network_discount,
            "failed_rules": decision.failed_rules,
            "passed_rules": decision.passed_rules,
            "audit_trace": decision.audit_trace,
            "provider_status": decision.provider_status,
            "provider_cashless": decision.provider_cashless,
            "waiting_period_trace": decision.waiting_period_trace,
            "flags": decision.flags,
        }

        claims_collection.insert_one(claim_document)

        response = decision.model_dump()
        response["claim_id"] = claim_id
        response["timestamp"] = now.isoformat()
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------
# CLAIM HISTORY (Item #1 - business focused, Item #3 - sorted by created_at desc)
# ----------------------------------

@router.get("/history")
def get_history(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    try:
        query = {}
        if search and search.strip():
            q = search.strip()
            query["$or"] = [
                {"claim_id": {"$regex": q, "$options": "i"}},
                {"member_id": {"$regex": q, "$options": "i"}},
                {"member_name": {"$regex": q, "$options": "i"}},
            ]
        if status and status.strip() and status.upper() != "ALL":
            query["decision"] = status.upper()

        claims = list(
            claims_collection.find(query, {"_id": 0})
            .sort("created_at", -1)
        )

        return {"count": len(claims), "claims": claims}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------
# CLAIM STATS (Item #4 - real MongoDB counts, Item #5 - fraud analytics)
# ----------------------------------

@router.get("/stats")
def get_stats():
    try:
        # Item #4: Direct MongoDB counts
        total_claims = claims_collection.count_documents({})
        approved = claims_collection.count_documents({"decision": "APPROVED"})
        rejected = claims_collection.count_documents({"decision": "REJECTED"})
        partial = claims_collection.count_documents({"decision": "PARTIAL"})
        manual_review = claims_collection.count_documents({"decision": "MANUAL_REVIEW"})

        # Aggregation for amounts and distributions
        claims = list(claims_collection.find({}, {"_id": 0}))

        total_approved_amount = sum(c.get("approved_amount", 0) for c in claims)

        approval_rate = 0
        if total_claims > 0:
            approval_rate = round(((approved + partial) / total_claims) * 100, 2)

        # Rejection reason distribution
        rejection_distribution = {}
        for c in claims:
            reasons = c.get("rejection_reasons", [])
            for r in reasons:
                rejection_distribution[r] = rejection_distribution.get(r, 0) + 1

        # Treatment category distribution
        treatment_distribution = {}
        for c in claims:
            tt = c.get("treatment_type", "other").lower()
            treatment_distribution[tt] = treatment_distribution.get(tt, 0) + 1

        decision_trends = {
            "APPROVED": approved,
            "REJECTED": rejected,
            "PARTIAL": partial,
            "MANUAL_REVIEW": manual_review
        }

        # Monthly analytics & Claim volume trend
        volume_by_date = {}
        volume_by_month = {}
        for c in claims:
            t_date = c.get("treatment_date", "")
            month_key = "Unknown"
            date_key = t_date if t_date else "Unknown"
            if t_date:
                try:
                    if "-" in t_date:
                        dt = datetime.strptime(t_date, "%Y-%m-%d")
                    else:
                        dt = datetime.strptime(t_date, "%d/%m/%Y")
                    month_key = dt.strftime("%B %Y")
                    date_key = dt.strftime("%Y-%m-%d")
                except:
                    pass
            volume_by_date[date_key] = volume_by_date.get(date_key, 0) + 1
            volume_by_month[month_key] = volume_by_month.get(month_key, 0) + 1

        # Excessive activity flags
        excessive_member_ids = set()
        for c in claims:
            if "EXCESSIVE_CLAIM_ACTIVITY" in c.get("rejection_reasons", []):
                mid = c.get("member_id")
                if mid:
                    excessive_member_ids.add(mid)
        excessive_claims = len(excessive_member_ids)

        waiting_period_rejections = sum(1 for c in claims if "WAITING_PERIOD" in c.get("rejection_reasons", []))

        # Fraud queue
        from collections import defaultdict
        member_day_claims = defaultdict(list)
        for c in claims:
            mid = c.get("member_id")
            ts = c.get("timestamp") or c.get("created_at")
            if ts and hasattr(ts, "strftime"):
                day_key = ts.strftime("%Y-%m-%d")
            elif ts and isinstance(ts, str):
                day_key = ts[:10]
            else:
                day_key = c.get("treatment_date", "unknown")
            if mid and day_key:
                member_day_claims[(mid, day_key)].append(c)

        fraud_queue = []
        for (mid, day_key), group in member_day_claims.items():
            if len(group) > 12:
                m_name = group[0].get("member_name", "Unknown")
                total_amt = sum(g.get("claim_amount", 0) for g in group)
                claim_ids = [g.get("claim_id") or g.get("source_document_name") or "Claim" for g in group]
                flagged_time = group[-1].get("timestamp") or day_key
                fraud_queue.append({
                    "member_id": mid,
                    "member_name": m_name,
                    "claims_today": len(group),
                    "total_amount": round(total_amt, 2),
                    "claim_ids": ", ".join(claim_ids[:3]) + ("..." if len(claim_ids) > 3 else ""),
                    "flagged_time": str(flagged_time)
                })

        # Category payout breakdown
        category_payouts = defaultdict(lambda: {"count": 0, "total_approved": 0, "total_claimed": 0})
        for c in claims:
            tt = c.get("treatment_type", "other").lower()
            category_payouts[tt]["count"] += 1
            category_payouts[tt]["total_approved"] += c.get("approved_amount", 0)
            category_payouts[tt]["total_claimed"] += c.get("claim_amount", 0)

        category_payout_list = []
        for cat, data in category_payouts.items():
            category_payout_list.append({
                "category": cat,
                "count": data["count"],
                "total_approved": round(data["total_approved"], 2),
                "total_claimed": round(data["total_claimed"], 2),
            })
        category_payout_list.sort(key=lambda x: x["total_approved"], reverse=True)

        # --------------------------------------------------
        # Item #5: REAL Fraud Detection Analytics
        # --------------------------------------------------
        # Blacklisted provider hits
        blacklisted_hits = claims_collection.count_documents({
            "rejection_reasons": "PROVIDER_BLACKLIST"
        })

        # Duplicate claims: same member + same amount + same treatment date
        pipeline_dup = [
            {"$group": {
                "_id": {"member_id": "$member_id", "claim_amount": "$claim_amount", "treatment_date": "$treatment_date"},
                "count": {"$sum": 1}
            }},
            {"$match": {"count": {"$gt": 1}}},
            {"$count": "total"}
        ]
        dup_result = list(claims_collection.aggregate(pipeline_dup))
        duplicate_hits = dup_result[0]["total"] if dup_result else 0

        # Patient mismatch: document_patient_name != member_name
        patient_mismatch_hits = 0
        for c in claims:
            doc_name = (c.get("document_patient_name") or "").strip().lower()
            mem_name = (c.get("member_name") or "").strip().lower()
            if doc_name and mem_name and doc_name != mem_name:
                patient_mismatch_hits += 1

        # Date mismatch: future dates or DATE_MISMATCH rejections
        date_mismatch_hits = 0
        now = datetime.now(timezone.utc)
        for c in claims:
            td = c.get("treatment_date", "")
            if td:
                try:
                    if "-" in td:
                        tdt = datetime.strptime(td, "%Y-%m-%d")
                    else:
                        tdt = datetime.strptime(td, "%d/%m/%Y")
                    if tdt > now:
                        date_mismatch_hits += 1
                        continue
                except:
                    pass
            if "DATE_MISMATCH" in c.get("rejection_reasons", []):
                date_mismatch_hits += 1

        # Average confidence from actual data
        confidences = [c.get("extraction_confidence") or c.get("confidence_score", 0) for c in claims if c.get("extraction_confidence") or c.get("confidence_score")]
        avg_confidence = round(sum(confidences) / len(confidences) * 100, 1) if confidences else 0

        return {
            "total_claims": total_claims,
            "approved": approved,
            "rejected": rejected,
            "partial": partial,
            "manual_review": manual_review,
            "approval_rate": approval_rate,
            "total_approved_amount": round(total_approved_amount, 2),
            "rejection_distribution": rejection_distribution,
            "treatment_distribution": treatment_distribution,
            "decision_trends": decision_trends,
            "volume_by_date": volume_by_date,
            "volume_by_month": volume_by_month,
            "claims_flaged_excessive_activity": excessive_claims,
            "waiting_period_rejections": waiting_period_rejections,
            "fraud_queue": fraud_queue,
            "category_payouts": category_payout_list,
            "avg_confidence": avg_confidence,
            "fraud_detection": {
                "blacklisted_hits": blacklisted_hits,
                "duplicate_hits": duplicate_hits,
                "patient_mismatch_hits": patient_mismatch_hits,
                "date_mismatch_hits": date_mismatch_hits,
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------
# AUDITOR CORRECTIONS
# ----------------------------------

from pydantic import BaseModel

class CorrectionInput(BaseModel):
    field: str
    old_value: str
    new_value: str
    auditor_name: str = "Operator-Admin"

@router.post("/{claim_id}/corrections")
def add_correction(claim_id: str, correction: CorrectionInput):
    try:
        now = datetime.now(timezone.utc)
        correction_entry = {
            "field": correction.field,
            "original": correction.old_value,
            "edited": correction.new_value,
            "edited_by": correction.auditor_name,
            "timestamp": now.isoformat()
        }

        result = claims_collection.update_one(
            {"claim_id": claim_id},
            {"$push": {"audit_trail": correction_entry}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found")

        return {"status": "success", "message": f"Correction added to {claim_id}", "correction": correction_entry}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------
# EXPORT AUDIT REPORT (Item #11)
# ----------------------------------

@router.get("/{claim_id}/export/json")
def export_claim_json(claim_id: str):
    claim = claims_collection.find_one({"claim_id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found")

    # Convert datetime objects to ISO strings for JSON serialization
    def serialize(obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return obj

    export_data = {
        "claim_id": claim.get("claim_id"),
        "claim_data": {
            "member_id": claim.get("member_id"),
            "member_name": claim.get("member_name"),
            "diagnosis": claim.get("diagnosis"),
            "treatment_type": claim.get("treatment_type"),
            "treatment_date": claim.get("treatment_date"),
            "claim_amount": claim.get("claim_amount"),
            "approved_amount": claim.get("approved_amount"),
            "doctor_name": claim.get("doctor_name"),
            "hospital_name": claim.get("hospital_name"),
        },
        "ocr_output": claim.get("ocr_extraction", {}),
        "rules_executed": claim.get("rule_trace", {}),
        "triggered_rules": claim.get("triggered_rules", []),
        "passed_rules": claim.get("passed_rules", []),
        "failed_rules": claim.get("failed_rules", []),
        "final_decision": claim.get("decision"),
        "audit_logs": claim.get("audit_trail", []),
        "audit_trace": claim.get("audit_trace", []),
        "timestamps": {
            "created_at": serialize(claim.get("created_at")),
            "timestamp": serialize(claim.get("timestamp")),
        }
    }

    json_str = json.dumps(export_data, default=str, indent=2)
    return StreamingResponse(
        io.BytesIO(json_str.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=audit_report_{claim_id}.json"}
    )


@router.get("/{claim_id}/export/pdf")
def export_claim_pdf(claim_id: str):
    """Export audit report as a simple text-based PDF"""
    claim = claims_collection.find_one({"claim_id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found")

    # Build text-based report
    lines = []
    lines.append("=" * 60)
    lines.append("PLUM HEALTH - AUDIT REPORT")
    lines.append("=" * 60)
    lines.append(f"Claim ID: {claim.get('claim_id')}")
    lines.append(f"Generated: {datetime.now(timezone.utc).isoformat()}")
    lines.append("")
    lines.append("--- CLAIM DATA ---")
    lines.append(f"Member ID: {claim.get('member_id')}")
    lines.append(f"Member Name: {claim.get('member_name')}")
    lines.append(f"Diagnosis: {claim.get('diagnosis')}")
    lines.append(f"Treatment: {claim.get('treatment_type')}")
    lines.append(f"Treatment Date: {claim.get('treatment_date')}")
    lines.append(f"Claim Amount: {claim.get('claim_amount')}")
    lines.append(f"Approved Amount: {claim.get('approved_amount')}")
    lines.append(f"Doctor: {claim.get('doctor_name')}")
    lines.append(f"Hospital: {claim.get('hospital_name')}")
    lines.append("")
    lines.append("--- DECISION ---")
    lines.append(f"Decision: {claim.get('decision')}")
    lines.append(f"Rejection Reasons: {', '.join(claim.get('rejection_reasons', []))}")
    lines.append(f"Notes: {claim.get('notes', '')}")
    lines.append("")
    lines.append("--- RULES EXECUTED ---")
    for rule, status in claim.get("rule_trace", {}).items():
        lines.append(f"  {rule}: {status}")
    lines.append("")
    lines.append("--- TRIGGERED RULES ---")
    for r in claim.get("triggered_rules", []):
        lines.append(f"  - {r}")
    lines.append("")
    lines.append("--- PASSED RULES ---")
    for r in claim.get("passed_rules", []):
        lines.append(f"  + {r}")
    lines.append("")
    lines.append("--- FAILED RULES ---")
    for r in claim.get("failed_rules", []):
        lines.append(f"  x {r}")
    lines.append("")
    lines.append("--- AUDIT TRACE ---")
    for t in claim.get("audit_trace", []):
        lines.append(f"  {t}")
    lines.append("")
    lines.append("--- AUDIT TRAIL (Human Edits) ---")
    for edit in claim.get("audit_trail", []):
        lines.append(f"  Field: {edit.get('field')} | Original: {edit.get('original')} | Edited: {edit.get('edited')} | By: {edit.get('edited_by')} | At: {edit.get('timestamp')}")
    lines.append("")
    lines.append("--- OCR EXTRACTION ---")
    ocr = claim.get("ocr_extraction", {})
    if ocr:
        lines.append(f"  Confidence: {ocr.get('confidence_score', 'N/A')}")
        for field, val in ocr.get("extracted_fields", {}).items():
            lines.append(f"  {field}: {val}")
    lines.append("")
    lines.append("=" * 60)
    lines.append("END OF REPORT")

    report_text = "\n".join(lines)

    return StreamingResponse(
        io.BytesIO(report_text.encode()),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=audit_report_{claim_id}.txt"}
    )


# ----------------------------------
# RESET SANDBOX
# ----------------------------------

@router.post("/reset-sandbox")
def reset_sandbox():
    try:
        from database.mongodb import (
            members_collection, policies_collection,
            providers_collection, claim_history_collection
        )

        claims_result = claims_collection.delete_many({})
        claim_history_collection.delete_many({})

        members_collection.delete_many({})
        policies_collection.delete_many({})
        providers_collection.delete_many({})

        members_collection.insert_many([
            {"member_id": "EMP100", "member_name": "Arjun Reddy",   "member_age": 32, "covered": True, "join_date": "2024-01-01"},
            {"member_id": "EMP001", "member_name": "Rajesh Kumar",   "member_age": 30, "covered": True, "join_date": "2024-01-01"},
            {"member_id": "EMP002", "member_name": "Priya Singh",    "member_age": 28, "covered": True, "join_date": "2024-01-01"},
            {"member_id": "EMP003", "member_name": "Amit Verma",     "member_age": 45, "covered": True, "join_date": "2024-01-01"},
            {"member_id": "EMP005", "member_name": "Neha Sharma",    "member_age": 27, "covered": True, "join_date": "2026-05-01"},
        ])

        policies_collection.insert_many([
            {
                "member_id": "EMP100", "active": True,
                "annual_limit": 50000, "annual_used": 5000, "max_claims_per_day": 10,
                "consultation_limit": 5000, "pharmacy_limit": 15000,
                "diagnostic_limit": 10000, "dental_limit": 5000, "vision_limit": 4000,
                "alternative_limit": 8000, "initial_waiting_days": 30,
                "diabetes_waiting_days": 90, "hypertension_waiting_days": 90,
                "maternity_waiting_days": 270, "joint_replacement_waiting_days": 730
            },
            {
                "member_id": "EMP001", "active": True,
                "annual_limit": 50000, "annual_used": 5000, "max_claims_per_day": 12, "per_claim_limit": 7000,
                "consultation_limit": 5000, "pharmacy_limit": 15000,
                "diagnostic_limit": 10000, "dental_limit": 5000, "vision_limit": 4000,
                "alternative_limit": 8000, "initial_waiting_days": 30,
                "diabetes_waiting_days": 90, "hypertension_waiting_days": 90,
                "maternity_waiting_days": 270, "joint_replacement_waiting_days": 730
            },
            {
                "member_id": "EMP002", "active": True,
                "annual_limit": 50000, "annual_used": 10000, "max_claims_per_day": 8, "per_claim_limit": 7000,
                "dental_limit": 5000, "vision_limit": 4000, "initial_waiting_days": 30,
                "diabetes_waiting_days": 90, "hypertension_waiting_days": 90,
                "maternity_waiting_days": 270, "joint_replacement_waiting_days": 730
            },
            {
                "member_id": "EMP003", "active": False,
                "annual_limit": 50000, "annual_used": 0, "max_claims_per_day": 5, "initial_waiting_days": 30,
                "diabetes_waiting_days": 90, "hypertension_waiting_days": 90,
                "maternity_waiting_days": 270, "joint_replacement_waiting_days": 730
            },
            {
                "member_id": "EMP005", "active": True,
                "annual_limit": 50000, "annual_used": 0, "max_claims_per_day": 6, "per_claim_limit": 7000,
                "dental_limit": 5000, "vision_limit": 4000, "initial_waiting_days": 30,
                "diabetes_waiting_days": 90, "hypertension_waiting_days": 90,
                "maternity_waiting_days": 270, "joint_replacement_waiting_days": 730
            },
        ])

        providers_collection.insert_many([
            {"doctor_registration": "KA/45678/2015", "doctor_name": "Dr Akshara Raje",    "hospital_name": "Apollo Clinic Bangalore",     "specialization": "General Medicine", "blacklisted": False, "network_provider": True, "active": True},
            {"doctor_registration": "DL/12345/2018", "doctor_name": "Dr A. K. Sharma",    "hospital_name": "Max Clinic Delhi",            "specialization": "General Medicine", "blacklisted": False, "network_provider": True, "active": True},
            {"doctor_registration": "MH/23456/2018", "doctor_name": "Dr Patel",           "hospital_name": "Fortis Hospital Mumbai",       "specialization": "Dentistry",         "blacklisted": False, "network_provider": False, "active": True},
            {"doctor_registration": "DL/34567/2016", "doctor_name": "Dr Gupta",           "hospital_name": "AIIMS Delhi",                 "specialization": "Gastroenterology",  "blacklisted": False, "network_provider": False, "active": True},
            {"doctor_registration": "FRAUD/00001/2020", "doctor_name": "Dr Fraud Doctor", "hospital_name": "Blacklisted Provider Center", "specialization": "Unknown",           "blacklisted": True,  "network_provider": False, "active": True},
        ])

        return {
            "status": "success",
            "message": f"Sandbox reset. {claims_result.deleted_count} claims removed. Members, policies and providers re-seeded."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))