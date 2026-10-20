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
    username: str


# Shared field rules for the personal data of every new account
_NAME = dict(min_length=2, max_length=50)
_ADDRESS = dict(min_length=5, max_length=150)
_CITY = dict(min_length=2, max_length=80)
_POSTAL_CODE = dict(pattern=r"^[0-9]{5}$")  # Italian CAP
_PHONE = dict(pattern=r"^\+?[0-9 ]{6,20}$")
# Only the shape here: the full check (control character, birth date, gender)
# is done in main.py so the user gets a readable Italian message.
_FISCAL_CODE = dict(min_length=16, max_length=16, pattern=r"^[A-Za-z0-9]{16}$")


class RegisterRequest(BaseModel):
    """Public customer registration. The role is NOT chosen (always 'customer')
    and the username is NOT chosen either: the server builds 'first.last'."""
    first_name: str = Field(**_NAME)
    last_name: str = Field(**_NAME)
    fiscal_code: str = Field(**_FISCAL_CODE)
    birth_date: datetime.date
    gender: Literal["M", "F"]
    password: str = Field(min_length=8)
    address: str = Field(**_ADDRESS)
    city: str = Field(**_CITY)
    postal_code: str = Field(**_POSTAL_CODE)
    phone: str = Field(**_PHONE)
    citizenship: str = Field(min_length=2, max_length=60)
    email: str | None = Field(default=None, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)

    _password_ok = field_validator("password")(_check_password_bytes)


# --- Users ---
class StaffCreate(BaseModel):
    """Creation of an employee/admin account (admin only). Username is automatic."""
    first_name: str = Field(**_NAME)
    last_name: str = Field(**_NAME)
    fiscal_code: str = Field(**_FISCAL_CODE)
    birth_date: datetime.date
    gender: Literal["M", "F"]
    password: str = Field(min_length=8)
    address: str = Field(**_ADDRESS)
    city: str = Field(**_CITY)
    postal_code: str = Field(**_POSTAL_CODE)
    phone: str = Field(**_PHONE)
    role: Literal["admin", "employee"] = "employee"

    _password_ok = field_validator("password")(_check_password_bytes)


class ProfileUpdate(BaseModel):
    """What a logged-in person can change about themselves. Name, fiscal code, birth
    date and gender are NOT here: they identify the person and stay as registered.
    Only the fields that are sent get changed (email: null removes it)."""
    address: str | None = Field(default=None, **_ADDRESS)
    city: str | None = Field(default=None, **_CITY)
    postal_code: str | None = Field(default=None, **_POSTAL_CODE)
    phone: str | None = Field(default=None, **_PHONE)
    citizenship: str | None = Field(default=None, min_length=2, max_length=60)
    email: str | None = Field(default=None, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    first_name: str | None = None
    last_name: str | None = None
    fiscal_code: str | None = None
    birth_date: datetime.date | None = None
    gender: str | None = None
    address: str | None = None
    city: str | None = None
    postal_code: str | None = None
    phone: str | None = None
    citizenship: str | None = None
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