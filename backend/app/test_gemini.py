from gemini_config import client
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="teach recursion"
)
print(response.text)