from sqlalchemy import Column, Integer, String
from backend.app.database import Base


# Beispiel eines Modells, das in der Datenbank gespeichert wird
class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
