import io
import os
import uuid

import aws
import db
import env
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile

# from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi_jwt_auth2 import AuthJWT
from fastapi_jwt_auth2.exceptions import AuthJWTException
from PIL import Image

# from fastapi_jwt_auth.exceptions import AuthJWTException
from pydantic import BaseModel

app = FastAPI()


class User(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class Settings(BaseModel):
    authjwt_secret_key: str = "secretstuffhere"


class AlbumCreateRequest(BaseModel):
    album_name: str


class DeleteAlbumRequest(BaseModel):
    code: str


class DeletePhotoRequest(BaseModel):
    photo_id: int


@AuthJWT.load_config
def get_config():
    return Settings()


@app.exception_handler(AuthJWTException)
def authjwt_exception_handler(request: Request, exc: AuthJWTException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.post("/api/login")
def login(user: User, Authorize: AuthJWT = Depends()):
    db_user = db.check_password(user.username, user.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Bad username or password")

    access_token = Authorize.create_access_token(subject=user.username)
    refresh_token = Authorize.create_refresh_token(subject=user.username)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.username,
    }


@app.post("/api/register")
def register(request: RegisterRequest, Authorize: AuthJWT = Depends()):
    """
    Handle user registration.  The frontend sends a JSON body, so FastAPI
    parses it into the RegisterRequest model.
    """

    prev = db.getUser(request.username)
    if prev is not None:
        raise HTTPException(status_code=400, detail="Username already exists")

    db.setUser(request.username, request.email, request.password)

    print(f"Registering user: {request.username}, email: {request.email}, ")
    access_token = Authorize.create_access_token(subject=request.username)
    refresh_token = Authorize.create_refresh_token(subject=request.username)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": request.username,
    }


@app.post("/api/refresh")
def refresh(Authorize: AuthJWT = Depends()):
    """
    The jwt_refresh_token_required() function insures a valid refresh
    token is present in the request before running any code below that function.
    we can use the get_jwt_subject() function to get the subject of the refresh
    token, and use the create_access_token() function again to make a new access token
    """
    Authorize.jwt_refresh_token_required()

    current_user = Authorize.get_jwt_subject()
    new_access_token = Authorize.create_access_token(subject=current_user)
    return {"access_token": new_access_token}


@app.get("/api/protected")
def protected(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()

    current_user = Authorize.get_jwt_subject()
    return {"user": current_user}


# --------------------------------------------------------------------------- #
# App Logic
# --------------------------------------------------------------------------- #


@app.get("/api/user/{username}")
def get_albums_for_user(username: str):
    """
    Return a list of albums belonging to the user identified by *username*.
    The requester does not need to be logged in.
    """
    user_record = db.getUser(username)
    if user_record is None:
        raise HTTPException(status_code=404, detail="User not found")

    albums = db.get_albums(user_record["id"])
    for album in albums:
        album["username"] = username
    return albums


@app.post("/api/create-album")
def create_album(request: AlbumCreateRequest, Authorize: AuthJWT = Depends()):
    """
    Create a new album with the given name for the currently authenticated user.
    The requester must be logged in to create an album.
    """
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    if not current_user:
        raise HTTPException(
            status_code=401, detail="Invalid authentication credentials"
        )

    user_record = db.getUser(str(current_user))
    if user_record is None:
        raise HTTPException(status_code=404, detail="User not found")

    new_album = db.create_album(user_record["id"], request.album_name)

    return new_album


@app.get("/api/album/{code}")
def get_album_by_code(code: str):
    """
    Retrieve an album by its unique code. This endpoint is public and does not require authentication.
    """
    album = db.get_album_by_code(code)
    if album is None:
        raise HTTPException(status_code=404, detail="Album not found")

    # convert album.photos to include presigned URLs
    for photo in album.get("photos", []):
        photo["s3_key"] = aws.create_presigned_url(photo["s3_key"])
        if photo["thumb_key"]:
            photo["thumb_key"] = aws.create_presigned_url(photo["thumb_key"])

    return album


@app.post("/api/delete-album")
def delete_album(request: DeleteAlbumRequest, Authorize: AuthJWT = Depends()):
    """
    Delete an album identified by its unique code. The requester must be the owner of the album and must be logged in.
    """
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()

    user_record = db.getUser(current_user)
    if user_record is None:
        raise HTTPException(status_code=404, detail="User not found")

    album = db.get_album_by_code(request.code)
    if album is None:
        raise HTTPException(status_code=404, detail="Album not found")

    if album["username"] != current_user:
        raise HTTPException(
            status_code=403, detail="You do not have permission to delete this album"
        )

    db.delete_album_by_code(request.code)

    return {"detail": "Album deleted successfully"}


@app.post("/api/upload-file")
def upload_file(
    file: UploadFile = File(...),
    album_code: str = Form(...),
    Authorize: AuthJWT = Depends(),
):
    """
    Handle file uploads for an album.

    The request must include a multipart/form‑data body with:
      * ``file`` – the file to upload (any type supported by the browser).
      * ``album_code`` – the unique code of the album to add the file to.

    Authentication
    --------------
    Requires a valid access token (``Authorization: Bearer <token>``).

    Storage
    -------
    The file is saved under ``media/<album_code>/<generated‑filename>``.
    The same path is stored in the ``s3_key`` and ``thumb_key`` columns of the
    ``photos`` table; thumbnails are not generated in this example.

    Response
    --------
    200 OK with a JSON object containing the new photo id and the stored path.
    """
    # Enforce authentication
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()

    # Resolve user and album
    user_record = db.getUser(str(current_user))
    if user_record is None:
        raise HTTPException(status_code=404, detail="User not found")

    album = db.get_album_by_code(album_code)
    if album is None:
        raise HTTPException(status_code=404, detail="Album not found")

    file_id = uuid.uuid4().hex
    s3_key = f"{album_code}/{file_id}"

    try:
        file_bytes = file.file.read()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Could not read uploaded file"
        ) from e
    finally:
        file.file.close()

    upload_success = aws.upload_bytes_to_s3(file_bytes, s3_key)
    if not upload_success:
        raise HTTPException(status_code=500, detail="Failed to upload file to S3")

    thumb_key = None
    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.thumbnail((300, 300))
        thumb_io = io.BytesIO()

        try:
            image.save(thumb_io, format="JPEG")
            thumb_format = "image/jpeg"
        except Exception:
            image.save(thumb_io, format="PNG")
            thumb_format = "image/png"

        thumb_io.seek(0)
        thumb_key = f"{album_code}/thumb_{file_id}"
        if not aws.upload_bytes_to_s3(thumb_io.read(), thumb_key):
            thumb_key = None
    except Exception as e:
        print(f"Thumbnail generation failed for {file.file.name}: {e}")
        thumb_key = None

    # Store metadata in the database
    photo_id = db.add_photo(
        user_id=user_record["id"],
        album_id=album["id"],
        filename=str(file.filename),
        s3_key=s3_key,
        thumb_key=thumb_key,
    )

    return {
        "photo_id": photo_id,
        "filename": file.filename,
        "album_id": album["id"],
        "s3_key": aws.create_presigned_url(s3_key),
        "thumb_key": aws.create_presigned_url(thumb_key) if thumb_key else None,
    }


@app.get("/api/photos/{album_id}")
def get_photos_for_album(album_id: int):
    """
    Retrieve a list of photos belonging to the album identified by *album_id*.
    The requester does not need to be logged in."""

    photos = db.get_photos_by_album_id(album_id)

    # convert s3_key and thumb_key to presigned URLs
    for photo in photos:
        photo["s3_key"] = aws.create_presigned_url(photo["s3_key"])
        if photo["thumb_key"]:
            photo["thumb_key"] = aws.create_presigned_url(photo["thumb_key"])
    return photos


# delete photo endpoint
@app.post("/api/delete-photo")
def delete_photo(request: DeletePhotoRequest, Authorize: AuthJWT = Depends()):
    """
    Delete a photo by its ID. This is possible if the requester is
    the owner of the photo and is logged in, or if the requestetr is the owner
    of the album the photo belongs to and is logged in.
    """
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()

    user_record = db.getUser(str(current_user))
    if user_record is None:
        raise HTTPException(status_code=404, detail="User not found")

    photo = db.get_photo(request.photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    album = db.get_album(photo["album_id"])
    if album is None:
        raise HTTPException(status_code=404, detail="Album not found")

    if (
        photo["username"] != user_record["username"]
        and album["user_id"] != user_record["id"]
    ):
        raise HTTPException(
            status_code=403, detail="You do not have permission to delete this photo"
        )

    db.delete_photo_by_id(request.photo_id)
    aws.delete_file_from_s3(photo["s3_key"])
    if photo["thumb_key"]:
        aws.delete_file_from_s3(photo["thumb_key"])
    return {"detail": "Photo deleted successfully"}


# --------------------------------------------------------------------------- #
# End app Logic
# --------------------------------------------------------------------------- #

app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")


@app.get("/{full_path:path}")
async def serve_spa(request: Request, full_path: str):
    local_path = os.path.join("static", full_path)
    if os.path.isfile(local_path):
        return FileResponse(local_path)

    return FileResponse("static/index.html")


# 1️⃣ Serve the Vite build under “/” (but don’t use html=True)
@app.on_event("startup")
def startup() -> None:
    # Initialize the database when the application starts up
    db.init_db()
