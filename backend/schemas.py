import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict


# --- Auth ---
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


# --- Employee ---
class EmployeeCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: Literal["admin", "employee"] = "employee"


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    role: str
    created_at: datetime.datetime


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
