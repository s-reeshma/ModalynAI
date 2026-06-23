import httpx
import asyncio

async def run():
    try:
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": "llama3",
            "prompt": "test",
            "stream": False
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            print("Status:", resp.status_code)
            print("Response:", resp.json()["response"][:50])
    except Exception as e:
        print("Error:", e)

asyncio.run(run())
