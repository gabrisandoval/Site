"""
Inizializza il database: crea le tabelle (se non esistono) e l'account
"admin" di default al primissimo avvio del progetto.

Eseguire con:  python seed.py
Viene richiamato automaticamente anche all'avvio di main.py.
"""
from database import Base, engine, SessionLocal
import models
from auth import hash_password

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"  # da cambiare al primo accesso


def init_db():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing_admin = db.query(models.User).filter(
            models.User.username == DEFAULT_ADMIN_USERNAME
        ).first()

        if existing_admin is None:
            admin = models.User(
                username=DEFAULT_ADMIN_USERNAME,
                password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
                full_name="Amministratore",
                role="admin",
            )
            db.add(admin)
            db.commit()
            print(f"[seed] Account admin creato -> username: '{DEFAULT_ADMIN_USERNAME}', "
                  f"password: '{DEFAULT_ADMIN_PASSWORD}' (CAMBIARE SUBITO al primo accesso)")
        else:
            print("[seed] Account admin gia' presente, nessuna azione necessaria.")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
