from pymongo import MongoClient
import certifi

MONGO_URL = "mongodb+srv://sreeshmanair87_db_user:Sreeshms-%40-4@adaptive-learning-clust.zrqu46p.mongodb.net/?retryWrites=true&w=majority&appName=adaptive-learning-cluster"

try:

    client = MongoClient(
        MONGO_URL,
        tls=True,
        tlsCAFile=certifi.where()
    )

    db = client["adaptive_ai_learning"]

    print(db.list_collection_names())

    print("MongoDB Connected Successfully")

except Exception as e:

    print("ERROR:")
    print(e)