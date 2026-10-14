from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
import auth
from seed import init_db

app = FastAPI(title="CISL-App Backend", version="0.1.0")

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
    employee = db.query(models.Employee).filter(
        models.Employee.username == credentials.username
    ).first()

    if employee is None or not auth.verify_password(credentials.password, employee.password_hash):
        raise HTTPException(status_code=401, detail="Username o password non corretti")

    token = auth.create_access_token(data={"sub": str(employee.id)})
    return schemas.TokenResponse(
        access_token=token,
        role=employee.role,
        full_name=employee.full_name,
    )


@app.get("/auth/me", response_model=schemas.EmployeeOut)
def get_me(current_employee: models.Employee = Depends(auth.get_current_employee)):
    return current_employee


@app.post("/auth/change-password")
def change_password(
    data: schemas.PasswordChange,
    current_employee: models.Employee = Depends(auth.get_current_employee),
    db: Session = Depends(get_db),
):
    if not auth.verify_password(data.current_password, current_employee.password_hash):
        raise HTTPException(status_code=400, detail="Password attuale non corretta")

    current_employee.password_hash = auth.hash_password(data.new_password)
    db.commit()
    return {"status": "ok", "message": "Password aggiornata"}


# ---------- GESTIONE DIPENDENTI (solo admin) ----------
@app.get("/admin/employees", response_model=List[schemas.EmployeeOut])
def list_employees(
    db: Session = Depends(get_db),
    _admin: models.Employee = Depends(auth.require_admin),
):
    return db.query(models.Employee).all()


@app.post("/admin/employees", response_model=schemas.EmployeeOut)
def create_employee(
    data: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    _admin: models.Employee = Depends(auth.require_admin),
):
    existing = db.query(models.Employee).filter(models.Employee.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username gia' esistente")

    new_employee = models.Employee(
        username=data.username,
        password_hash=auth.hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
    )
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    return new_employee


@app.delete("/admin/employees/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    admin: models.Employee = Depends(auth.require_admin),
):
    if employee_id == admin.id:
        raise HTTPException(status_code=400, detail="Non puoi eliminare il tuo stesso account")

    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")

    db.delete(employee)
    db.commit()
    return {"status": "ok", "message": "Dipendente eliminato"}
