from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: UUID
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}
