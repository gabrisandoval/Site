import os
import datetime
import bcrypt
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
import models

# --- JWT configuration ---
# In production: read SECRET_KEY from an environment variable, never hardcode it.
SECRET_KEY = os.environ.get("CISL_APP_SECRET_KEY", "dev-secret-key-cambiami-in-produzione")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# --- Password hashing ---
def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # e.g. a password longer than 72 bytes: it cannot be the right one
        return False


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


# --- FastAPI dependencies ---
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Any logged-in user (customer, employee or admin)."""
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token non valido")

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return user


def require_staff(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Employees and admins only."""
    if current_user.role not in ("admin", "employee"):
        raise HTTPException(status_code=403, detail="Operazione riservata al personale")
    return current_user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Admins only."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Operazione riservata all'amministratore")
    return current_user


def require_customer(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Customers only: bookings are made by customer accounts."""
    if current_user.role != "customer":
        raise HTTPException(status_code=403, detail="Solo i clienti possono prenotare")
    return current_user