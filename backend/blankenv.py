import os

os.environ["AWS_ACCESS_KEY_ID"] = "aoeu"
os.environ["AWS_SECRET_ACCESS_KEY"] = "aoeu"
BUCKET_NAME = "aws-imagestore"
REGION = "eu-north-1"


ADMIN_USERNAME = "admin"  # ← your admin username
ADMIN_EMAIL = "email@gmail.com"  # ← your admin email
ADMIN_PASSWORD = "password"  # ← your admin password


DB_ENGINE = "django.db.backends.postgresql"
DB_NAME = "postgres"  # ← your database name
DB_USER = "postgres"  # ← your database user
DB_PASSWORD = "password"  # ← your database password
DB_HOST = "192.168.0.120"  # ← your database host
DB_PORT = "5433"  # ← your database port


REDIS_URL = "redis://192.168.0.225:6379"  # for connection manager, watcher.py
REDIS_URL2 = "192.168.0.225"  # for arq
