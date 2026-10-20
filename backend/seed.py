"""
Initialize the database: create the tables (if missing) and the default
"admin" account the very first time the project starts.

Run with:  python seed.py
It is also called automatically when main.py starts.
"""
from sqlalchemy import text
from database import Base, engine, SessionLocal
import models
from auth import hash_password

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"  # change it at first login


# Columns added after the first version. create_all() never alters an existing
# table, so we add the missing ones by hand (no data is lost).
NEW_USER_COLUMNS = {
    "first_name": "VARCHAR",
    "last_name": "VARCHAR",
    "address": "VARCHAR",
    "city": "VARCHAR",
    "postal_code": "VARCHAR",
    "phone": "VARCHAR",
    "citizenship": "VARCHAR",
    "fiscal_code": "VARCHAR",
    "birth_date": "DATE",
    "gender": "VARCHAR",
}


def add_missing_user_columns():
    with engine.begin() as conn:
        existing = {row[1] for row in conn.execute(text("PRAGMA table_info(users)"))}
        for column, sql_type in NEW_USER_COLUMNS.items():
            if column not in existing:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {column} {sql_type}"))
                print(f"[seed] Colonna users.{column} aggiunta.")
        # Two people can never share the same fiscal code (several NULLs are fine)
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_fiscal_code ON users (fiscal_code)"
        ))


def init_db():
    Base.metadata.create_all(bind=engine)
    add_missing_user_columns()

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