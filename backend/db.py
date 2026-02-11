import hashlib
import os
import random
import sqlite3
from pathlib import Path

import env

# Path to the SQLite database file, placed in the same directory as this module
DB_PATH = Path(__file__).parent / "app.sqlite3"


def init_db() -> None:
    """Create the SQLite database and tables if they don't already exist.

    This function is intended to be called during the FastAPI application
    startup.  It will create a ``users`` table as a minimal example,
    but you can extend this function to create additional tables or perform
    migrations.
    """
    db_exists = DB_PATH.exists()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if not db_exists:
        # Create a simple users table. Feel free to modify or add more
        # tables here as your application grows.
        cursor.execute(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT,
                passhash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        conn.commit()

    cursor.close()
    conn.close()
    print(f"Database initialized at {DB_PATH}")

    # create admin user if it doesn't exist
    if getUser(env.ADMIN_USERNAME) is None:
        setUser(env.ADMIN_USERNAME, env.ADMIN_EMAIL, env.ADMIN_PASSWORD)


def get_connection() -> sqlite3.Connection:
    """Return a new SQLite connection to the database.

    Callers should close the connection when they are done to avoid
    leaking file descriptors.
    """
    return sqlite3.connect(DB_PATH)


# Expose the init_db function for import in the FastAPI startup event.
__all__ = ["init_db", "get_connection"]


def setUser(username: str, email: str, password: str) -> None:
    """Insert a new user into the database."""
    salt = random.randbytes(16).hex()
    passhash = hashlib.sha256((password + salt).encode()).hexdigest()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (username, email, passhash, salt)
        VALUES (?, ?, ?, ?);
        """,
        (username, email, passhash, salt),
    )
    conn.commit()
    cursor.close()
    conn.close()


def getUser(username: str) -> dict | None:
    """Retrieve a user from the database by username."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, username, email, passhash, salt, created_at
        FROM users
        WHERE username = ?;
        """,
        (username,),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if row:
        return {
            "id": row[0],
            "username": row[1],
            "email": row[2],
            "passhash": row[3],
            "salt": row[4],
            "created_at": row[5],
        }
    else:
        return None


def check_password(username: str, password: str) -> bool:
    """Check if the provided password matches the stored hash for the user."""
    user = getUser(username)
    if not user:
        return False

    salt = user["salt"]
    expected_hash = user["passhash"]
    provided_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return provided_hash == expected_hash
