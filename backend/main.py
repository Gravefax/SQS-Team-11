from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import user
from app.routers import quiz

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SQS Team 11 API")


app.include_router(user.router)
app.include_router(quiz.router)


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
