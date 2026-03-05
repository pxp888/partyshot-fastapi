import json
import logging
import os
import time
import uuid

logging.basicConfig(
    level=logging.WARNING, format="%(asctime)s - %(levelname)s - %(message)s"
)

import aws
import db
import env
import redis.asyncio as redis
import stripe_endpoint
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
    Response,
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


userlimits = {
    "free": 100000000,
    "starter": 500000000,
    "basic": 1000000000,
    "pro": 2000000000,
}


class User(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class Settings(BaseModel):
    authjwt_secret_key: str = env.AUTH_JWT_SECRET_KEY
    authjwt_cookie_domain: str = ".shareshot.eu"
    authjwt_token_location: set = {"headers", "cookies"}
    authjwt_cookie_csrf_protect: bool = False  # Set to True in production if needed


class ToggleOpenRequest(BaseModel):
    album_id: int


class ToggleProfileRequest(BaseModel):
    album_id: int


class TogglePrivateRequest(BaseModel):
    album_id: int


@AuthJWT.load_config
def get_config():
    return Settings()


@app.exception_handler(AuthJWTException)
def authjwt_exception_handler(request: Request, exc: AuthJWTException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


def cookie(response):
    """Placeholder for cookie logic (CloudFront was removed)"""
    return


@app.get("/api/cookie")
async def setCookie():
    resp = Response(status_code=204)
    cookie(resp)
    return resp


@app.post("/api/login")
def login(user: User, response: Response, Authorize: AuthJWT = Depends()):
    db_user = db.check_password(user.username, user.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Bad username or password")

    access_token = Authorize.create_access_token(subject=user.username)
    refresh_token = Authorize.create_refresh_token(subject=user.username)

    # Ensure tokens are strings (handle potential bytes return)
    if isinstance(access_token, bytes):
        access_token = access_token.decode("utf-8")
    if isinstance(refresh_token, bytes):
        refresh_token = refresh_token.decode("utf-8")

    # Set JWT cookies for Cloudflare Worker
    Authorize.set_access_cookies(access_token, response=response)
    Authorize.set_refresh_cookies(refresh_token, response=response)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.username,
    }


@app.post("/api/register")
def register(
    request: RegisterRequest, response: Response, Authorize: AuthJWT = Depends()
):
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

    # Ensure tokens are strings
    if isinstance(access_token, bytes):
        access_token = access_token.decode("utf-8")
    if isinstance(refresh_token, bytes):
        refresh_token = refresh_token.decode("utf-8")

    # Set JWT cookies for Cloudflare Worker
    Authorize.set_access_cookies(access_token, response=response)
    Authorize.set_refresh_cookies(refresh_token, response=response)

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


@app.post("/api/logout")
def logout(response: Response, Authorize: AuthJWT = Depends()):
    Authorize.unset_jwt_cookies(response=response)
    return {"msg": "Successfully logged out"}


@app.get("/api/protected")
def protected(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()

    current_user = Authorize.get_jwt_subject()

    user_info = db.getUser(current_user)
    return {"user_info": user_info}


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

    # Calculate space remaining for the album owner
    owner_username = album["username"]
    owner_usage = db.getUsage(owner_username) or {}
    owner_details = db.getUser(owner_username) or {}

    owner_class = owner_details.get("class", "free").lower()
    owner_limit = userlimits.get(owner_class, userlimits["free"])
    space_used = owner_usage.get("spaceused_table", 0)
    space_remaining = max(0, owner_limit - space_used)

    if space_remaining <= 0:
        raise HTTPException(
            status_code=403,
            detail="Storage limit reached for this album owner. Please upgrade or delete some photos.",
        )

    if not album["open"]:
        if album["user_id"] != user["id"]:
            logging.info("get_presigned - not allowed")
            raise HTTPException(status_code=403, detail="Not Allowed")

    file_id = uuid.uuid4().hex
    s3_key = f"{album_code}/{file_id}"
    thumb_key = f"{album_code}/thumb_{file_id}"
    mid_key = f"{album_code}/mid_{file_id}"

    s3_client = aws.get_s3_client()
    try:
        # Generate presigned PUT for original
        original_presigned = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={"Bucket": aws.BUCKET_NAME, "Key": s3_key},
            ExpiresIn=3600,
        )
        # Generate presigned PUT for thumbnail
        thumb_presigned = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={"Bucket": aws.BUCKET_NAME, "Key": thumb_key},
            ExpiresIn=3600,
        )
        # Generate presigned PUT for mid-sized
        mid_presigned = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={"Bucket": aws.BUCKET_NAME, "Key": mid_key},
            ExpiresIn=3600,
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "s3_key": s3_key,
        "presigned": original_presigned,
        "thumb_key": thumb_key,
        "thumb_presigned": thumb_presigned,
        "mid_key": mid_key,
        "mid_presigned": mid_presigned,
        "space_remaining": space_remaining,
    }


