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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS photos (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE,
            s3_key TEXT,
            thumb_key TEXT,
            filename TEXT NOT NULL,
            size INTEGER,
            thumb_size INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        -- Add columns if they don't exist (primitive migration)
        ALTER TABLE photos ADD COLUMN IF NOT EXISTS size INTEGER;
        ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumb_size INTEGER;
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
        SELECT a.id, a.code, a.name, a.user_id, a.open, a.public, a.created_at, u.username,
               (SELECT thumb_key FROM photos WHERE album_id = a.id AND thumb_key IS NOT NULL ORDER BY created_at ASC LIMIT 1)
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
        created_at = row[6]
        if isinstance(created_at, datetime.datetime):
            created_at = created_at.isoformat()
        thumb_key = row[8]
        return {
            "id": row[0],
            "code": row[1],
            "name": row[2],
            "user_id": row[3],
            "open": bool(row[4]),
            "public": bool(row[5]),
            "thumb_key": aws.create_presigned_url(thumb_key) if thumb_key else None,
            "created_at": created_at,
            "username": row[7],
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
        SELECT p.id, p.user_id, p.album_id, p.s3_key, p.thumb_key, p.filename,
               p.created_at, u.username
        FROM photos p
        JOIN users u ON p.user_id = u.id
        WHERE p.album_id = %s
        ORDER BY p.created_at ASC;
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
                "username": row[7],  # <-- added field
            }
        )
    return {"photos": photos}


def deleteAlbum(username: str, code: str) -> bool:
    user = getUser(username)
    if not user:
        return False

    conn = get_connection()
    cursor = conn.cursor()
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
            return False
        album_id = album_row[0]

        # 3. Get all photos for the album
        cursor.execute(
            """
            SELECT s3_key, thumb_key FROM photos
            WHERE album_id = %s
            """,
            (album_id,),
        )
        photo_rows = cursor.fetchall()

        # 4. Delete S3 objects for each photo
        for s3_key, thumb_key in photo_rows:
            if s3_key:
                aws.delete_file_from_s3(s3_key)
            if thumb_key:
                aws.delete_file_from_s3(thumb_key)

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
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error deleting album: {e}")
        return False
    finally:
        cursor.close()
        conn.close()


