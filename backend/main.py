from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from routes.claims import router as claims_router
from routes.upload import router as upload_router

app = FastAPI(
    title="Plum OPD Claim Adjudication API",
    description="AI-powered Health Insurance Claim Adjudication System",
    version="1.0.0"
)

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    claims_router,
    prefix="/claims",
    tags=["Claims"]
)

app.include_router(
    upload_router,
    prefix="/documents",
    tags=["Documents"]
)

from database.mongodb import policies_collection, providers_collection
from services.adjudication import AdjudicationService

@app.get("/policy")
def get_policy():
    try:
        policies = list(policies_collection.find({}, {"_id": 0}))
        return {
            "policies": policies,
            "rules": {
                "exclusions": AdjudicationService.EXCLUSIONS,
                "per_claim_limit": AdjudicationService.PER_CLAIM_LIMIT,
                "min_claim_amount": AdjudicationService.MIN_CLAIM_AMOUNT,
                "copay_percentage": AdjudicationService.COPAY_PERCENTAGE,
                "high_value_threshold": AdjudicationService.HIGH_VALUE_THRESHOLD
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/providers")
def get_providers():
    try:
        providers = list(providers_collection.find({}, {"_id": 0}))
        return {"providers": providers}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# --------------------------------------------------
# PROVIDER CRUD (Item #6)
# --------------------------------------------------

class ProviderInput(BaseModel):
    doctor_registration: str
    doctor_name: str
    hospital_name: str
    specialization: str = "General Medicine"
    blacklisted: bool = False
    network_provider: bool = False
    active: bool = True


@app.post("/providers/add")
def add_provider(provider: ProviderInput):
    try:
        existing = providers_collection.find_one(
            {"doctor_registration": provider.doctor_registration}
        )
        if existing:
            return {"status": "error", "message": "Provider with this registration already exists"}

        providers_collection.insert_one({
            "doctor_registration": provider.doctor_registration,
            "doctor_name": provider.doctor_name,
            "hospital_name": provider.hospital_name,
            "specialization": provider.specialization,
            "blacklisted": provider.blacklisted,
            "network_provider": provider.network_provider,
            "active": provider.active,
        })

        return {"status": "success", "message": "Provider added successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.put("/providers/edit")
def edit_provider(provider: ProviderInput):
    try:
        result = providers_collection.update_one(
            {"doctor_registration": provider.doctor_registration},
            {"$set": {
                "doctor_name": provider.doctor_name,
                "hospital_name": provider.hospital_name,
                "specialization": provider.specialization,
                "blacklisted": provider.blacklisted,
                "network_provider": provider.network_provider,
                "active": provider.active,
            }}
        )
        if result.matched_count == 0:
            return {"status": "error", "message": "Provider not found"}
        return {"status": "success", "message": "Provider updated successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.put("/providers/blacklist")
def toggle_blacklist(registration: str):
    try:
        provider = providers_collection.find_one({"doctor_registration": registration})
        if not provider:
            return {"status": "error", "message": "Provider not found"}

        new_status = not provider.get("blacklisted", False)
        providers_collection.update_one(
            {"doctor_registration": registration},
            {"$set": {"blacklisted": new_status}}
        )

        return {
            "status": "success",
            "doctor_registration": registration,
            "blacklisted": new_status,
            "message": f"Provider {'blacklisted' if new_status else 'unblacklisted'} successfully"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.put("/providers/deactivate")
def deactivate_provider(registration: str):
    try:
        provider = providers_collection.find_one({"doctor_registration": registration})
        if not provider:
            return {"status": "error", "message": "Provider not found"}

        new_status = not provider.get("active", True)
        providers_collection.update_one(
            {"doctor_registration": registration},
            {"$set": {"active": new_status}}
        )

        return {
            "status": "success",
            "doctor_registration": registration,
            "active": new_status,
            "message": f"Provider {'activated' if new_status else 'deactivated'} successfully"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/")
def root():
    return {
        "status": "success",
        "message": "Plum OPD Claim Adjudication API Running",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    import os
    from database.mongodb import db

    mongo_status = "UP"
    try:
        db.command("ping")
    except Exception:
        mongo_status = "DOWN"

    groq_status = "UP" if os.getenv("GROQ_API_KEY") else "DOWN"

    return {
        "status": "healthy" if mongo_status == "UP" else "degraded",
        "details": {
            "backend": "UP",
            "mongodb": mongo_status,
            "groq": groq_status,
            "ocr": "UP",
            "api_health": "UP"
        },
        "version": "1.0.0",
        "environment": os.getenv("ENV", "Production")
    }