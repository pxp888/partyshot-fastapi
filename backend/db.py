import datetime
import hashlib
import random
import uuid

import aws
import env
import psycopg2

# from psycopg2 import sql

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
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            open BOOLEAN DEFAULT TRUE,
            public BOOLEAN DEFAULT TRUE,
            thumb_key TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS photos (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
            s3_key TEXT,
            thumb_key TEXT,
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


def getAlbum_code(code: str) -> dict | None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT a.id, a.code, a.name, a.user_id, a.open, a.public, a.thumb_key, a.created_at, u.username
        FROM albums a
        JOIN users u ON a.user_id = u.id
        WHERE a.code = %s;
        """,
        (code,),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if row:
        created_at = row[7]
        if isinstance(created_at, datetime.datetime):
            created_at = created_at.isoformat()
        return {
            "id": row[0],
            "code": row[1],
            "name": row[2],
            "user_id": row[3],
            "open": bool(row[4]),
            "public": bool(row[5]),
            "thumb_key": aws.create_presigned_url(row[6]),
            "created_at": created_at,
            "username": row[8],  # <‑‑ new field
        }
    else:
        return None


def getPhotos(album_code: str) -> dict | None:
    album = getAlbum_code(album_code)
    if album is None:
        return None
    album_id = album["id"]

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, user_id, album_id, s3_key, thumb_key, filename, created_at
        FROM photos
        WHERE album_id = %s
        ORDER BY created_at ASC;
        """,
        (album_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    if not rows:
        return None

    photos = []
    for row in rows:
        created_at = row[6]
        if isinstance(created_at, datetime.datetime):
            created_at = created_at.isoformat()
        photos.append(
            {
                "id": row[0],
                "user_id": row[1],
                "album_id": row[2],
                "s3_key": aws.create_presigned_url(row[3]),
                "thumb_key": aws.create_presigned_url(row[4]),
                "filename": row[5],
                "created_at": created_at,
            }
        )
    return {"photos": photos}


def deleteAlbum(username: str, code: str) -> bool:
    # Verify that the user exists
    user = getUser(username)
    if not user:
        return False

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            DELETE FROM albums
            WHERE code = %s AND user_id = %s
            RETURNING id;
            """,
            (code, user["id"]),
        )
        # If RETURNING returns a row, the album existed and was deleted.
        deleted = cursor.fetchone() is not None
        conn.commit()
    except Exception:
        conn.rollback()
        deleted = False
    finally:
        cursor.close()
        conn.close()
    return deleted


def addPhoto(data: dict) -> dict | None:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO photos (user_id, album_id, s3_key, thumb_key, filename)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, user_id, album_id, s3_key, thumb_key, filename, created_at;
            """,
            (
                data.get("user_id"),
                data.get("album_id"),
                data.get("s3_key"),
                data.get("thumb_key"),
                data.get("filename"),
            ),
        )
        row = cursor.fetchone()
        conn.commit()
    except Exception:
        conn.rollback()
        row = None
    finally:
        cursor.close()
        conn.close()

    if row is None:
        return None

    created_at = row[6]
    if isinstance(created_at, datetime.datetime):
        created_at = created_at.isoformat()

    return {
        "id": row[0],
        "user_id": row[1],
        "album_id": row[2],
        "s3_key": aws.create_presigned_url(row[3]),
        "thumb_key": aws.create_presigned_url(row[4]),
        "filename": row[5],
        "created_at": created_at,
    }


def deletePhoto(id: str, username: str) -> bool:
    user = getUser(username)
    if not user:
        return False

    try:
        photo_id = int(id)
    except (ValueError, TypeError):
        return False

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Fetch photo details
        cursor.execute(
            """
            SELECT user_id, album_id
            FROM photos
            WHERE id = %s;
            """,
            (photo_id,),
        )
        photo_row = cursor.fetchone()
        if not photo_row:
            return False

        photo_owner_id, album_id = photo_row

        # Fetch album owner
        cursor.execute(
            """
            SELECT user_id
            FROM albums
            WHERE id = %s;
            """,
            (album_id,),
        )
        album_row = cursor.fetchone()
        if not album_row:
            return False

        album_owner_id = album_row[0]

        # Only the photo owner or album owner may delete
        if user["id"] not in (photo_owner_id, album_owner_id):
            return False

        # Perform the delete
        cursor.execute(
            """
            DELETE FROM photos
            WHERE id = %s;
            """,
            (photo_id,),
        )
        # If DELETE affected a row, commit
        if cursor.rowcount == 0:
            conn.rollback()
            return False

        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()


def getAlbums(username: str) -> dict | None:
    user = getUser(username)
    if not user:
        return None

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT id, code, name, user_id, open, public, thumb_key, created_at
            FROM albums
            WHERE user_id = %s
            ORDER BY created_at DESC;
            """,
            (user["id"],),
        )
        rows = cursor.fetchall()
    except Exception:
        rows = []
    finally:
        cursor.close()
        conn.close()

    if not rows:
        return None

    albums = []
    for row in rows:
        created_at = row[7]
        if isinstance(created_at, datetime.datetime):
            created_at = created_at.isoformat()
        albums.append(
            {
                "id": row[0],
                "code": row[1],
                "name": row[2],
                "user_id": row[3],
                "open": bool(row[4]),
                "public": bool(row[5]),
                "thumb_key": aws.create_presigned_url(row[6]) if row[6] else None,
                "created_at": created_at,
            }
        )
    return {"albums": albums}


def createAlbum(username: str, album_name: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id FROM users WHERE username = %s",
            (username,),
        )
        user_row = cursor.fetchone()
        if user_row is None:
            return False
        user_id = user_row[0]

        album_code = uuid.uuid4().hex

        cursor.execute(
            """
            INSERT INTO albums (name, user_id, code)
            VALUES (%s, %s, %s)
            RETURNING id;
            """,
            (album_name, user_id, album_code),
        )
        cursor.fetchone()  # consume the returned id
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()


def getPhoto(id: int) -> dict | None:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT id, user_id, album_id, s3_key, thumb_key, filename, created_at
            FROM photos
            WHERE id = %s;
            """,
            (id,),
        )
        row = cursor.fetchone()
    except Exception:
        row = None
    finally:
        cursor.close()
        conn.close()

    if row is None:
        return None

    created_at = row[6]
    if isinstance(created_at, datetime.datetime):
        created_at = created_at.isoformat()

    return {
        "id": row[0],
        "user_id": row[1],
        "album_id": row[2],
        "s3_key": aws.create_presigned_url(row[3]),
        "thumb_key": aws.create_presigned_url(row[4]),
        "filename": row[5],
        "created_at": created_at,
    }


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

__all__ = ["init_db", "get_connection", "setUser", "getUser", "check_password"]
