from fastapi import FastAPI
from backend.app.database import engine
from backend.app.models import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SQS Team 11 API")


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