@app.get("/api/album-thumbnail/{album_code}")
async def get_album_thumbnail_endpoint(
    album_code: str,
    Authorize: AuthJWT = Depends(),
):
    # Optional JWT: if it's there, we can check privacy.
    # If not, we only show if not private.
    try:
        Authorize.jwt_optional()
        current_user = Authorize.get_jwt_subject()
    except Exception:
        current_user = None

    album = db.getAlbum(album_code)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    if album["private"]:
        if not current_user or album["username"] != current_user:
            raise HTTPException(status_code=403, detail="Not Allowed")

    thumb_url = db.get_album_thumbnail(album_code)
    return {"thumbnail": thumb_url}


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
            "mid_key": payload.get("mid_key"),
            "size": None,
            "thumb_size": payload.get("thumb_size"),
            "mid_size": payload.get("mid_size"),
        }
    )

    if photo_resp:
        await app.state.redis.enqueue_job(
            "check_photo_sizes",
            photo_resp["id"],
            payload["s3_key"],
            payload.get("thumb_key"),
            payload.get("mid_key"),
            _expires=3600,
        )

    if photo_resp:
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
    # Subscribe to the user's personal channel
    await manager.subscribe(websocket, f"user-{target}")
    # Subscribe to each individual album channel
    if result and "albums" in result:
        for album in result["albums"]:
            await manager.subscribe(websocket, f"album-{album['code']}")


async def deleteAlbum(websocket, data, username):
    albumcode = data["payload"]["albumcode"]
    result = await db.deleteAlbum(username, albumcode)
    message = {"action": "deleteAlbum", "payload": result}
    await websocket.send_json(message)

    if result == albumcode:
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
    if album["private"] and album["username"] != username:
        user_record = db.getUser(username)
        if user_record and db.check_user_has_photos_in_album(user_record["id"], album["id"]):
             pass
        else:
             return
    await manager.subscribe(websocket, f"album-{albumcode}")


async def attach_presigned_urls(photos_data: dict):
    """
    Generate Cloudflare R2 presigned URLs for the photos.
    """
    if not photos_data or "photos" not in photos_data or not photos_data["photos"]:
        return photos_data

    photos = photos_data["photos"]
    for p in photos:
        for key_type in ["s3_key", "thumb_key", "mid_key"]:
            s3_key = p.get(key_type)
            if s3_key:
                # Use R2 presigned URLs for retrieval
                p[key_type] = aws.create_presigned_url(s3_key, expiration=3600)

    return photos_data


