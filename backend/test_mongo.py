from database.mongodb import claims_collection

claims_collection.insert_one({
    "test": "mongodb working"
})

print("Inserted Successfully")