import stripe_endpoint
import uvicorn
from app import app

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # auto‑reload during development
        workers=1,
    )
