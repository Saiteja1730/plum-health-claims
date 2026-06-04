from fastapi import APIRouter
from fastapi import HTTPException

from models.claim import Claim
from services.adjudication import AdjudicationService

from database.mongodb import claims_collection

router = APIRouter()


# ----------------------------------
# PROCESS CLAIM
# ----------------------------------

@router.post("/process")
def process_claim(claim: Claim):

    try:

        decision = (
            AdjudicationService
            .adjudicate_claim(claim)
        )

        claim_document = {
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
        }

        claims_collection.insert_one(
            claim_document
        )

        return decision

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ----------------------------------
# CLAIM HISTORY
# ----------------------------------

@router.get("/history")
def get_history():

    try:

        claims = list(
            claims_collection.find(
                {},
                {
                    "_id": 0
                }
            )
        )

        return {
            "count": len(claims),
            "claims": claims
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/stats")
def get_stats():
    from datetime import datetime

    try:
        claims = list(claims_collection.find({}, {"_id": 0}))
        
        total_claims = len(claims)
        approved = sum(1 for c in claims if c.get("decision") == "APPROVED")
        rejected = sum(1 for c in claims if c.get("decision") == "REJECTED")
        partial = sum(1 for c in claims if c.get("decision") == "PARTIAL")
        manual_review = sum(1 for c in claims if c.get("decision") == "MANUAL_REVIEW")
        
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
            
        # Decision trends
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

        # Count specific KPI items
        excessive_claims = sum(1 for c in claims if "EXCESSIVE_CLAIM_ACTIVITY" in c.get("rejection_reasons", []))
        waiting_period_rejections = sum(1 for c in claims if "WAITING_PERIOD" in c.get("rejection_reasons", []))

        # Build fraud queue list dynamically
        from collections import defaultdict
        member_day_claims = defaultdict(list)
        for c in claims:
            mid = c.get("member_id")
            t_date = c.get("treatment_date")
            if mid and t_date:
                member_day_claims[(mid, t_date)].append(c)

        fraud_queue = []
        for (mid, t_date), group in member_day_claims.items():
            if len(group) > 4:
                m_name = group[0].get("member_name", "Unknown")
                total_amt = sum(g.get("claim_amount", 0) for g in group)
                claim_ids = [g.get("source_document_name") or g.get("document_name") or "Claim" for g in group]
                flagged_time = group[-1].get("timestamp") or t_date
                fraud_queue.append({
                    "member_id": mid,
                    "member_name": m_name,
                    "claims_today": len(group),
                    "total_amount": round(total_amt, 2),
                    "claim_ids": ", ".join(claim_ids[:3]) + ("..." if len(claim_ids) > 3 else ""),
                    "flagged_time": str(flagged_time)
                })

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
            "fraud_queue": fraud_queue
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )