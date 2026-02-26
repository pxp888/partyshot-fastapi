import asyncio
import datetime
import hashlib
import logging
import random
import uuid
from contextlib import contextmanager

import arq
import aws
import env
import psycopg2
from arq.connections import RedisSettings
from psycopg2.pool import ThreadedConnectionPool
import json

# --------------------------------------------------------------------------- #
# Database connection helpers
# --------------------------------------------------------------------------- #

_pool = None
_db_pool = None


async def enqueue_delete_key(key: str):
    global _pool
    if _pool is None:
        _pool = await arq.create_pool(RedisSettings(host=env.REDIS_URL2, port=6379))
    await _pool.enqueue_job("delete_s3_object", key)


def init_pool():
    global _db_pool
    if _db_pool is None:
        _db_pool = ThreadedConnectionPool(
            minconn=1,
            maxconn=20,
            host=env.DB_HOST,
            port=env.DB_PORT,
            dbname=env.DB_NAME,
            user=env.DB_USER,
            password=env.DB_PASSWORD,
        )


def close_pool():
    global _db_pool
    if _db_pool is not None:
        _db_pool.closeall()
        _db_pool = None


@contextmanager
def get_db_connection():
    if _db_pool is None:
        init_pool()
    conn = _db_pool.getconn()
    try:
        yield conn
    finally:
        _db_pool.putconn(conn)


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
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
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
                    class TEXT DEFAULT 'free',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    stripe_customer_id TEXT
                );

                CREATE TABLE IF NOT EXISTS albums (
                    id SERIAL PRIMARY KEY,
                    code TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    open BOOLEAN DEFAULT TRUE,
                    public BOOLEAN DEFAULT TRUE,
                    private BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS photos (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
                    s3_key TEXT,
                    thumb_key TEXT,
                    mid_key TEXT,
                    filename TEXT NOT NULL,
                    size INTEGER,
                    thumb_size INTEGER,
                    mid_size INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS subscription (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, album_id)
                );

                CREATE TABLE IF NOT EXISTS stripe1 (
                    id SERIAL PRIMARY KEY,
                    customer_id TEXT,
                    plan TEXT,
                    event_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS stripedump (
                    id SERIAL PRIMARY KEY,
                    customer_id TEXT,
                    event_id TEXT UNIQUE,
                    data JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- Add columns if they don't exist (primitive migration)
                ALTER TABLE photos ADD COLUMN IF NOT EXISTS size INTEGER;
                ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumb_size INTEGER;
                ALTER TABLE photos ADD COLUMN IF NOT EXISTS mid_key TEXT;
                ALTER TABLE photos ADD COLUMN IF NOT EXISTS mid_size INTEGER;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS class TEXT DEFAULT 'free';
                ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
                ALTER TABLE albums ADD COLUMN IF NOT EXISTS private BOOLEAN DEFAULT FALSE;
                UPDATE users SET class = 'free' WHERE class IS NULL;
                """
            )
            conn.commit()

    logging.info("Database schema initialized.")

    # create admin user if it doesn't exist
    if getUser(env.ADMIN_USERNAME) is None:
        setUser(env.ADMIN_USERNAME, env.ADMIN_EMAIL, env.ADMIN_PASSWORD, "admin")
    setUserData(env.ADMIN_USERNAME, user_class="admin")


# --------------------------------------------------------------------------- #
# User CRUD helpers
# --------------------------------------------------------------------------- #


def setUser(username: str, email: str, password: str, user_class: str = "free") -> None:
    """Insert a new user into the database."""
    salt = random.randbytes(16).hex()
    passhash = hashlib.sha256((password + salt).encode()).hexdigest()

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (username, email, passhash, salt, class)
                VALUES (%s, %s, %s, %s, %s);
                """,
                (username, email, passhash, salt, user_class),
            )
            conn.commit()


def getUser(username: str) -> dict | None:
    """Retrieve a user from the database by username."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, username, email, passhash, salt, created_at, class
                FROM users
                WHERE username = %s;
                """,
                (username,),
            )
            row = cursor.fetchone()

    if row:
        return {
            "id": row[0],
            "username": row[1],
            "email": row[2],
            "passhash": row[3],
            "salt": row[4],
            "created_at": row[5],
            "class": row[6],
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


def getAlbum(code: str) -> dict | None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT a.id, a.code, a.name, a.user_id, a.open, a.public, a.private, a.created_at, u.username,
                       (SELECT thumb_key FROM photos WHERE album_id = a.id AND thumb_key IS NOT NULL ORDER BY created_at ASC LIMIT 1)
                FROM albums a
                JOIN users u ON a.user_id = u.id
                WHERE a.code = %s;
                """,
                (code,),
            )
            row = cursor.fetchone()

    if row:
        return {
            "id": row[0],
            "code": row[1],
            "name": row[2],
            "user_id": row[3],
            "open": bool(row[4]),
            "public": bool(row[5]),
            "private": bool(row[6]),
            "thumb_key": aws.get_cloudfront_url(row[9]) if row[9] else None,
            "created_at": row[7].isoformat() if isinstance(row[7], datetime.datetime) else row[7],
            "username": row[8],
        }
    return None


def getAlbumWithSub(code: str, authuser: str) -> dict | None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT a.id, a.code, a.name, a.user_id, a.open, a.public, a.private, a.created_at, u.username,
                       (SELECT thumb_key FROM photos WHERE album_id = a.id AND thumb_key IS NOT NULL ORDER BY created_at ASC LIMIT 1),
                       EXISTS(
                           SELECT 1 FROM subscription s
                           JOIN users su ON s.user_id = su.id
                           WHERE s.album_id = a.id AND su.username = %s
                       )
                FROM albums a
                JOIN users u ON a.user_id = u.id
                WHERE a.code = %s;
                """,
                (authuser, code),
            )
            row = cursor.fetchone()

    if row[6]:
        if authuser != row[8]:
            return None 

    if row:
        return {
            "id": row[0],
            "code": row[1],
            "name": row[2],
            "user_id": row[3],
            "open": bool(row[4]),
            "public": bool(row[5]),
            "private": bool(row[6]),
            "thumb_key": aws.get_cloudfront_url(row[9]) if row[9] else None,
            "created_at": row[7].isoformat() if isinstance(row[7], datetime.datetime) else row[7],
            "username": row[8],
            "subscribed": bool(row[10]),
        }
    return None


def getPhotos(
    album_code: str,
    limit: int = 100,
    offset: int = 0,
    sort_field: str = "created_at",
    sort_order: str = "desc",
) -> dict | None:
    album = getAlbum(album_code)
    if album is None:
        return None
    album_id = album["id"]

    # Whitelist sort fields/orders to prevent SQL injection
    allowed_fields = {
        "created_at": "p.created_at",
        "filename": "p.filename",
        "username": "u.username",
        "size": "p.size",
    }
    field = allowed_fields.get(sort_field, "p.created_at")
    order = "ASC" if sort_order.lower() == "asc" else "DESC"

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            # We also want to know the total count for pagination
            cursor.execute(
                "SELECT COUNT(*) FROM photos WHERE album_id = %s", (album_id,)
            )
            total_count = cursor.fetchone()[0]

            query = f"""
                SELECT p.id, p.user_id, p.album_id, p.s3_key, p.thumb_key, p.mid_key, p.filename,
                       p.created_at, u.username, p.size, p.thumb_size, p.mid_size
                FROM photos p
                JOIN users u ON p.user_id = u.id
                WHERE p.album_id = %s
                ORDER BY {field} {order}, p.id ASC
                LIMIT %s OFFSET %s;
            """
            cursor.execute(query, (album_id, limit, offset))
            rows = cursor.fetchall()

    photos = []
    for row in rows:
        created_at = row[7]
        if isinstance(created_at, datetime.datetime):
            created_at = created_at.isoformat()
        photos.append(
            {
                "id": row[0],
                "user_id": row[1],
                "album_id": row[2],
                "s3_key": row[3],
                "thumb_key": row[4],
                "mid_key": row[5],
                "filename": row[6],
                "created_at": created_at,
                "username": row[8],
                "size": row[9],
                "thumb_size": row[10],
                "mid_size": row[11],
            }
        )
    return {
        "photos": photos,
        "total": total_count,
        "limit": limit,
        "offset": offset,
    }


async def deleteAlbum(username: str, code: str) -> str:
    user = getUser(username)
    if not user:
        return "user_not_found"

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # 2. Get album id
                cursor.execute(
                    """
                    SELECT id FROM albums
                    WHERE code = %s AND user_id = %s
                    """,
                    (code, user["id"]),
                )
                album_row = cursor.fetchone()
                if album_row is None:
                    return "album_not_found"
                album_id = album_row[0]

                # 3. Get all photos for the album
                cursor.execute(
                    """
                    SELECT s3_key, thumb_key, mid_key FROM photos
                    WHERE album_id = %s
                    """,
                    (album_id,),
                )
                photo_rows = cursor.fetchall()

                # 4. Enqueue S3 deletions
                for s3_key, thumb_key, mid_key in photo_rows:
                    if s3_key:
                        await enqueue_delete_key(s3_key)
                    if thumb_key:
                        await enqueue_delete_key(thumb_key)
                    if mid_key:
                        await enqueue_delete_key(mid_key)

                # 5. Delete photo records
                cursor.execute(
                    """
                    DELETE FROM photos
                    WHERE album_id = %s
                    """,
                    (album_id,),
                )

                # 6. Delete the album record itself
                cursor.execute(
                    """
                    DELETE FROM albums
                    WHERE id = %s
                    """,
                    (album_id,),
                )

                conn.commit()
                return "ok"
            except Exception as e:
                conn.rollback()
                logging.error("Error deleting album: %s", e)
                return str(e)


def addPhoto(data: dict) -> dict | None:
    s3_key = data.get("s3_key")
    thumb_key = data.get("thumb_key")

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute(
                    """
                    INSERT INTO photos (user_id, album_id, s3_key, thumb_key, mid_key, filename, size, thumb_size, mid_size)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, user_id, album_id, s3_key, thumb_key, mid_key, filename, created_at, size, thumb_size, mid_size;
                    """,
                    (
                        data.get("user_id"),
                        data.get("album_id"),
                        s3_key,
                        thumb_key,
                        data.get("mid_key"),
                        data.get("filename"),
                        data.get("size"),
                        data.get("thumb_size"),
                        data.get("mid_size"),
                    ),
                )
                row = cursor.fetchone()
                # If we got a row, fetch the username for the user_id we just inserted.
                if row:
                    cursor.execute(
                        """
                        SELECT username
                        FROM users
                        WHERE id = %s;
                        """,
                        (row[1],),  # row[1] is user_id
                    )
                    user_row = cursor.fetchone()
                    username = user_row[0] if user_row else None
                else:
                    username = None
                conn.commit()
            except Exception:
                conn.rollback()
                row = None
                username = None

    if row is None:
        return None

    created_at = row[7]
    if isinstance(created_at, datetime.datetime):
        created_at = created_at.isoformat()

    return {
        "id": row[0],
        "user_id": row[1],
        "album_id": row[2],
        "s3_key": aws.get_cloudfront_url(row[3]),
        "thumb_key": aws.get_cloudfront_url(row[4]),
        "mid_key": aws.get_cloudfront_url(row[5]),
        "filename": row[6],
        "created_at": created_at,
        "size": row[8],
        "thumb_size": row[9],
        "mid_size": row[10],
        "username": username,
    }


async def deletePhoto(id: str, username: str) -> bool:
    user = getUser(username)
    if not user:
        return False

    try:
        photo_id = int(id)
    except (ValueError, TypeError):
        return False

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Fetch photo details including S3 keys
                cursor.execute(
                    """
                    SELECT user_id, album_id, s3_key, thumb_key, mid_key
                    FROM photos
                    WHERE id = %s;
                    """,
                    (photo_id,),
                )
                photo_row = cursor.fetchone()
                if not photo_row:
                    return False

                photo_owner_id, album_id, s3_key, thumb_key, mid_key = photo_row

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

                # Enqueue S3 deletions if they exist
                if s3_key:
                    await enqueue_delete_key(s3_key)
                if thumb_key:
                    await enqueue_delete_key(thumb_key)
                if mid_key:
                    await enqueue_delete_key(mid_key)

                # Perform the delete from DB
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


def getAlbums(username: str, authuser: str) -> dict | None:
    user = getUser(username)
    if not user:
        return None

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Include owned and subscribed albums (owned by the user whose profile is being viewed)
                cursor.execute(
                    """
                    SELECT DISTINCT a.id, a.code, a.name, a.user_id, a.open, a.public, a.private, a.created_at, u.username,
                           (SELECT thumb_key FROM photos WHERE album_id = a.id AND thumb_key IS NOT NULL ORDER BY created_at ASC LIMIT 1)
                    FROM albums a
                    JOIN users u ON a.user_id = u.id
                    LEFT JOIN subscription s ON a.id = s.album_id
                    WHERE a.user_id = %s OR s.user_id = %s
                    ORDER BY a.created_at DESC;
                    """,
                    (user["id"], user["id"]),
                )
                rows = cursor.fetchall()
            except Exception as e:
                logging.error("Error fetching albums: %s", e)
                rows = []

    if not rows:
        return None

    albums = []
    for row in rows:
        # Check permissions: if not admin or owner, only show public albums
        # If private, only show if owner
        is_owner = authuser == username
        is_public = bool(row[5])
        is_private = bool(row[6])

        if not is_owner:
            if is_private or not is_public:
                continue

        created_at = row[7]
        if isinstance(created_at, datetime.datetime):
            created_at = created_at.isoformat()

        thumb_key = row[9]

        albums.append(
            {
                "id": row[0],
                "code": row[1],
                "name": row[2],
                "username": row[8],
                "open": bool(row[4]),
                "public": is_public,
                "private": is_private,
                "thumb_key": aws.get_cloudfront_url(thumb_key) if thumb_key else None,
                "created_at": created_at,
            }
        )
    return {"albums": albums}


def createAlbum(username: str, album_name: str) -> str | None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute(
                    "SELECT id FROM users WHERE username = %s",
                    (username,),
                )
                user_row = cursor.fetchone()
                if user_row is None:
                    return None
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
                return album_code
            except Exception:
                conn.rollback()
                return None


def subscribe(username: str, albumcode: str) -> bool:
    user = getUser(username)
    album = getAlbum(albumcode)
    if not user or not album:
        return False

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute(
                    """
                    INSERT INTO subscription (user_id, album_id)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id, album_id) DO NOTHING;
                    """,
                    (user["id"], album["id"]),
                )
                conn.commit()
                return True
            except Exception as e:
                logging.error(
                    "Error subscribing user %s to album %s: %s", username, albumcode, e
                )
                conn.rollback()
                return False


def unsubscribe(username: str, albumcode: str) -> bool:
    user = getUser(username)
    album = getAlbum(albumcode)
    if not user or not album:
        return False

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute(
                    """
                    DELETE FROM subscription
                    WHERE user_id = %s AND album_id = %s;
                    """,
                    (user["id"], album["id"]),
                )
                conn.commit()
                return True
            except Exception as e:
                logging.error(
                    "Error unsubscribing user %s from album %s: %s",
                    username,
                    albumcode,
                    e,
                )
                conn.rollback()
                return False


def toggleOpen(id: str, username: str) -> dict | None:
    user = getUser(username)
    if user is None:
        return None

    try:
        album_id = int(id)
    except (ValueError, TypeError):
        return None

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Grab the album's current state and ownership.
                cursor.execute(
                    """
                    SELECT user_id, code, open
                    FROM albums
                    WHERE id = %s;
                    """,
                    (album_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    return None

                album_owner_id, album_code, current_open = row

                # Ensure the requesting user owns the album.
                if user["id"] != album_owner_id:
                    return None

                # Toggle the `open` flag.
                new_open = not current_open
                cursor.execute(
                    """
                    UPDATE albums
                    SET open = %s
                    WHERE id = %s
                    RETURNING id, code, open;
                    """,
                    (new_open, album_id),
                )
                updated_row = cursor.fetchone()
                if updated_row is None:
                    conn.rollback()
                    return None

                conn.commit()

                return getAlbum(album_code)

            except Exception:
                conn.rollback()
                return None


def togglePublic(id: str, username: str) -> dict | None:
    user = getUser(username)
    if user is None:
        return None

    try:
        album_id = int(id)
    except (ValueError, TypeError):
        return None

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Grab the album's current state and ownership.
                cursor.execute(
                    """
                    SELECT user_id, code, public
                    FROM albums
                    WHERE id = %s;
                    """,
                    (album_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    return None

                album_owner_id, album_code, current_public = row

                # Ensure the requesting user owns the album.
                if user["id"] != album_owner_id:
                    return None

                # Toggle the `public` flag.
                new_public = not current_public
                cursor.execute(
                    """
                    UPDATE albums
                    SET public = %s
                    WHERE id = %s
                    RETURNING id, code, public;
                    """,
                    (new_public, album_id),
                )
                updated_row = cursor.fetchone()
                if updated_row is None:
                    conn.rollback()
                    return None

                conn.commit()

                return getAlbum(album_code)

            except Exception:
                conn.rollback()
                return None


def togglePrivate(id: str, username: str) -> dict | None:
    user = getUser(username)
    if user is None:
        return None

    try:
        album_id = int(id)
    except (ValueError, TypeError):
        return None

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Grab the album's current state and ownership.
                cursor.execute(
                    """
                    SELECT user_id, code, private
                    FROM albums
                    WHERE id = %s;
                    """,
                    (album_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    return None

                album_owner_id, album_code, current_private = row

                # Ensure the requesting user owns the album.
                if user["id"] != album_owner_id:
                    return None

                # Toggle the `private` flag.
                new_private = not current_private
                cursor.execute(
                    """
                    UPDATE albums
                    SET private = %s
                    WHERE id = %s
                    RETURNING id, code, private;
                    """,
                    (new_private, album_id),
                )
                updated_row = cursor.fetchone()
                if updated_row is None:
                    conn.rollback()
                    return None

                conn.commit()

                return getAlbum(album_code)

            except Exception:
                conn.rollback()
                return None


def search(term: str) -> str:
    # 1. Check for a matching username.
    user = getUser(term)
    if user:
        return f"/user/{user['username']}"

    # 2. Check for a matching album code.
    album = getAlbum(term)
    if album:
        return f"/album/{album['code']}"

    # 3. Nothing matched.
    return ""


def setAlbumName(albumcode: str, albumname: str, username: str) -> bool:
    user = getUser(username)
    if user is None:
        return False

    album = getAlbum(albumcode)
    if album is None:
        return False

    if album["user_id"] != user["id"]:
        return False

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute(
                    """
                    UPDATE albums
                    SET name = %s
                    WHERE code = %s
                    RETURNING id;
                    """,
                    (albumname, albumcode),
                )
                row = cursor.fetchone()
                if row is None:
                    return False

                conn.commit()
                return True
            except Exception:
                conn.rollback()
                return False


def setUserData(
    username: str,
    newusername: str = None,
    email: str = None,
    password: str = None,
    user_class: str = None,
) -> str:
    """Update user information (username, email, password, or class) conditionally."""
    user = getUser(username)
    if not user:
        return "error"

    update_fields = []
    params = []

    # Helper to check if a value is valid for update (not None and length >= 3)
    def is_valid(val):
        return val is not None and len(str(val)) >= 3

    # Check newusername
    if is_valid(newusername) and newusername != user["username"]:
        # Check if new username is already taken
        if getUser(newusername) is not None:
            return "username taken"
        update_fields.append("username = %s")
        params.append(newusername)

    # Check email
    if is_valid(email) and email != user["email"]:
        update_fields.append("email = %s")
        params.append(email)

    # Check password
    if is_valid(password):
        salt = random.randbytes(16).hex()
        passhash = hashlib.sha256((password + salt).encode()).hexdigest()
        update_fields.append("passhash = %s")
        params.append(passhash)
        update_fields.append("salt = %s")
        params.append(salt)

    # Check class
    if user_class is not None and user_class != user["class"]:
        update_fields.append("class = %s")
        params.append(user_class)

    if not update_fields:
        return "no changes"  # Nothing to update, but not an error

    params.append(user["id"])
    query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute(query, tuple(params))
                conn.commit()
                return "success"
            except Exception as e:
                logging.error("Error updating user data: %s", e)
                conn.rollback()
                return "error"


def getEmail(username: str) -> str:

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute(
                    "SELECT email FROM users WHERE username = %s", (username,)
                )
                row = cursor.fetchone()
                if row is None:
                    return None
                return row[0]
            except Exception:
                return None


def getUsage(username: str) -> dict | None:
    """
    Returns a dictionary with usage statistics for the given user.
    """
    user = getUser(username)
    if not user:
        return None
    user_id = user["id"]

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            # number of photos
            cursor.execute("SELECT COUNT(*) FROM photos WHERE user_id = %s", (user_id,))
            num_photos = cursor.fetchone()[0]

            # number of albums
            cursor.execute("SELECT COUNT(*) FROM albums WHERE user_id = %s", (user_id,))
            num_albums = cursor.fetchone()[0]

            # number of other peoples photos in users albums
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM photos p
                JOIN albums a ON p.album_id = a.id
                WHERE a.user_id = %s AND p.user_id != %s
                """,
                (user_id, user_id),
            )
            num_other_photos = cursor.fetchone()[0]

            # total size of photos
            cursor.execute(
                "SELECT SUM(COALESCE(size, 0) + COALESCE(thumb_size, 0)) FROM photos WHERE user_id = %s",
                (user_id,),
            )
            total_size_photos = cursor.fetchone()[0] or 0

            # total size in user albums
            cursor.execute(
                """
                SELECT SUM(COALESCE(p.size, 0) + COALESCE(p.thumb_size, 0))
                FROM photos p
                JOIN albums a ON p.album_id = a.id
                WHERE a.user_id = %s
                """,
                (user_id,),
            )
            total_size_albums = cursor.fetchone()[0] or 0

            return {
                "number of photos": num_photos,
                "number of albums": num_albums,
                "number of other peoples photos in users albums": num_other_photos,
                "total size of photos": int(total_size_photos),
                "total size in user albums": int(total_size_albums),
            }


# --------------------------------------------------------------------------- #
# Admin functions
# --------------------------------------------------------------------------- #


def cleanup() -> None:
    """
    Synchronise the S3 bucket with the database.

    The function performs the following steps:

    1. Retrieve all :pycode:`s3_key` and :pycode:`thumb_key` values stored in
       the :pycode:`photos` table.
    2. Enumerate every object currently present in the S3 bucket.
    3. For any object that does **not** appear in the set of database keys,
       the object is deleted from S3.

    This operation is useful during maintenance or after a bulk delete of
    database records that may leave orphaned objects in S3.
    """

    # --- Step 1: Collect all known keys from the database -----------------
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT s3_key, thumb_key, mid_key FROM photos")
            rows = cursor.fetchall()

    known_keys: set[str] = set()
    for s3_key, thumb_key, mid_key in rows:
        if s3_key:
            known_keys.add(s3_key)
        if thumb_key:
            known_keys.add(thumb_key)
        if mid_key:
            known_keys.add(mid_key)

    # --- Step 2: List objects in the S3 bucket ----------------------------

    pagenum = 0
    s3 = aws.get_s3_client()
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=aws.BUCKET_NAME):
        logging.info("considering page : %s", pagenum)
        pagenum += 1
        for obj in page.get("Contents", []):
            key = obj["Key"]
            # --- Step 3: Delete orphaned objects ----------------------------
            if key not in known_keys:
                try:
                    aws.delete_file_from_s3(key)
                    logging.info("[cleanup] Deleted orphaned object: %s", key)
                except Exception as exc:  # pragma: no cover - S3 side effect
                    logging.error("[cleanup] Failed to delete %s – %r", key, exc)

    logging.info("completed")


async def cleanup2(ctx=None) -> None:
    """
    Synchronise the S3 bucket with the database.

    The function performs the following steps:

    1. Retrieve all :pycode:`s3_key` and :pycode:`thumb_key` values stored in
       the :pycode:`photos` table.
    2. Enumerate every object currently present in the S3 bucket.
    3. For any object that does **not** appear in the set of database keys,
       the object is deleted from S3.

    This operation is useful during maintenance or after a bulk delete of
    database records that may leave orphaned objects in S3.
    """

    # --- Step 1: Collect all known keys from the database -----------------
    def get_known_keys():
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT s3_key, thumb_key, mid_key FROM photos")
                rows = cursor.fetchall()

        keys: set[str] = set()
        for s3_key, thumb_key, mid_key in rows:
            if s3_key:
                keys.add(s3_key)
            if thumb_key:
                keys.add(thumb_key)
            if mid_key:
                keys.add(mid_key)
        return keys

    known_keys = await asyncio.to_thread(get_known_keys)

    # --- Step 2: List objects in the S3 bucket ----------------------------
    s3 = await asyncio.to_thread(aws.get_s3_client)
    delete_buffer = []
    continuation_token = None

    while True:
        # Fetch one page of objects
        def list_objects():
            params = {"Bucket": aws.BUCKET_NAME}
            if continuation_token:
                params["ContinuationToken"] = continuation_token
            return s3.list_objects_v2(**params)

        page = await asyncio.to_thread(list_objects)

        for obj in page.get("Contents", []):
            key = obj["Key"]

            if key not in known_keys:
                delete_buffer.append({"Key": key})

            # Once we hit 1,000 keys, perform a bulk delete
            if len(delete_buffer) >= 1000:
                logging.info("Deleting batch of %s objects...", len(delete_buffer))
                await asyncio.to_thread(
                    s3.delete_objects,
                    Bucket=aws.BUCKET_NAME,
                    Delete={"Objects": delete_buffer},
                )
                delete_buffer = []  # Reset the buffer

        if not page.get("IsTruncated"):
            break

        continuation_token = page.get("NextContinuationToken")
        # Yield control between pages to remain responsive
        await asyncio.sleep(0.1)

    # Clean up any remaining keys in the buffer
    if delete_buffer:
        logging.info("Deleting final batch of %s objects...", len(delete_buffer))
        await asyncio.to_thread(
            s3.delete_objects, Bucket=aws.BUCKET_NAME, Delete={"Objects": delete_buffer}
        )

    logging.info("Cleanup completed.")


def spaceUsed() -> dict:
    result = {
        "total": 0,
        "thumbs": 0,
        "no_size_count": 0,
        "total_files": 0,
        "total_albums": 0,
        "total_users": 0,
    }
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT SUM(size) FROM photos")
            result["total"] = cursor.fetchone()[0] or 0
            cursor.execute("SELECT SUM(thumb_size) FROM photos")
            result["thumbs"] = cursor.fetchone()[0] or 0
            cursor.execute("SELECT SUM(mid_size) FROM photos")
            result["mids"] = cursor.fetchone()[0] or 0
            cursor.execute("SELECT COUNT(*) FROM photos WHERE size IS NULL")
            result["no_size_count"] = cursor.fetchone()[0] or 0
            cursor.execute("SELECT COUNT(*) FROM photos")
            result["total_files"] = cursor.fetchone()[0] or 0
            cursor.execute("SELECT COUNT(*) FROM albums")
            result["total_albums"] = cursor.fetchone()[0] or 0
            cursor.execute("SELECT COUNT(*) FROM users")
            result["total_users"] = cursor.fetchone()[0] or 0
    return result


def updatePhotoSizes(
    photo_id: int, size: int, thumb_size: int = None, mid_size: int = None
):
    # Update the photo sizes in the database - this is called by the worker
    updates = ["size = %s"]
    params = [size]

    if thumb_size is not None:
        updates.append("thumb_size = %s")
        params.append(thumb_size)
    if mid_size is not None:
        updates.append("mid_size = %s")
        params.append(mid_size)

    params.append(photo_id)
    query = f"UPDATE photos SET {', '.join(updates)} WHERE id = %s"

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute(query, tuple(params))
                conn.commit()
            except Exception as e:
                conn.rollback()
                logging.error("Error updating photo sizes for %s: %s", photo_id, e)


def uncountedPhotos() -> list:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, s3_key, thumb_key, mid_key FROM photos WHERE size IS NULL"
            )
            return cursor.fetchall()


# --------------------------------------------------------------------------- #
# Stripe helpers
# --------------------------------------------------------------------------- #


def getStripeCustomerId(username: str) -> str | None:
    """Retrieve the Stripe customer ID for a given username."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute(
                    "SELECT stripe_customer_id FROM users WHERE username = %s",
                    (username,),
                )
                row = cursor.fetchone()
                return row[0] if row else None
            except Exception as e:
                logging.error("Error getting stripe customer id for %s: %s", username, e)
                return None


def updateUserStripeCustomerId(username: str, customer_id: str) -> None:
    """Update the Stripe customer ID for a given username."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute(
                    """
                    UPDATE users
                    SET stripe_customer_id = %s
                    WHERE username = %s;
                    """,
                    (customer_id, username),
                )
                conn.commit()
            except Exception as e:
                logging.error(
                    "Error updating stripe customer id for %s: %s", username, e
                )
                conn.rollback()


def updateUserPlan(customer_id: str, plan: str, event_id: str = None) -> None:
    """Update the user's plan (class) based on their Stripe customer ID and log the event."""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                # Update users table (the 'class' column represents the plan level)
                cursor.execute(
                    """
                    UPDATE users
                    SET class = %s
                    WHERE stripe_customer_id = %s;
                    """,
                    (plan, customer_id),
                )

                # Log to stripe1 table for transaction/plan history
                cursor.execute(
                    """
                    INSERT INTO stripe1 (customer_id, plan, event_id)
                    VALUES (%s, %s, %s);
                    """,
                    (customer_id, plan, event_id),
                )
                conn.commit()
            except Exception as e:
                logging.error("Error updating plan for customer %s: %s", customer_id, e)
                conn.rollback()


def dumpStripeEvent(event_id: str, event: dict) -> None:
    """Store the raw Stripe event data in the stripedump table."""
    customer_id = event.get("data", {}).get("object", {}).get("customer")
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute(
                    """
                    INSERT INTO stripedump (event_id, customer_id, data)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (event_id) DO NOTHING;
                    """,
                    (event_id, customer_id, json.dumps(event)),
                )
                conn.commit()
            except Exception as e:
                logging.error("Error dumping stripe event %s: %s", event_id, e)
                conn.rollback()









