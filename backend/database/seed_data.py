from mongodb import (
    members_collection,
    policies_collection,
    providers_collection,
    claim_history_collection,
    claims_collection
)

# -------------------------
# CLEAR DATABASE
# -------------------------

members_collection.delete_many({})
policies_collection.delete_many({})
providers_collection.delete_many({})
claim_history_collection.delete_many({})
claims_collection.delete_many({})  # Clear submitted test claims too

# -------------------------
# MEMBERS
# -------------------------

members_collection.insert_many([
    {
        "member_id": "EMP100",
        "member_name": "Arjun Reddy",
        "member_age": 32,
        "covered": True,
        "join_date": "2024-01-01"
    },
    {
        "member_id": "EMP001",
        "member_name": "Rajesh Kumar",
        "member_age": 30,
        "covered": True,
        "join_date": "2024-01-01"
    },
    {
        "member_id": "EMP002",
        "member_name": "Priya Singh",
        "member_age": 28,
        "covered": True,
        "join_date": "2024-01-01"
    },
    {
        "member_id": "EMP003",
        "member_name": "Amit Verma",
        "member_age": 45,
        "covered": True,
        "join_date": "2024-01-01"
    },
    {
        "member_id": "EMP005",
        "member_name": "Neha Sharma",
        "member_age": 27,
        "covered": True,
        "join_date": "2026-05-01"  # Recently joined — inside diabetes 90-day window
    }
])

# -------------------------
# POLICIES
# -------------------------

policies_collection.insert_many([
    {
        "member_id": "EMP100",
        "active": True,
        "annual_limit": 50000,
        "annual_used": 5000,
        "max_claims_per_day": 10,
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
    },
    {
        "member_id": "EMP001",
        "active": True,
        "annual_limit": 50000,
        "annual_used": 5000,
        "max_claims_per_day": 12,
        "per_claim_limit": 7000,
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
    },
    {
        "member_id": "EMP002",
        "active": True,
        "annual_limit": 50000,
        "annual_used": 10000,
        "max_claims_per_day": 8,
        "per_claim_limit": 7000,
        "dental_limit": 5000,
        "vision_limit": 4000,
        "initial_waiting_days": 30,
        "diabetes_waiting_days": 90,
        "hypertension_waiting_days": 90,
        "maternity_waiting_days": 270,
        "joint_replacement_waiting_days": 730
    },
    {
        "member_id": "EMP003",
        "active": False,
        "annual_limit": 50000,
        "annual_used": 0,
        "max_claims_per_day": 5,
        "initial_waiting_days": 30,
        "diabetes_waiting_days": 90,
        "hypertension_waiting_days": 90,
        "maternity_waiting_days": 270,
        "joint_replacement_waiting_days": 730
    },
    {
        "member_id": "EMP005",
        "active": True,
        "annual_limit": 50000,
        "annual_used": 0,
        "max_claims_per_day": 6,
        "per_claim_limit": 7000,
        "dental_limit": 5000,
        "vision_limit": 4000,
        "initial_waiting_days": 30,
        "diabetes_waiting_days": 90,
        "hypertension_waiting_days": 90,
        "maternity_waiting_days": 270,
        "joint_replacement_waiting_days": 730
    }
])

# -------------------------
# PROVIDERS
# -------------------------

providers_collection.insert_many([
    {
        "doctor_registration": "KA/45678/2015",
        "doctor_name": "Dr Akshara Raje",
        "hospital_name": "Apollo Clinic Bangalore",
        "specialization": "General Medicine",
        "blacklisted": False,
        "network_provider": True
    },
    {
        "doctor_registration": "DL/12345/2018",
        "doctor_name": "Dr A. K. Sharma",
        "hospital_name": "Max Clinic Delhi",
        "specialization": "General Medicine",
        "blacklisted": False,
        "network_provider": True
    },
    {
        "doctor_registration": "MH/23456/2018",
        "doctor_name": "Dr Patel",
        "hospital_name": "Fortis Hospital Mumbai",
        "specialization": "Dentistry",
        "blacklisted": False,
        "network_provider": False
    },
    {
        "doctor_registration": "DL/34567/2016",
        "doctor_name": "Dr Gupta",
        "hospital_name": "AIIMS Delhi",
        "specialization": "Gastroenterology",
        "blacklisted": False,
        "network_provider": False
    },
    {
        "doctor_registration": "FRAUD/00001/2020",
        "doctor_name": "Dr Fraud Doctor",
        "hospital_name": "Blacklisted Provider Center",
        "specialization": "Unknown",
        "blacklisted": True,
        "network_provider": False
    }
])

# -------------------------
# CLAIM HISTORY
# -------------------------
# Empty history = no fraud/manual review

print("Seed Data Loaded Successfully")