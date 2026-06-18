from pymongo import MongoClient
import certifi

MONGO_URL = "mongodb+srv://sreeshmanair87_db_user:Sreeshms-%40-4@adaptive-learning-clust.zrqu46p.mongodb.net/?retryWrites=true&w=majority&appName=adaptive-learning-cluster"

try:
    """
    <h3>Explanation</h3>
                  <p>{step.content.explanation}</p>
                  
                  {step.content.analogy && (
                    <>
                      <h3>Analogy</h3>
                      <p>{step.content.analogy}</p>
                    </>
                  )}

                  {step.content.example && (
                    <>
                      <h3>Example</h3>
                      <p>{step.content.example}</p>
                    </>"""
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