async def getPhotos(websocket, data, username):
    albumcode = data["payload"]["albumcode"]
    limit = data["payload"].get("limit", 100)
    offset = data["payload"].get("offset", 0)
    sort_field = data["payload"].get("sortField", "created_at")
    sort_order = data["payload"].get("sortOrder", "desc")

    album = db.getAlbum(albumcode)
    if not album:
        logging.info("getPhotos - no album found")
        return
    user_id_filter = None
    if album["private"] and album["username"] != username:
        user_record = db.getUser(username)
        if user_record and db.check_user_has_photos_in_album(user_record["id"], album["id"]):
            user_id_filter = user_record["id"]
        else:
            logging.info("getPhotos - not allowed")
            return

    photos_data = db.getPhotos(
        album["id"],
        limit=limit,
        offset=offset,
        sort_field=sort_field,
        sort_order=sort_order,
        user_id_filter=user_id_filter,
    )

    if photos_data:
        photos_data = await attach_presigned_urls(photos_data)

    message = {"action": "getPhotos", "payload": photos_data}
    await websocket.send_json(message)


async def deletePhoto(websocket, data, username):
    albumcode = data["payload"]["album_code"]
    photo_id = data["payload"]["photo_id"]
    result = await db.deletePhoto(photo_id, username)
    if result:
        message = {"action": "deletePhoto", "payload": result}
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


async def getUserInfo(websocket, data, username):
    user = db.getUser(username)
    if user:
        info = {
            "username": user["username"],
            "email": user["email"],
            "class": user["class"],
        }
        message = {"action": "getUserInfo", "payload": info}
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


async def toggleOpen(websocket, data, username):
    album_id = data["payload"]["album_id"]
    updated_album = db.toggleOpen(album_id, username)
    if updated_album:
        message = {"action": "toggleOpen", "payload": updated_album}
        await redis_client.publish(
            f"album-{updated_album['code']}", json.dumps(message)
        )


async def toggleProfile(websocket, data, username):
    album_id = data["payload"]["album_id"]
    updated_album = db.toggleProfile(album_id, username)
    if updated_album:
        message = {"action": "toggleProfile", "payload": updated_album}
        await redis_client.publish(
            f"album-{updated_album['code']}", json.dumps(message)
        )
        message = {"action": "newAlbum", "payload": {"type": "update"}}
        await redis_client.publish(f"user-{username}", json.dumps(message))


async def togglePrivate(websocket, data, username):
    album_id = data["payload"]["album_id"]
    updated_album = db.togglePrivate(album_id, username)
    if updated_album:
        message = {"action": "togglePrivate", "payload": updated_album}
        await redis_client.publish(
            f"album-{updated_album['code']}", json.dumps(message)
        )
        message = {"action": "newAlbum", "payload": {"type": "update"}}
        await redis_client.publish(f"user-{username}", json.dumps(message))


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
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
                elif action == "getUserInfo":
                    await getUserInfo(websocket, payload, username)
                elif action == "subscribe":
                    await subscribe(websocket, payload, username)
                elif action == "unsubscribe":
                    await unsubscribe(websocket, payload, username)
                elif action == "getAlbumsWithUserPhotos":
                    result = db.getAlbumsWithUserPhotos(username)
                    message = {"action": "getAlbums", "payload": result}
                    await websocket.send_json(message)
                elif action == "toggleOpen":
                    await toggleOpen(websocket, payload, username)
                elif action == "toggleProfile":
                    await toggleProfile(websocket, payload, username)
                elif action == "togglePrivate":
                    await togglePrivate(websocket, payload, username)
                elif action == "keepAlive":
                    subjects = payload.get("payload", {}).get("subjects", [])
                    await manager.keep_alive(websocket, subjects)
                else:
                    logging.error("websocket - unknown action")
                    await websocket.close(code=1008)
                    return

        # Handle normal client disconnects cleanly
        except WebSocketDisconnect as e:
            logging.info("WebSocket disconnected: %s", e.code)
        except Exception as e:
            logging.error("WebSocket error: %s", e)
            try:
                await websocket.close(code=1011)
            except Exception:
                pass
    finally:
        await manager.unsubscribe(websocket)


# --------------------------------------------------------------------------- #
# End app Logic
# --------------------------------------------------------------------------- #


app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")


app.include_router(stripe_endpoint.router)


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
