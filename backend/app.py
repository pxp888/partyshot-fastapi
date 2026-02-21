import json
import logging
import os
import time
import uuid

logging.basicConfig(
    level=logging.ERROR, format="%(asctime)s - %(levelname)s - %(message)s"
)

import aws
import db
import env
import redis.asyncio as redis
import watcher
from arq import create_pool
from arq.connections import RedisSettings
from botocore.exceptions import ClientError
from fastapi import (
    Depends,
    FastAPI,
    Form,
    HTTPException,
    Request,
    WebSocket,
)

# from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi_jwt_auth2 import AuthJWT
from fastapi_jwt_auth2.exceptions import AuthJWTException

# from fastapi_jwt_auth.exceptions import AuthJWTException
from pydantic import BaseModel
from starlette.websockets import WebSocketDisconnect

redis_client = redis.from_url(env.REDIS_URL, decode_responses=True)

manager = watcher.Watcher()


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


class ToggleOpenRequest(BaseModel):
    album_id: int


class TogglePublicRequest(BaseModel):
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

    logging.info("Registering user: %s, email: %s, ", request.username, request.email)
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


@app.post("/api/generate-wssecret")
async def generate_wssecret_endpoint(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    wssecret = uuid.uuid4().hex
    # await redis_client.set(f"user:{current_user}:uuid", wssecret)
    await redis_client.set(f"wssecret:{wssecret}", current_user, ex=1200)
    logging.info("------------------------secrets for : %s", current_user)
    return {"wssecret": wssecret}


# --------------------------------------------------------------------------- #
# App Logic
# --------------------------------------------------------------------------- #


@app.post("/api/s3-presigned")
async def get_presigned(
    filename: str = Form(...),
    album_code: str = Form(...),
    Authorize: AuthJWT = Depends(),
):
    Authorize.jwt_required()

    current_user = Authorize.get_jwt_subject()
    # x = db.openCheck(str(current_user), album_code)
    if not current_user:
        return
    user = db.getUser(str(current_user))
    album = db.getAlbum(album_code)
    if not album:
        return
    if not album["open"]:
        if album["user_id"] != user["id"]:
            logging.info("get_presigned - not allowed")
            raise HTTPException(status_code=403, detail="Not Allowed")
            return

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
async def add_photo_metadata(
    payload: dict,
    Authorize: AuthJWT = Depends(),
):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    user_record = db.getUser(str(current_user))
    if user_record is None:
        raise HTTPException(status_code=404, detail="User not found")

    photo_resp = db.addPhoto(
        {
            "user_id": user_record["id"],
            "album_id": payload["album_id"],
            "filename": payload["filename"],
            "s3_key": payload["s3_key"],
            "thumb_key": payload.get("thumb_key"),
        }
    )

    if photo_resp:
        # Enqueue background task to check sizes (expires in 10 minutes)
        await app.state.redis.enqueue_job(
            "check_photo_sizes",
            photo_resp["id"],
            payload["s3_key"],
            payload.get("thumb_key"),
            _expires=600,
        )

    message = {"action": "addPhoto", "payload": photo_resp}
    await redis_client.publish(f"album-{payload['albumcode']}", json.dumps(message))
    return {"photo_id": photo_resp}


@app.post("/api/cleanup")
async def cleanup_endpoint(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    if current_user != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")

    await app.state.redis.enqueue_job("cleanup2")
    return {"status": "cleanup task enqueued"}


@app.post("/api/recount-sizes")
async def recount_sizes_endpoint(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    if current_user != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")

    await app.state.redis.enqueue_job("recount_missing_sizes")
    return {"status": "recount task enqueued"}


@app.get("/api/space-used")
def space_used(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    if current_user != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    return db.spaceUsed()


@app.post("/api/toggleOpen")
async def toggle_open(
    payload: ToggleOpenRequest,
    Authorize: AuthJWT = Depends(),
):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    updated_album = db.toggleOpen(payload.album_id, current_user)
    if not updated_album:
        raise HTTPException(
            status_code=404, detail="Album not found or permission denied"
        )
    try:
        await redis_client.publish(
            f"album-{updated_album['code']}",
            json.dumps({"action": "toggleOpen", "payload": updated_album}),
        )
    except Exception:
        pass
    return updated_album


@app.post("/api/togglePublic")
async def toggle_public(
    payload: TogglePublicRequest,
    Authorize: AuthJWT = Depends(),
):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    updated_album = db.togglePublic(payload.album_id, current_user)
    if not updated_album:
        raise HTTPException(
            status_code=404, detail="Album not found or permission denied"
        )
    try:
        await redis_client.publish(
            f"album-{updated_album['code']}",
            json.dumps({"action": "togglePublic", "payload": updated_album}),
        )
    except Exception:
        pass
    return updated_album


async def createAlbum(websocket, data, username):
    album_name = data["payload"]["album_name"]

    result = db.createAlbum(username, album_name)
    if not result:
        logging.error("createAlbum error")
        return
    message = {"action": "newAlbum", "payload": {"type": "update"}}
    await redis_client.publish(f"user-{username}", json.dumps(message))
    message2 = {"action": "createAlbum", "payload": result}
    await websocket.send_json(message2)


async def getAlbums(websocket, data, username):
    target = data["payload"]["target"]
    result = db.getAlbums(target, username)
    message = {"action": "getAlbums", "payload": result}
    await websocket.send_json(message)
    await manager.subscribe(websocket, f"user-{target}")


async def deleteAlbum(websocket, data, username):
    albumcode = data["payload"]["albumcode"]
    result = await db.deleteAlbum(username, albumcode)
    message = {"action": "deleteAlbum", "payload": result}
    await websocket.send_json(message)

    if result == "ok":
        message = {"action": "newAlbum", "payload": {"type": "update"}}
        await redis_client.publish(f"user-{username}", json.dumps(message))

        message = {"action": "deleteAlbum", "payload": albumcode}
        await redis_client.publish(f"album-{albumcode}", json.dumps(message))


async def getAlbum(websocket, data, username):
    albumcode = data["payload"]["albumcode"]
    album = db.getAlbumWithSub(albumcode, username)
    if not album:
        logging.info("getAlbum - no album found")
        return
    message = {"action": "getAlbum", "payload": album}
    await websocket.send_json(message)
    await manager.subscribe(websocket, f"album-{albumcode}")


async def attach_presigned_urls(photos_data: dict):
    if not photos_data or "photos" not in photos_data or not photos_data["photos"]:
        return photos_data

    photos = photos_data["photos"]

    # Collect all unique S3 keys that need presigning
    keys_to_check = []
    for p in photos:
        if p.get("s3_key"):
            keys_to_check.append(p["s3_key"])
        if p.get("thumb_key"):
            keys_to_check.append(p["thumb_key"])

    if not keys_to_check:
        return photos_data

    # deduplicate
    unique_s3_keys = list(set(keys_to_check))

    # Construct redis keys
    redis_keys = [f"presigned:{k}" for k in unique_s3_keys]

    # MGET from redis
    cached_urls = await redis_client.mget(*redis_keys)
    url_map = dict(zip(unique_s3_keys, cached_urls))

    new_presigned_urls = {}

    for p in photos:
        for key_type in ["s3_key", "thumb_key"]:
            s3_key = p.get(key_type)
            if not s3_key:
                continue

            presigned_url = url_map.get(s3_key)
            if not presigned_url:
                # Generate new presigned URL (12 hour expiration)
                presigned_url = aws.create_presigned_url(s3_key, expiration=43200)
                if presigned_url:
                    new_presigned_urls[f"presigned:{s3_key}"] = presigned_url

            p[key_type] = presigned_url

    # Cache new URLs if any
    if new_presigned_urls:
        async with redis_client.pipeline(transaction=False) as pipe:
            for r_key, url in new_presigned_urls.items():
                pipe.set(r_key, url, ex=43200)
            await pipe.execute()

    return photos_data


async def getPhotos(websocket, data, username):
    albumcode = data["payload"]["albumcode"]
    limit = data["payload"].get("limit", 100)
    offset = data["payload"].get("offset", 0)
    sort_field = data["payload"].get("sortField", "created_at")
    sort_order = data["payload"].get("sortOrder", "desc")

    photos_data = db.getPhotos(
        albumcode,
        limit=limit,
        offset=offset,
        sort_field=sort_field,
        sort_order=sort_order,
    )

    if photos_data:
        photos_data = await attach_presigned_urls(photos_data)

    message = {"action": "getPhotos", "payload": photos_data}
    await websocket.send_json(message)


async def deletePhoto(websocket, data, username):
    albumcode = data["payload"]["album_code"]
    photo_id = data["payload"]["photo_id"]
    ok = await db.deletePhoto(photo_id, username)
    if ok:
        message = {"action": "deletePhoto", "payload": photo_id}
        await redis_client.publish(f"album-{albumcode}", json.dumps(message))
    else:
        logging.info("not deleted %s", photo_id)


async def search(websocket, data, username):
    term = data["payload"]["term"]
    logging.info("search %s", term)
    result = db.search(term)
    message = {"action": "search", "payload": result}
    await websocket.send_json(message)


async def setAlbumName(websocket, data, username):
    albumcode = data["payload"]["albumcode"]
    name = data["payload"]["name"]
    ok = db.setAlbumName(albumcode, name, username)
    if ok:
        message = {
            "action": "setAlbumName",
            "payload": {"albumcode": albumcode, "name": name},
        }
        await redis_client.publish(f"album-{albumcode}", json.dumps(message))
        message = {"action": "newAlbum", "payload": {"type": "update"}}
        await redis_client.publish(f"user-{username}", json.dumps(message))
    else:
        logging.error("not set album name %s", albumcode)


async def setUserData(websocket, data, username):
    newusername = data["payload"].get("newusername")
    email = data["payload"].get("email")
    password = data["payload"].get("password")
    wssecret = data.get("wssecret")
    ok = db.setUserData(username, newusername, email, password)

    if ok == "success":
        # Determine what the effective username is now
        effective_username = (
            newusername if (newusername and len(newusername) >= 3) else username
        )
        message = {
            "action": "setUserData",
            "payload": {"email": email, "username": effective_username, "message": ok},
        }
        await websocket.send_json(message)
        if wssecret:
            await redis_client.set(f"wssecret:{wssecret}", effective_username, ex=1200)
    else:
        message = {
            "action": "setUserData",
            "payload": {"email": email, "username": username, "message": ok},
        }
        await websocket.send_json(message)
        logging.error("setUserData status/error: %s for user %s", ok, username)


async def getEmail(websocket, data, username):
    email = db.getEmail(username)
    message = {"action": "getEmail", "payload": email}
    await websocket.send_json(message)


async def getUsage(websocket, data, username):
    usage = db.getUsage(username)
    message = {"action": "getUsage", "payload": usage}
    await websocket.send_json(message)


async def subscribe(websocket, data, username):
    albumcode = data["payload"]["albumcode"]
    ok = db.subscribe(username, albumcode)
    message = {"action": "subscribe", "payload": ok}
    await websocket.send_json(message)


async def unsubscribe(websocket, data, username):
    albumcode = data["payload"]["albumcode"]
    ok = db.unsubscribe(username, albumcode)
    message = {"action": "unsubscribe", "payload": ok}
    await websocket.send_json(message)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                # Bad payload – let the client know and terminate
                logging.error("websocket - bad message")
                await websocket.close(code=1008)
                return

            username = None
            wssecret = payload.get("wssecret")
            if wssecret:
                username = await redis_client.get(f"wssecret:{wssecret}")

            logging.info("%s %s", username, payload)

            action = payload.get("action")
            if action == "createAlbum":
                await createAlbum(websocket, payload, username)
            elif action == "getAlbums":
                await getAlbums(websocket, payload, username)
            elif action == "deleteAlbum":
                await deleteAlbum(websocket, payload, username)
            elif action == "getPhotos":
                await getPhotos(websocket, payload, username)
            elif action == "getAlbum":
                await getAlbum(websocket, payload, username)
            elif action == "deletePhoto":
                await deletePhoto(websocket, payload, username)
            elif action == "search":
                await search(websocket, payload, username)
            elif action == "setAlbumName":
                await setAlbumName(websocket, payload, username)
            elif action == "setUserData":
                await setUserData(websocket, payload, username)
            elif action == "getEmail":
                await getEmail(websocket, payload, username)
            elif action == "getUsage":
                await getUsage(websocket, payload, username)
            elif action == "subscribe":
                await subscribe(websocket, payload, username)
            elif action == "unsubscribe":
                await unsubscribe(websocket, payload, username)
            else:
                logging.error("websocket - unknown action")
                await websocket.close(code=1008)
                return

    # Handle normal client disconnects cleanly without attempting a second close
    except WebSocketDisconnect as e:
        # WebSocketDisconnect is expected when the client closes the connection
        logging.info("WebSocket disconnected: %s", e.code)
        return
    except Exception as e:
        # Log the error – keep the log readable
        logging.error("WebSocket error: %s", e)
        # Ensure we close cleanly only if the socket is still open
        try:
            await websocket.close(code=1011)  # 1011 = internal error
        except Exception as close_err:
            logging.error("Failed to close websocket cleanly: %s", close_err)


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
    db.init_pool()
    db.init_db()
    # create pool for arq workers
    app.state.redis = await create_pool(RedisSettings(host=env.REDIS_URL2, port=6379))
