import asyncio
import io
import json
import os
import uuid

import aws
import db
import env
import redis.asyncio as redis
from arq import create_pool
from arq.connections import RedisSettings
from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    WebSocket,
)

# from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi_jwt_auth2 import AuthJWT
from fastapi_jwt_auth2.exceptions import AuthJWTException
from PIL import Image

# from fastapi_jwt_auth.exceptions import AuthJWTException
from pydantic import BaseModel

redis_client = redis.from_url("redis://localhost:6379", decode_responses=True)

app = FastAPI()


class User(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class Settings(BaseModel):
    authjwt_secret_key: str = "secretstuffherethis is a long secret key for jwt signing"


class AlbumCreateRequest(BaseModel):
    album_name: str


class DeleteAlbumRequest(BaseModel):
    code: str


class DeletePhotoRequest(BaseModel):
    photo_id: int


class ToggleLockRequest(BaseModel):
    album_id: int


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


async def get_redis(request: Request):
    return request.app.state.redis


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
        if album["thumb_key"]:
            album["thumb_key"] = aws.create_presigned_url(album["thumb_key"])
    return albums


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

    user_record = db.getUser(str(current_user))
    if user_record is None:
        raise HTTPException(status_code=404, detail="User not found")

    album = db.get_album_by_code(request.code)
    if album is None:
        raise HTTPException(status_code=404, detail="Album not found")

    if album["username"] != current_user:
        raise HTTPException(
            status_code=403, detail="You do not have permission to delete this album"
        )

    pics = db.get_photos_by_album_id(album["id"])
    for pic in pics:
        aws.delete_file_from_s3(pic["s3_key"])
        if pic["thumb_key"]:
            aws.delete_file_from_s3(pic["thumb_key"])

    db.delete_album_by_code(request.code)

    return {"detail": "Album deleted successfully"}


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
        and album["username"] != user_record["username"]
    ):
        raise HTTPException(
            status_code=403, detail="You do not have permission to delete this photo"
        )

    db.delete_photo_by_id(request.photo_id)
    aws.delete_file_from_s3(photo["s3_key"])
    if photo["thumb_key"]:
        aws.delete_file_from_s3(photo["thumb_key"])
    return {"detail": "Photo deleted successfully"}


@app.post("/api/s3-presigned")
async def get_presigned(
    filename: str = Form(...),
    album_code: str = Form(...),
    Authorize: AuthJWT = Depends(),
):
    Authorize.jwt_required()

    current_user = Authorize.get_jwt_subject()
    x = db.openCheck(str(current_user), album_code)
    if x == 0:
        raise HTTPException(status_code=403, detail="Not Allowed")

    # unique key inside the album
    file_id = uuid.uuid4().hex
    s3_key = f"{album_code}/{file_id}"

    s3_client = aws.get_s3_client()
    try:
        # **No ACL field** – let S3 keep the object private (the default)
        response = s3_client.generate_presigned_post(
            Bucket=aws.BUCKET_NAME,
            Key=s3_key,
            ExpiresIn=3600,
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"s3_key": s3_key, "presigned": response}


@app.post("/api/add-photo-metadata")
def add_photo_metadata(
    payload: dict,
    Authorize: AuthJWT = Depends(),
):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    user_record = db.getUser(str(current_user))
    if user_record is None:
        raise HTTPException(status_code=404, detail="User not found")

    photo_id = db.add_photo(
        user_id=user_record["id"],
        album_id=payload["album_id"],
        filename=payload["filename"],
        s3_key=payload["s3_key"],
        thumb_key=payload.get("thumb_key"),
    )

    db.checkthumb(payload["album_id"], payload["thumb_key"])
    return {"photo_id": photo_id}


@app.post("/api/togglelock")
def toggleLock(request: ToggleLockRequest, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()

    x = db.toggleLock(request.album_id, str(current_user))
    print(x)
    if x == 2:
        raise HTTPException(status_code=404, detail="Album not found")

    if x == 3:
        raise HTTPException(status_code=403, detail="Not Allowed")

    return [{"open": 0}]


# --------------------------------------------------------------------------- #
# Websocket stuff
# --------------------------------------------------------------------------- #


@app.post("/api/generate-wssecret")
async def generate_wssecret_endpoint(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    wssecret = uuid.uuid4().hex
    await redis_client.set(f"user:{current_user}:uuid", wssecret)
    return {"wssecret": wssecret}


async def createAlbum(websocket, data):
    username = data["payload"]["owner"]
    album_name = data["payload"]["album_name"]
    result = db.createAlbum(username, album_name)
    await websocket.send_json(result)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    wssecret = websocket.query_params.get("wssecret")
    username = websocket.query_params.get("username")

    if not wssecret:
        await websocket.close(code=1008)  # 1008 = policy violation
        return

    if not username:
        await websocket.close(code=1008)  # 1008 = policy violation
        return

    old = await redis_client.get(f"user:{username}:uuid")
    if old != wssecret:
        print("not logged in", username)
        await websocket.close(code=1008)  # 1008 = policy violation
        return

    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "bad message"})
                return

            if data["action"] == "createAlbum":
                await createAlbum(websocket, data)

    except Exception as e:
        print(f"Connection closed: {e}")


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
async def startup():
    db.init_db()
    app.state.redis = await create_pool(RedisSettings(host="localhost", port=6379))
