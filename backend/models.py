from sqlalchemy import Column, Integer, String, Date, Time, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime


class User(Base):
    """An account: customer, employee or admin (role field)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)       # "first_name last_name", used for display
    first_name = Column(String, nullable=True)       # nullable: the seeded admin / old accounts have none
    last_name = Column(String, nullable=True)
    fiscal_code = Column(String, unique=True, index=True, nullable=True)  # codice fiscale: identifies the person
    birth_date = Column(Date, nullable=True)
    gender = Column(String, nullable=True)           # "M" | "F"
    address = Column(String, nullable=True)          # street of residence
    city = Column(String, nullable=True)             # town of residence
    postal_code = Column(String, nullable=True)      # CAP (5 digits)
    phone = Column(String, nullable=True)
    citizenship = Column(String, nullable=True)      # customers only
    email = Column(String, unique=True, nullable=True)
    role = Column(String, nullable=False, default="customer")  # "admin" | "employee" | "customer"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    services = relationship("Service", back_populates="created_by_user")
    bookings = relationship("Booking", back_populates="user")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)           # e.g. "CAF - 730/ISEE"
    description = Column(String, default="")
    duration_minutes = Column(Integer, default=30)  # length of one slot
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_by_user = relationship("User", back_populates="services")
    slots = relationship("Slot", back_populates="service", cascade="all, delete-orphan")


class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_booked = Column(Boolean, default=False)

    service = relationship("Service", back_populates="slots")
    booking = relationship("Booking", back_populates="slot", uselist=False, cascade="all, delete-orphan")


class Booking(Base):
    """A booking of one slot by a registered customer."""
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=False, unique=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    slot = relationship("Slot", back_populates="booking")
    user = relationship("User", back_populates="bookings")