def addPhoto(data: dict) -> dict | None:
    s3_key = data.get("s3_key")
    thumb_key = data.get("thumb_key")
    size = aws.s3size(s3_key)
    thumb_size = aws.s3size(thumb_key)

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO photos (user_id, album_id, s3_key, thumb_key, filename, size, thumb_size)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, album_id, s3_key, thumb_key, filename, created_at, size, thumb_size;
            """,
            (
                data.get("user_id"),
                data.get("album_id"),
                s3_key,
                thumb_key,
                data.get("filename"),
                size,
                thumb_size,
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
        "size": row[7],
        "thumb_size": row[8],
        "username": username,  # <-- added field
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
        # Fetch photo details including S3 keys
        cursor.execute(
            """
            SELECT user_id, album_id, s3_key, thumb_key
            FROM photos
            WHERE id = %s;
            """,
            (photo_id,),
        )
        photo_row = cursor.fetchone()
        if not photo_row:
            return False

        photo_owner_id, album_id, s3_key, thumb_key = photo_row

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

        # Delete S3 objects if they exist
        if s3_key:
            aws.delete_file_from_s3(s3_key)
        if thumb_key:
            aws.delete_file_from_s3(thumb_key)

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
    finally:
        cursor.close()
        conn.close()


def getAlbums(username: str, authuser: str) -> dict | None:
    user = getUser(username)
    if not user:
        return None

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT a.id, a.code, a.name, a.user_id, a.open, a.public, a.created_at, u.username,
                   (SELECT thumb_key FROM photos WHERE album_id = a.id AND thumb_key IS NOT NULL ORDER BY created_at ASC LIMIT 1)
            FROM albums a
            JOIN users u ON a.user_id = u.id
            WHERE a.user_id = %s
            ORDER BY a.created_at DESC;
            """,
            (user["id"],),
        )
        rows = cursor.fetchall()
    except Exception as e:
        print(f"Error fetching albums: {e}")
        rows = []
    finally:
        cursor.close()
        conn.close()

    if not rows:
        return None

    albums = []
    for row in rows:
        # Check permissions: if not admin or owner, only show public albums
        if authuser != username and not row[5]:
            continue

        created_at = row[6]
        if isinstance(created_at, datetime.datetime):
            created_at = created_at.isoformat()

        thumb_key = row[8]

        albums.append(
            {
                "id": row[0],
                "code": row[1],
                "name": row[2],
                "username": row[7],
                "open": bool(row[4]),
                "public": bool(row[5]),
                "thumb_key": aws.create_presigned_url(thumb_key) if thumb_key else None,
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
            SELECT p.id, p.user_id, p.album_id, p.s3_key, p.thumb_key,
                   p.filename, p.created_at, u.username
            FROM photos p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = %s;
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
        "username": row[7],  # <-- added field
    }


def toggleOpen(id: str, username: str) -> dict | None:
    user = getUser(username)
    if user is None:
        return None

    try:
        album_id = int(id)
    except (ValueError, TypeError):
        return None

    conn = get_connection()
    cursor = conn.cursor()
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

        return getAlbum_code(album_code)

    except Exception:
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()


def togglePublic(id: str, username: str) -> dict | None:
    user = getUser(username)
    if user is None:
        return None

    try:
        album_id = int(id)
    except (ValueError, TypeError):
        return None

    conn = get_connection()
    cursor = conn.cursor()
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

        return getAlbum_code(album_code)

    except Exception:
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()


def search(term: str) -> str:
    # 1. Check for a matching username.
    user = getUser(term)
    if user:
        return f"/user/{user['username']}"

    # 2. Check for a matching album code.
    album = getAlbum_code(term)
    if album:
        return f"/album/{album['code']}"

    # 3. Nothing matched.
    return ""


def setAlbumName(albumcode: str, albumname: str, username: str) -> bool:
    user = getUser(username)
    if user is None:
        return False
    
    album = getAlbum_code(albumcode)
    if album is None:
        return False
    
    if album["user_id"] != user["id"]:
        return False

    conn = get_connection()
    cursor = conn.cursor()
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
    finally:
        cursor.close()
        conn.close()


def setUserData(username: str, newusername: str = None, email: str = None, password: str = None) -> str:
    """Update user information (username, email, or password) conditionally."""
    user = getUser(username)
    if not user:
        return False

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

    if not update_fields:
        return "no changes"  # Nothing to update, but not an error

    params.append(user["id"])
    query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(query, tuple(params))
        conn.commit()
        return "success"
    except Exception as e:
        print(f"Error updating user data: {e}")
        conn.rollback()
        return "error"
    finally:
        cursor.close()
        conn.close()


def getEmail(username: str) -> str:

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT email FROM users WHERE username = %s", (username,))
        row = cursor.fetchone()
        if row is None:
            return None
        return row[0]
    except Exception:
        return None
    finally:
        cursor.close()
        conn.close()    


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
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT s3_key, thumb_key FROM photos")
        rows = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    known_keys: set[str] = set()
    for s3_key, thumb_key in rows:
        if s3_key:
            known_keys.add(s3_key)
        if thumb_key:
            known_keys.add(thumb_key)

    # --- Step 2: List objects in the S3 bucket ----------------------------

    pagenum = 0
    s3 = aws.get_s3_client()
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=aws.BUCKET_NAME):
        print("considering page : ", pagenum)
        pagenum += 1
        for obj in page.get("Contents", []):
            key = obj["Key"]
            # --- Step 3: Delete orphaned objects ----------------------------
            if key not in known_keys:
                try:
                    aws.delete_file_from_s3(key)
                    print(f"[cleanup] Deleted orphaned object: {key}")
                except Exception as exc:  # pragma: no cover - S3 side effect
                    print(f"[cleanup] Failed to delete {key} – {exc!r}")

    print("completed")


def cleanup2() -> None:
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
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT s3_key, thumb_key FROM photos")
        rows = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    known_keys: set[str] = set()
    for s3_key, thumb_key in rows:
        if s3_key:
            known_keys.add(s3_key)
        if thumb_key:
            known_keys.add(thumb_key)

    # --- Step 2: List objects in the S3 bucket ----------------------------

    s3 = aws.get_s3_client()
    paginator = s3.get_paginator("list_objects_v2")

    delete_buffer = []

    for page in paginator.paginate(Bucket=aws.BUCKET_NAME):
        for obj in page.get("Contents", []):
            key = obj["Key"]

            if key not in known_keys:
                delete_buffer.append({"Key": key})

            # Once we hit 1,000 keys, perform a bulk delete
            if len(delete_buffer) >= 1000:
                print(f"Deleting batch of {len(delete_buffer)} objects...")
                s3.delete_objects(
                    Bucket=aws.BUCKET_NAME, Delete={"Objects": delete_buffer}
                )
                delete_buffer = []  # Reset the buffer

    # Clean up any remaining keys in the buffer
    if delete_buffer:
        print(f"Deleting final batch of {len(delete_buffer)} objects...")
        s3.delete_objects(Bucket=aws.BUCKET_NAME, Delete={"Objects": delete_buffer})

    print("Cleanup completed.")

