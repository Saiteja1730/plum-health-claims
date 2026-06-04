from mongodb import (
    members_collection,
    policies_collection,
    providers_collection,
    claim_history_collection
)

# -------------------------
# CLEAR DATABASE
# -------------------------

members_collection.delete_many({})
policies_collection.delete_many({})
providers_collection.delete_many({})
claim_history_collection.delete_many({})

# -------------------------
# MEMBER
# -------------------------

members_collection.insert_one({
    "member_id": "EMP100",
    "member_name": "Arjun Reddy",
    "member_age": 32,
    "covered": True,
    "join_date": "2024-01-01"
})

# -------------------------
# POLICY
# -------------------------

policies_collection.insert_one({
    "member_id": "EMP100",

    "active": True,

    "annual_limit": 50000,
    "annual_used": 5000,

    "consultation_limit": 5000,
    "pharmacy_limit": 15000,
    "diagnostic_limit": 10000,
    "dental_limit": 5000,
    "vision_limit": 4000,
    "alternative_limit": 8000,

    "initial_waiting_days": 30,
    "diabetes_waiting_days": 90,
    "hypertension_waiting_days": 90,
    "maternity_waiting_days": 270,
    "joint_replacement_waiting_days": 730
})

# -------------------------
# PROVIDER
# -------------------------

providers_collection.insert_one({
    "doctor_registration": "KA/45678/2015",
    "doctor_name": "Dr Akshara Raje",
    "blacklisted": False,
    "network_provider": True
})

# -------------------------
# CLAIM HISTORY
# -------------------------
# Empty history = no fraud/manual review

print("Seed Data Loaded Successfully")