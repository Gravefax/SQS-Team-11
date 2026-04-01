from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import quiz
from app.routers import user, auth, battle

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SQS Team 11 API")

app.add_middleware(
   CORSMiddleware,
  allow_origins=["http://localhost:3000"],
 allow_methods=["*"],
allow_headers=["*"],
allow_credentials=True,
)

app.include_router(user.router)
app.include_router(auth.router)
app.include_router(quiz.router)
app.include_router(battle.router)


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
