import datetime

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
import auth
from seed import init_db

app = FastAPI(title="CISL-App Backend", version="0.5.0")

# In development we allow the React frontend (e.g. on localhost:5173) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict to the frontend's domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {"status": "ok", "message": "CISL-App backend attivo"}


# ---------- AUTHENTICATION ----------
@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.username == credentials.username
    ).first()

    if user is None or not auth.verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Username o password non corretti")

    token = auth.create_access_token(data={"sub": str(user.id)})
    return schemas.TokenResponse(
        access_token=token,
        role=user.role,
        full_name=user.full_name,
    )


@app.post("/auth/register", response_model=schemas.TokenResponse, status_code=201)
def register(data: schemas.RegisterRequest, db: Session = Depends(get_db)):
    """Public registration: always creates a 'customer' user and logs them in right away."""
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username gia' in uso")

    email = data.email.lower()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="Email gia' registrata")

    user = models.User(
        username=data.username,
        password_hash=auth.hash_password(data.password),
        full_name=data.full_name.strip(),
        email=email,
        role="customer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token(data={"sub": str(user.id)})
    return schemas.TokenResponse(access_token=token, role=user.role, full_name=user.full_name)


@app.get("/auth/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.post("/auth/change-password")
def change_password(
    data: schemas.PasswordChange,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not auth.verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Password attuale non corretta")

    current_user.password_hash = auth.hash_password(data.new_password)
    db.commit()
    return {"status": "ok", "message": "Password aggiornata"}


# ---------- STAFF MANAGEMENT (admin only) ----------
@app.get("/admin/employees", response_model=List[schemas.UserOut])
def list_employees(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    return (
        db.query(models.User)
        .filter(models.User.role.in_(["admin", "employee"]))
        .order_by(models.User.id)
        .all()
    )


@app.post("/admin/employees", response_model=schemas.UserOut, status_code=201)
def create_employee(
    data: schemas.StaffCreate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username gia' esistente")

    new_user = models.User(
        username=data.username,
        password_hash=auth.hash_password(data.password),
        full_name=data.full_name.strip(),
        role=data.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.delete("/admin/employees/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.require_admin),
):
    if employee_id == admin.id:
        raise HTTPException(status_code=400, detail="Non puoi eliminare il tuo stesso account")

    user = (
        db.query(models.User)
        .filter(models.User.id == employee_id, models.User.role.in_(["admin", "employee"]))
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")

    db.delete(user)
    db.commit()
    return {"status": "ok", "message": "Dipendente eliminato"}


# ---------- SERVICES ----------
@app.get("/services", response_model=List[schemas.ServiceOut])
def list_active_services(db: Session = Depends(get_db)):
    """Public (no login): active services only, for the Home page."""
    return (
        db.query(models.Service)
        .filter(models.Service.is_active == True)  # noqa: E712
        .order_by(models.Service.id)
        .all()
    )


@app.get("/staff/services", response_model=List[schemas.ServiceOut])
def list_all_services(
    db: Session = Depends(get_db),
    _staff: models.User = Depends(auth.require_staff),
):
    """For the Dashboard: all services, including deactivated ones."""
    return db.query(models.Service).order_by(models.Service.id).all()


@app.post("/staff/services", response_model=schemas.ServiceOut, status_code=201)
def create_service(
    data: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    staff: models.User = Depends(auth.require_staff),
):
    service = models.Service(
        name=data.name.strip(),
        description=data.description.strip(),
        duration_minutes=data.duration_minutes,
        is_active=data.is_active,
        created_by=staff.id,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


def _get_service_or_404(db: Session, service_id: int) -> models.Service:
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if service is None:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    return service


@app.patch("/staff/services/{service_id}", response_model=schemas.ServiceOut)
def update_service(
    service_id: int,
    data: schemas.ServiceUpdate,
    db: Session = Depends(get_db),
    _staff: models.User = Depends(auth.require_staff),
):
    """Edit a service or activate/deactivate it (is_active)."""
    service = _get_service_or_404(db, service_id)

    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        if field in ("name", "description") and value is not None:
            value = value.strip()
        if field in ("name", "duration_minutes", "is_active") and value is None:
            raise HTTPException(status_code=422, detail=f"Il campo '{field}' non puo' essere nullo")
        setattr(service, field, value if value is not None else "")

    db.commit()
    db.refresh(service)
    return service


@app.delete("/staff/services/{service_id}")
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    _staff: models.User = Depends(auth.require_staff),
):
    """Delete a service, but only if it has no bookings: otherwise deactivate it."""
    service = _get_service_or_404(db, service_id)

    has_bookings = (
        db.query(models.Slot)
        .filter(models.Slot.service_id == service_id, models.Slot.is_booked == True)  # noqa: E712
        .first()
    )
    if has_bookings:
        raise HTTPException(
            status_code=400,
            detail="Il servizio ha prenotazioni: disattivalo invece di eliminarlo",
        )

    db.delete(service)
    db.commit()
    return {"status": "ok", "message": "Servizio eliminato"}


# ---------- AVAILABILITY (SLOTS) ----------
MAX_SLOTS_PER_REQUEST = 60


@app.post(
    "/staff/services/{service_id}/slots",
    response_model=List[schemas.SlotOut],
    status_code=201,
)
def generate_slots(
    service_id: int,
    data: schemas.SlotGenerate,
    db: Session = Depends(get_db),
    _staff: models.User = Depends(auth.require_staff),
):
    """
    Create the slots of one day by splitting the time range into blocks as long
    as the service duration. E.g. 09:00-12:00 with a 30-minute service -> 6 slots.
    """
    service = _get_service_or_404(db, service_id)

    if data.date < datetime.date.today():
        raise HTTPException(status_code=400, detail="Non puoi creare disponibilita' nel passato")
    if data.end_time <= data.start_time:
        raise HTTPException(status_code=400, detail="L'orario di fine deve essere dopo quello di inizio")

    start_min = data.start_time.hour * 60 + data.start_time.minute
    end_min = data.end_time.hour * 60 + data.end_time.minute
    step = service.duration_minutes
    if end_min - start_min < step:
        raise HTTPException(
            status_code=400,
            detail=f"La fascia e' piu' corta della durata del servizio ({step} minuti)",
        )

    wanted = []
    current = start_min
    while current + step <= end_min:
        wanted.append((
            datetime.time(current // 60, current % 60),
            datetime.time((current + step) // 60, (current + step) % 60),
        ))
        current += step

    if len(wanted) > MAX_SLOTS_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Troppi slot in una volta (massimo {MAX_SLOTS_PER_REQUEST})",
        )

    # No overlap with slots that already exist for the same service and day
    existing = (
        db.query(models.Slot)
        .filter(models.Slot.service_id == service_id, models.Slot.date == data.date)
        .all()
    )
    for start, end in wanted:
        for slot in existing:
            if start < slot.end_time and slot.start_time < end:
                raise HTTPException(
                    status_code=400,
                    detail=f"Esiste gia' uno slot che si sovrappone alle {start.strftime('%H:%M')}",
                )

    created = [
        models.Slot(service_id=service_id, date=data.date, start_time=start, end_time=end)
        for start, end in wanted
    ]
    db.add_all(created)
    db.commit()
    for slot in created:
        db.refresh(slot)
    return created


@app.get("/staff/services/{service_id}/slots", response_model=List[schemas.SlotOut])
def list_service_slots(
    service_id: int,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    db: Session = Depends(get_db),
    _staff: models.User = Depends(auth.require_staff),
):
    """All slots of the service (free and booked), with an optional date filter."""
    _get_service_or_404(db, service_id)

    query = db.query(models.Slot).filter(models.Slot.service_id == service_id)
    if date_from:
        query = query.filter(models.Slot.date >= date_from)
    if date_to:
        query = query.filter(models.Slot.date <= date_to)
    return query.order_by(models.Slot.date, models.Slot.start_time).all()


@app.delete("/staff/slots/{slot_id}")
def delete_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    _staff: models.User = Depends(auth.require_staff),
):
    slot = db.query(models.Slot).filter(models.Slot.id == slot_id).first()
    if slot is None:
        raise HTTPException(status_code=404, detail="Slot non trovato")
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="Lo slot e' prenotato e non si puo' eliminare")

    db.delete(slot)
    db.commit()
    return {"status": "ok", "message": "Slot eliminato"}


@app.delete("/staff/services/{service_id}/slots")
def delete_day_slots(
    service_id: int,
    date: datetime.date,
    db: Session = Depends(get_db),
    _staff: models.User = Depends(auth.require_staff),
):
    """Delete all FREE slots of a day (booked ones are kept)."""
    _get_service_or_404(db, service_id)

    free_slots = (
        db.query(models.Slot)
        .filter(
            models.Slot.service_id == service_id,
            models.Slot.date == date,
            models.Slot.is_booked == False,  # noqa: E712
        )
        .all()
    )
    for slot in free_slots:
        db.delete(slot)
    db.commit()
    return {"status": "ok", "deleted": len(free_slots)}


@app.get("/services/{service_id}/slots", response_model=List[schemas.SlotOut])
def list_free_slots(
    service_id: int,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    db: Session = Depends(get_db),
):
    """
    Public: the FREE, future slots of an active service, for the booking calendar.
    Without dates it returns the next 60 days.
    """
    service = (
        db.query(models.Service)
        .filter(models.Service.id == service_id, models.Service.is_active == True)  # noqa: E712
        .first()
    )
    if service is None:
        raise HTTPException(status_code=404, detail="Servizio non trovato")

    now = datetime.datetime.now()
    today = now.date()
    start = max(date_from, today) if date_from else today
    end = date_to if date_to else today + datetime.timedelta(days=60)

    slots = (
        db.query(models.Slot)
        .filter(
            models.Slot.service_id == service_id,
            models.Slot.is_booked == False,  # noqa: E712
            models.Slot.date >= start,
            models.Slot.date <= end,
        )
        .order_by(models.Slot.date, models.Slot.start_time)
        .all()
    )
    # today's slots that are already in the past cannot be booked
    return [s for s in slots if not (s.date == today and s.start_time <= now.time())]


# ---------- BOOKINGS ----------
def _booking_fields(booking: models.Booking) -> dict:
    """Flatten a booking (with its slot and service) into the fields of BookingOut."""
    slot = booking.slot
    return {
        "id": booking.id,
        "slot_id": slot.id,
        "service_id": slot.service_id,
        "service_name": slot.service.name,
        "date": slot.date,
        "start_time": slot.start_time,
        "end_time": slot.end_time,
        "notes": booking.notes or "",
        "created_at": booking.created_at,
    }


def _slot_has_started(slot: models.Slot) -> bool:
    now = datetime.datetime.now()
    return datetime.datetime.combine(slot.date, slot.start_time) <= now


@app.post("/bookings", response_model=schemas.BookingOut, status_code=201)
def create_booking(
    data: schemas.BookingCreate,
    db: Session = Depends(get_db),
    customer: models.User = Depends(auth.require_customer),
):
    slot = db.query(models.Slot).filter(models.Slot.id == data.slot_id).first()
    if slot is None or not slot.service.is_active:
        raise HTTPException(status_code=404, detail="Orario non trovato")
    if _slot_has_started(slot):
        raise HTTPException(status_code=400, detail="Questo orario e' gia' passato")

    # Atomic "claim": the UPDATE only succeeds if the slot is still free, so two
    # customers clicking at the same moment cannot both get it.
    claimed = (
        db.query(models.Slot)
        .filter(models.Slot.id == slot.id, models.Slot.is_booked == False)  # noqa: E712
        .update({"is_booked": True})
    )
    if claimed == 0:
        db.rollback()
        raise HTTPException(status_code=409, detail="Questo orario e' appena stato prenotato da qualcun altro")

    booking = models.Booking(slot_id=slot.id, user_id=customer.id, notes=data.notes.strip())
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return _booking_fields(booking)


@app.get("/bookings/me", response_model=List[schemas.BookingOut])
def my_bookings(
    db: Session = Depends(get_db),
    customer: models.User = Depends(auth.require_customer),
):
    bookings = (
        db.query(models.Booking)
        .join(models.Slot)
        .filter(models.Booking.user_id == customer.id)
        .order_by(models.Slot.date, models.Slot.start_time)
        .all()
    )
    return [_booking_fields(b) for b in bookings]


@app.delete("/bookings/{booking_id}")
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    customer: models.User = Depends(auth.require_customer),
):
    """A customer cancels one of THEIR bookings; the slot becomes free again."""
    booking = (
        db.query(models.Booking)
        .filter(models.Booking.id == booking_id, models.Booking.user_id == customer.id)
        .first()
    )
    if booking is None:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    if _slot_has_started(booking.slot):
        raise HTTPException(status_code=400, detail="Non puoi annullare una prenotazione gia' iniziata")

    booking.slot.is_booked = False
    db.delete(booking)
    db.commit()
    return {"status": "ok", "message": "Prenotazione annullata"}


@app.get("/staff/bookings", response_model=List[schemas.BookingStaffOut])
def list_all_bookings(
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    db: Session = Depends(get_db),
    _staff: models.User = Depends(auth.require_staff),
):
    """For employees and admins: every booking, with the customer's name."""
    query = db.query(models.Booking).join(models.Slot)
    if date_from:
        query = query.filter(models.Slot.date >= date_from)
    if date_to:
        query = query.filter(models.Slot.date <= date_to)

    result = []
    for booking in query.order_by(models.Slot.date, models.Slot.start_time).all():
        fields = _booking_fields(booking)
        fields["customer_name"] = booking.user.full_name
        fields["customer_email"] = booking.user.email
        result.append(fields)
    return result