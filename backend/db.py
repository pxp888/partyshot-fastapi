import hashlib
import random

import env
import psycopg2
from psycopg2 import sql

# --------------------------------------------------------------------------- #
# Database connection helpers
# --------------------------------------------------------------------------- #


def get_connection():
    """Return a new PostgreSQL connection to the database."""
    return psycopg2.connect(
        host=env.DB_HOST,
        port=env.DB_PORT,
        dbname=env.DB_NAME,
        user=env.DB_USER,
        password=env.DB_PASSWORD,
    )


# --------------------------------------------------------------------------- #
# Schema setup
# --------------------------------------------------------------------------- #


def init_db() -> None:
    """
    Create the PostgreSQL database tables if they don't already exist.

    This function is intended to be called during the FastAPI application
    startup.  It will create a ``users`` table as a minimal example,
    but you can extend this function to create additional tables or perform
    migrations.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Create a simple users table. Feel free to modify or add more tables
    # here as your application grows.
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT,
            passhash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS albums (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            open BOOLEAN DEFAULT TRUE,
            public BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS photos (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
            s3_key TEXT NOT NULL,
            thumb_key TEXT NOT NULL,
            filename TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    conn.commit()

    cursor.close()
    conn.close()
    print("Database schema initialized.")

    # create admin user if it doesn't exist
    if getUser(env.ADMIN_USERNAME) is None:
        print(f"Creating admin user: {env.ADMIN_USERNAME}")
        setUser(env.ADMIN_USERNAME, env.ADMIN_EMAIL, env.ADMIN_PASSWORD)


# --------------------------------------------------------------------------- #
# User CRUD helpers
# --------------------------------------------------------------------------- #


def setUser(username: str, email: str, password: str) -> None:
    """Insert a new user into the database."""
    salt = random.randbytes(16).hex()
    passhash = hashlib.sha256((password + salt).encode()).hexdigest()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (username, email, passhash, salt)
        VALUES (%s, %s, %s, %s);
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
        WHERE username = %s;
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


def get_albums(user_id: int) -> list[dict]:
    """Retrieve all albums for a given user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, name, open, public, created_at
        FROM albums
        WHERE user_id = %s;
        """,
        (user_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [
        {
            "id": row[0],
            "name": row[1],
            "open": row[2],
            "public": row[3],
            "created_at": row[4],
        }
        for row in rows
    ]


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

__all__ = ["init_db", "get_connection", "setUser", "getUser", "check_password"]
