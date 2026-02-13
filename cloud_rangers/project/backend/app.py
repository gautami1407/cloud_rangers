# app.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from news_service import get_safety_news

app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to your frontend domain later
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/news")
async def fetch_news(request: Request):
    data = await request.json()
    product_name = data.get("product_name")

    if not product_name:
        return {"error": "Product name is required", "news": []}

    news = get_safety_news(product_name)
    return {"news": news}
