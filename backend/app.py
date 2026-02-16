import json
import os
import uuid

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


# async def get_redis(request: Request):
#     return request.app.state.redis


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
    album = db.getAlbum_code(album_code)
    if not album:
        return
    if not album["open"]:
        if album["user_id"] != user["id"]:
            print("get_presigned - not allowed")
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

    photo_id = db.addPhoto(
        {
            "user_id": user_record["id"],
            "album_id": payload["album_id"],
            "filename": payload["filename"],
            "s3_key": payload["s3_key"],
            "thumb_key": payload.get("thumb_key"),
        }
    )

    message = {"action": "addPhoto", "payload": photo_id}
    await redis_client.publish(f"album-{payload['albumcode']}", json.dumps(message))
    return {"photo_id": photo_id}


@app.post("/api/cleanup")
def cleanup_endpoint(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    db.cleanup()
    return {"status": "cleanup performed"}


# --------------------------------------------------------------------------- #
# App Logic
# --------------------------------------------------------------------------- #


@app.post("/api/generate-wssecret")
async def generate_wssecret_endpoint(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    wssecret = uuid.uuid4().hex
    await redis_client.set(f"user:{current_user}:uuid", wssecret)
    return {"wssecret": wssecret}


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


async def createAlbum(websocket, data, username):
    album_name = data["payload"]["album_name"]

    result = db.createAlbum(username, album_name)
    if not result:
        print("createAlbum error")
        return
    message = {"action": "newAlbum", "payload": {"type": "update"}}
    await redis_client.publish(f"user-{username}", json.dumps(message))


async def getAlbums(websocket, data, username):
    target = data["payload"]["target"]
    result = db.getAlbums(target)
    message = {"action": "getAlbums", "payload": result}
    await websocket.send_json(message)
    await manager.subscribe(websocket, f"user-{target}")


async def deleteAlbum(websocket, data, username):
    albumcode = data["payload"]["albumcode"]
    ok = db.deleteAlbum(username, albumcode)
    message = {"action": "deleteAlbum", "payload": ok}
    await websocket.send_json(message)

    message = {"action": "newAlbum", "payload": {"type": "update"}}
    await redis_client.publish(f"user-{username}", json.dumps(message))


async def getAlbum(websocket, data, username):
    albumcode = data["payload"]["albumcode"]
    album = db.getAlbum_code(albumcode)
    if not album:
        print("getAlbum - no album found")
        return
    message = {"action": "getAlbum", "payload": album}
    await websocket.send_json(message)
    await manager.subscribe(websocket, f"album-{albumcode}")
    print("subscribed to : ", f"album-{albumcode}")


async def getPhotos(websocket, data, username):
    albumcode = data["payload"]["albumcode"]
    photos = db.getPhotos(albumcode)
    message = {"action": "getPhotos", "payload": photos}
    await websocket.send_json(message)


async def deletePhoto(websocket, data, username):
    albumcode = data["payload"]["album_code"]
    photo_id = data["payload"]["photo_id"]
    ok = db.deletePhoto(photo_id, username)
    if ok:
        message = {"action": "deletePhoto", "payload": photo_id}
        await redis_client.publish(f"album-{albumcode}", json.dumps(message))
    else:
        print("not deleted", photo_id)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    wssecret = websocket.query_params.get("wssecret")
    username = websocket.query_params.get("username")

    if not wssecret or not username:
        # Explicitly close – this will surface as 1008 to the client
        await websocket.close(code=1008)
        return

    # 2️⃣  Verify the secret that was issued to the user
    old = await redis_client.get(f"user:{username}:uuid")
    if old != wssecret:
        # Reject the connection – prevents spoofing
        await websocket.close(code=1008)
        return

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                # Bad payload – let the client know and terminate
                print("websocket - bad message")
                await websocket.close(code=1008)
                return

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
            else:
                # Unknown action – close to prevent abuse
                print("websocket - unknown action")
                await websocket.close(code=1008)
                return

    # Handle normal client disconnects cleanly without attempting a second close
    except WebSocketDisconnect as e:
        # WebSocketDisconnect is expected when the client closes the connection
        print(f"WebSocket disconnected: {e.code}")
        return
    except Exception as e:
        # Log the error – keep the log readable
        print(f"WebSocket error: {e}")
        # Ensure we close cleanly only if the socket is still open
        try:
            await websocket.close(code=1011)  # 1011 = internal error
        except Exception as close_err:
            print(f"Failed to close websocket cleanly: {close_err}")


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
    # create pool for arq workers
    app.state.redis = await create_pool(RedisSettings(host="localhost", port=6379))
