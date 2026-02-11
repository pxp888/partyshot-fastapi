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


class Settings(BaseModel):
    authjwt_secret_key: str = "secretstuffhere"


@AuthJWT.load_config
def get_config():
    return Settings()


@app.exception_handler(AuthJWTException)
def authjwt_exception_handler(request: Request, exc: AuthJWTException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


# @app.post("/login")
@app.post("/api/login")
def login(user: User, Authorize: AuthJWT = Depends()):
    if user.username != "test" or user.password != "test":
        raise HTTPException(status_code=401, detail="Bad username or password")

    # Use create_access_token() and create_refresh_token() to create our
    # access and refresh tokens
    access_token = Authorize.create_access_token(subject=user.username)
    refresh_token = Authorize.create_refresh_token(subject=user.username)
    return {"access_token": access_token, "refresh_token": refresh_token}


@app.post("/refresh")
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


@app.get("/protected")
def protected(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()

    current_user = Authorize.get_jwt_subject()
    return {"user": current_user}


app.mount(
    "/",  # root URL
    StaticFiles(directory="static", html=True),
    name="static",
)


# 2️⃣ Fallback for all other routes – this is the SPA entry point
@app.get("/{full_path:path}")
async def spa(full_path: str):
    """
    Return the Vite‑generated index.html for any path that isn’t a
    real file.  React Router will then take over.
    """
    index_path = os.path.join("static", "index.html")
    return FileResponse(index_path)


# 1️⃣ Serve the Vite build under “/” (but don’t use html=True)
@app.on_event("startup")
def startup() -> None:
    # Initialize the database when the application starts up
    db.init_db()
