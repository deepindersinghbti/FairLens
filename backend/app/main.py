import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.analysis import router as analysis_router
from app.routes.demo import router as demo_router
from app.routes.report import router as report_router
from app.routes.upload import router as upload_router


app = FastAPI(title="FairLens API", version="0.1.0")

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://fair-lens-sigma.vercel.app",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


api = FastAPI()
api.include_router(upload_router)
api.include_router(analysis_router)
api.include_router(report_router)
api.include_router(demo_router)

app.mount("/api", api)
