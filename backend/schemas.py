import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


def _check_password_bytes(value: str) -> str:
    # bcrypt accepts at most 72 bytes: longer passwords would be rejected
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
    """Public customer registration. The role is NOT chosen: it is always 'customer'."""
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=100)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)

    _password_ok = field_validator("password")(_check_password_bytes)


# --- Users ---
class StaffCreate(BaseModel):
    """Creation of an employee/admin account (admin only)."""
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


# --- Services ---
class ServiceCreate(BaseModel):
    """Creation of a service (employees and admins)."""
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=500)
    duration_minutes: int = Field(default=30, ge=5, le=480)
    is_active: bool = True


class ServiceUpdate(BaseModel):
    """Partial update: only the fields to change are sent."""
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    duration_minutes: int | None = Field(default=None, ge=5, le=480)
    is_active: bool | None = None


class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    duration_minutes: int
    is_active: bool


# --- Availability (slots) ---
class SlotGenerate(BaseModel):
    """The employee gives a day and a time range: the backend creates the slots."""
    date: datetime.date
    start_time: datetime.time
    end_time: datetime.time


class SlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_id: int
    date: datetime.date
    start_time: datetime.time
    end_time: datetime.time
    is_booked: bool


# --- Bookings ---
class BookingCreate(BaseModel):
    slot_id: int
    notes: str = Field(default="", max_length=300)


class BookingOut(BaseModel):
    """A booking with the service and time information already flattened."""
    id: int
    slot_id: int
    service_id: int
    service_name: str
    date: datetime.date
    start_time: datetime.time
    end_time: datetime.time
    notes: str
    created_at: datetime.datetime


class BookingStaffOut(BookingOut):
    """Same as BookingOut, plus who booked (for employees and admins)."""
    customer_name: str
    customer_email: str | None = None