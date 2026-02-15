import datetime
import hashlib
import random

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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            modified TIMESTAMP
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


def get_albums(user_id: int) -> list[dict]:
    """Retrieve all albums for a given user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, name, open, public, created_at, code, thumb_key
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
            "code": row[5],
            "thumb_key": row[6],
        }
        for row in rows
    ]


def get_album_by_code(code: str) -> dict | None:
    """Retrieve an album from the database by its unique code. Also return photos in the album. Each photo should include all fields, including the username of the owner."""

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT a.id, a.name, a.open, a.public, a.created_at, a.code, u.username
        FROM albums a
        JOIN users u ON a.user_id = u.id
        WHERE a.code = %s;
        """,
        (code,),
    )
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        return None

    album = {
        "id": row[0],
        "name": row[1],
        "open": row[2],
        "public": row[3],
        "created_at": row[4],
        "code": row[5],
        "username": row[6],
        "photos": [],
    }

    cursor.execute(
        """
        SELECT p.id, p.s3_key, p.thumb_key, p.filename, p.created_at, u.username
        FROM photos p
        JOIN users u ON p.user_id = u.id
        WHERE p.album_id = %s;
        """,
        (album["id"],),
    )
    photo_rows = cursor.fetchall()
    for photo_row in photo_rows:
        album["photos"].append(
            {
                "id": photo_row[0],
                "s3_key": photo_row[1],
                "thumb_key": photo_row[2],
                "filename": photo_row[3],
                "created_at": photo_row[4],
                "username": photo_row[5],
            }
        )
    cursor.close()
    conn.close()
    return album


def delete_album_by_code(code: str) -> bool:
    """Delete an album from the database by its unique code. Return True if the album was deleted, False if it was not found."""

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        DELETE FROM albums
        WHERE code = %s
        RETURNING id;
        """,
        (code,),
    )
    row = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return row is not None


def add_photo(
    user_id: int, album_id: int, s3_key: str, thumb_key: str | None, filename: str
) -> dict:
    """Add a photo to an album and return the photo record."""

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO photos (user_id, album_id, s3_key, thumb_key, filename)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id;
        """,
        (user_id, album_id, s3_key, thumb_key, filename),
    )
    row = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()

    return {
        "id": row[0],
        "user_id": user_id,
        "album_id": album_id,
        "s3_key": s3_key,
        "thumb_key": thumb_key,
        "filename": filename,
    }


def get_photos_by_album_id(album_id: int) -> list[dict]:
    """Retrieve all photos for a given album ID."""

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT p.id, p.s3_key, p.thumb_key, p.filename, p.created_at, u.username
        FROM photos p
        JOIN users u ON p.user_id = u.id
        WHERE p.album_id = %s;
        """,
        (album_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [
        {
            "id": row[0],
            "s3_key": row[1],
            "thumb_key": row[2],
            "filename": row[3],
            "created_at": row[4],
            "username": row[5],
        }
        for row in rows
    ]


def delete_photo_by_id(photo_id: int) -> bool:
    """Delete a photo from the database by its ID. Return True if the photo was deleted, False if it was not found."""

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        DELETE FROM photos
        WHERE id = %s
        RETURNING id;
        """,
        (photo_id,),
    )
    row = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return row is not None


def get_photo(photo_id: int) -> dict | None:
    """Retrieve a photo from the database by its ID."""

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT p.id, p.s3_key, p.thumb_key, p.filename, p.created_at, u.username, p.album_id
        FROM photos p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = %s;
        """,
        (photo_id,),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if row:
        return {
            "id": row[0],
            "s3_key": row[1],
            "thumb_key": row[2],
            "filename": row[3],
            "created_at": row[4],
            "username": row[5],
            "album_id": row[6],
        }
    else:
        return None


def get_album(album_id: int) -> dict | None:
    """Retrieve an album from the database by its ID. Also return photos in the album. Each photo should include all fields, including the username of the owner."""

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT a.id, a.name, a.open, a.public, a.created_at, a.code, u.username
        FROM albums a
        JOIN users u ON a.user_id = u.id
        WHERE a.id = %s;
        """,
        (album_id,),
    )
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        return None

    album = {
        "id": row[0],
        "name": row[1],
        "open": row[2],
        "public": row[3],
        "created_at": row[4],
        "code": row[5],
        "username": row[6],
        "photos": [],
    }
    cursor.close()
    conn.close()
    return album


