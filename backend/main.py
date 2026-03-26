from fastapi import FastAPI
from app.database import engine, Base
from app.routers import user, auth
from app.routers import quiz

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SQS Team 11 API")

app.add_middleware(
    CORSMiddleware,
    #For development, allow all origins. In production, specify allowed origins.
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(user.router)
app.include_router(auth.router)
app.include_router(quiz.router)


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
