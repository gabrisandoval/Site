import os
import datetime
import bcrypt
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
import models

# --- Configurazione JWT ---
# In produzione: leggere SECRET_KEY da variabile d'ambiente, mai hardcoded.
SECRET_KEY = os.environ.get("CISL_APP_SECRET_KEY", "dev-secret-key-cambiami-in-produzione")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 ore

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# --- Password hashing ---
def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))


# --- JWT ---
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token non valido o scaduto",
            headers={"WWW-Authenticate": "Bearer"},
        )


# --- Dipendenze FastAPI ---
def get_current_employee(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.Employee:
    payload = decode_access_token(token)
    employee_id = payload.get("sub")
    if employee_id is None:
        raise HTTPException(status_code=401, detail="Token non valido")

    employee = db.query(models.Employee).filter(models.Employee.id == int(employee_id)).first()
    if employee is None:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return employee


def require_admin(current_employee: models.Employee = Depends(get_current_employee)) -> models.Employee:
    if current_employee.role != "admin":
        raise HTTPException(status_code=403, detail="Operazione riservata all'amministratore")
    return current_employee
