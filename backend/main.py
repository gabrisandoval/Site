from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
import auth
from seed import init_db

app = FastAPI(title="CISL-App Backend", version="0.2.0")

# In sviluppo permettiamo al frontend React (es. su localhost:5173) di chiamare le API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # da restringere in produzione al dominio del frontend
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


# ---------- AUTENTICAZIONE ----------
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
    """Registrazione pubblica: crea sempre un utente 'customer' e lo fa entrare subito."""
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


# ---------- GESTIONE PERSONALE (solo admin) ----------
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