def checkthumb(album_id: int, thumb_key: str) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT thumb_key FROM albums WHERE id = %s;
        """,
        (album_id,),
    )
    row = cursor.fetchone()
    if row and row[0] is None:
        cursor.execute(
            """
            UPDATE albums SET thumb_key = %s WHERE id = %s;
            """,
            (thumb_key, album_id),
        )
        conn.commit()
    cursor.close()
    conn.close()


def toggleLock(album_id: int, user: str) -> int:
    """
    Toggle the `open` flag of an album.
    """
    # Retrieve album owner and current open state
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT user_id, open FROM albums WHERE id = %s;
        """,
        (album_id,),
    )
    row = cursor.fetchone()

    # Album does not exist
    if row is None:
        cursor.close()
        conn.close()
        return 2

    owner_id, current_open = row

    # Resolve the user id of the caller
    user_record = getUser(user)
    if user_record is None or user_record["id"] != owner_id:
        cursor.close()
        conn.close()
        return 3

    new_open = not current_open
    cursor.execute(
        """
        UPDATE albums SET open = %s WHERE id = %s;
        """,
        (new_open, album_id),
    )
    conn.commit()
    cursor.close()
    conn.close()

    return int(new_open)


def openCheck(user, album_id):
    """
    Check if an album is accessible to a given user.

    Returns 1 if either of the following is true:
        1. The user is the owner of the album.
        2. The album's `open` flag is set to True.
    Otherwise, returns 0.

    Parameters
    ----------
    user : str
        The username of the requester.
    album_id : int | str
        The primary key of the album to check, or the album code string.
    """
    # Determine whether we have an integer id or a string code.
    conn = get_connection()
    cursor = conn.cursor()
    if isinstance(album_id, int):
        cursor.execute(
            """
            SELECT user_id, open FROM albums WHERE id = %s;
            """,
            (album_id,),
        )
    else:
        # Treat as a code string.
        cursor.execute(
            """
            SELECT user_id, open FROM albums WHERE code = %s;
            """,
            (album_id,),
        )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if row is None:
        # Album does not exist – treat as not accessible.
        return 0

    owner_id, is_open = row
    # If the album is already open, grant access.
    if is_open:
        return 1
    # Otherwise, check ownership.
    user_record = getUser(user)
    if user_record is None:
        return 0
    return 1 if user_record["id"] == owner_id else 0


# --------------------------------------------------------------------------- #
# socket helpers
# --------------------------------------------------------------------------- #


def createAlbum(
    username: str, albumname: str, open: bool = True, public: bool = True
) -> dict:
    # 1. Resolve the user ID
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM users WHERE username = %s;",
        (username,),
    )
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        raise ValueError(f"User '{username}' not found")
    user_id = row[0]

    # 2. Generate a unique album code
    code = random.randbytes(16).hex()
    while True:
        cursor.execute(
            "SELECT 1 FROM albums WHERE code = %s;",
            (code,),
        )
        if cursor.fetchone() is None:
            break
        code = random.randbytes(16).hex()

    # 3. Generate the modified timestamp and insert the album record
    modified_ts = datetime.datetime.now(datetime.timezone.utc)

    cursor.execute(
        """
        INSERT INTO albums (user_id, name, open, public, code, modified)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id;
        """,
        (user_id, albumname, open, public, code, modified_ts),
    )
    album_id = cursor.fetchone()[0]
    conn.commit()

    # 4. Clean up and return
    cursor.close()
    conn.close()
    return {
        "action": "createAlbum",
        "id": album_id,
        "name": albumname,
        "open": open,
        "public": public,
        "code": code,
        "modified": modified_ts.isoformat(),
    }


def getAlbums(asker, username):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id FROM users WHERE username = %s;",
        (username,),
    )
    user_row = cursor.fetchone()
    if user_row is None:
        cursor.close()
        conn.close()
        return None
    user_id = user_row[0]

    cursor.execute(
        """
        SELECT id, name, open, public, created_at, code, thumb_key, modified
        FROM albums
        WHERE user_id = %s;
        """,
        (user_id,),
    )
    album_rows = cursor.fetchall()

    albums = []
    for album_row in album_rows:
        if asker != username:
            if not album_row[3]:
                continue

        tum = None
        if album_row[6] is not None:
            tum = aws.create_presigned_url(album_row[6])
        albums.append(
            {
                "id": album_row[0],
                "name": album_row[1],
                "open": album_row[2],
                "public": album_row[3],
                "created_at": album_row[4].isoformat() if album_row[4] else None,
                "code": album_row[5],
                "thumb_key": tum,
            }
        )
    cursor.close()
    conn.close()
    message = {"action": "getAlbums", "payload": albums}
    return message


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

__all__ = ["init_db", "get_connection", "setUser", "getUser", "check_password"]
