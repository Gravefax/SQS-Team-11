from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

POSTGRES_USER = os.getenv("POSTGRES_USER", "quizbattle")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB = os.getenv("POSTGRES_DB", "quizbattle")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
ECHO_DATABASE = os.getenv("ECHO_DATABASE", "False").lower() in ("true", "1", "t")

DATABASE_URL = f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@localhost:{POSTGRES_PORT}/{POSTGRES_DB}"

# Echo aktiviert die Ausgabe der SQL-Befehle, die von SQLAlchemy generiert werden
engine = create_engine(DATABASE_URL, echo=ECHO_DATABASE)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
