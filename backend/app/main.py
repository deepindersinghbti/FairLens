from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.analysis import router as analysis_router
from app.routes.demo import router as demo_router
from app.routes.report import router as report_router
from app.routes.upload import router as upload_router


app = FastAPI(title="FairLens API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
