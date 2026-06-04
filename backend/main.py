from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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