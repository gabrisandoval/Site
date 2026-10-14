import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


def _check_password_bytes(value: str) -> str:
    # bcrypt accetta al massimo 72 byte: oltre, la password verrebbe rifiutata
    if len(value.encode("utf-8")) > 72:
        raise ValueError("La password e' troppo lunga (massimo 72 caratteri)")
    return value


# --- Auth ---
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


class RegisterRequest(BaseModel):
    """Registrazione pubblica di un cliente. Il ruolo NON si sceglie: e' sempre 'customer'."""
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=100)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)

    _password_ok = field_validator("password")(_check_password_bytes)


# --- Utenti ---
class StaffCreate(BaseModel):
    """Creazione di un account dipendente/admin (solo admin)."""
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=100)
    role: Literal["admin", "employee"] = "employee"

    _password_ok = field_validator("password")(_check_password_bytes)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    email: str | None = None
    role: str
    created_at: datetime.datetime


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

    _password_ok = field_validator("new_password")(_check_password_bytes)
