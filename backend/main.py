from fastapi import FastAPI
from app.database import engine, Base
from app.routers import user

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SQS Team 11 API")

app.include_router(user.router)


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
