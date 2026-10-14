from sqlalchemy import Column, Integer, String, Date, Time, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="employee")  # "admin" | "employee"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    services = relationship("Service", back_populates="created_by_employee")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)           # es. "CAF - 730/ISEE"
    description = Column(String, default="")
    duration_minutes = Column(Integer, default=30)  # durata di uno slot
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("employees.id"), nullable=True)

    created_by_employee = relationship("Employee", back_populates="services")
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
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=False, unique=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, default="")
    notes = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    slot = relationship("Slot", back_populates="booking")
