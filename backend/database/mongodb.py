from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URI = os.getenv(
    "MONGODB_URI"
)

DATABASE_NAME = os.getenv(
    "DATABASE_NAME"
)

try:

    client = MongoClient(
        MONGODB_URI
    )

    db = client[
        DATABASE_NAME
    ]

    claims_collection = db[
        "claims"
    ]

    members_collection = db[
        "members"
    ]

    policies_collection = db[
        "policies"
    ]

    providers_collection = db[
        "providers"
    ]

    claim_history_collection = db[
        "claim_history"
    ]

    print(
        "MongoDB Connected Successfully"
    )

except Exception as e:

    print(
        f"MongoDB Connection Error: {e}"
    )