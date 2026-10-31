"""
The admin resets the password of any account.

The old password cannot be read back (it is stored as a hash), so the admin never
"sees" it: the server makes a NEW temporary one, saves it and shows it once. The admin
gives it to the person, who can then change it from "Profilo".
"""
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import auth
import models
from database import get_db

router = APIRouter()

# No look-alike characters (0/O, 1/l/I): easy to read out loud or type
ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def make_temporary_password(length: int = 12) -> str:
    """Random password with at least one lowercase letter, one capital and one digit."""
    while True:
        password = "".join(secrets.choice(ALPHABET) for _ in range(length))
        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
        ):
            return password


@router.post("/admin/users/{user_id}/reset-password")
def reset_password(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """Admin only: gives the account a new temporary password and returns it (once)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    temporary = make_temporary_password()
    user.password_hash = auth.hash_password(temporary)
    db.commit()

    return {
        "username": user.username,
        "full_name": user.full_name,
        "temporary_password": temporary,
    }