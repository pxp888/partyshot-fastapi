import os

import db
import env
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi_jwt_auth2 import AuthJWT
from fastapi_jwt_auth2.exceptions import AuthJWTException

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

    user_record = db.getUser(current_user)
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
