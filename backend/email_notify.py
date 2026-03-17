import time
import datetime
import os
from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager
import csv

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import env
import sqlite3


_pool = None
_db_pool = None
_sqlite_conn = None
last_daily_run_date = 0

# this file is intended to run independently of the FastAPI app
# it will check for updated albums and notify customers


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




def send_email(to_email, subject, body):
    msg = MIMEMultipart()
    msg["From"] = env.ADMIN_MAIL_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(env.ADMIN_MAIL_EMAIL, env.ADMIN_MAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")
        return False


def init_sqlite():
    global _sqlite_conn
    if _sqlite_conn is None:
        # Use home directory for the SQLite database
        db_path = os.path.expanduser("~/notified.db")
        _sqlite_conn = sqlite3.connect(db_path)
        
        _sqlite_conn.execute("""CREATE TABLE IF NOT EXISTS notified (
            "index" TEXT PRIMARY KEY, 
            user_id INTEGER,
            album_id INTEGER,
            modified_at REAL,
            opened_at REAL,
            notified_at REAL
        )""")
        _sqlite_conn.commit()


def check_customers():
    """Handle 'always' notifications with a 1-hour throttle."""
    process_notifications(notify_type='always', throttle_seconds=3600)


def check_daily_customers():
    """Handle 'daily' notifications between 12:00 and 13:00 Stockholm time."""
    global last_daily_run_date
    now_dt = datetime.datetime.now()
    today_int = int(now_dt.strftime("%Y%m%d"))
    
    if today_int == last_daily_run_date:
        return

    if 12 <= now_dt.hour < 13:
        process_notifications(notify_type='daily', throttle_seconds=86400)
        last_daily_run_date = today_int


def process_notifications(notify_type, throttle_seconds):
    init_sqlite()
    
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # 1. Get users with the specified notify_me setting
            cur.execute("SELECT id, email, username FROM users WHERE notify_me = %s", (notify_type,))
            users = cur.fetchall()

            for user_id, email, username in users:
                if not email:
                    continue

                # 2. Per-user throttle
                now = time.time()
                res = _sqlite_conn.execute("SELECT MAX(notified_at) FROM notified WHERE user_id = ?", (user_id,)).fetchone()
                last_user_notif = res[0] if res and res[0] else 0
                if now - last_user_notif < throttle_seconds:
                    continue

                # 3. Find albums with updates (owned or subscribed)
                # In the new schema, every relevant relationship (owner or subscriber) 
                # has a record in the subscription table.
                cur.execute("""
                    SELECT a.id, a.name, a.code, a.modified_at, s.opened_at
                    FROM subscription s
                    JOIN albums a ON s.album_id = a.id
                    WHERE s.user_id = %s
                """, (user_id,))
                all_relevant_albums = cur.fetchall()

                pending_albums = []
                for alb_id, name, code, mod_at, open_at in all_relevant_albums:
                    if not mod_at:
                        continue
                    
                    mod_ts = mod_at.timestamp()
                    open_ts = open_at.timestamp() if open_at else 0
                    
                    # If user has already opened the latest version, no need to notify
                    if mod_ts <= open_ts:
                        continue

                    # Skip if all new photos were posted by the user themselves
                    cur.execute("""
                        SELECT 1 FROM photos 
                        WHERE album_id = %s 
                          AND (created_at > %s OR %s IS NULL)
                          AND user_id != %s
                        LIMIT 1
                    """, (alb_id, open_at, open_at, user_id))
                    has_others_photos = cur.fetchone() is not None
                    
                    if not has_others_photos:
                        continue
                        
                    # Check if we already notified about this version
                    row_id = f"{user_id}--{alb_id}"
                    res = _sqlite_conn.execute("SELECT modified_at FROM notified WHERE \"index\" = ?", (row_id,)).fetchone()
                    last_notified_mod_ts = res[0] if res else 0
                    
                    if mod_ts > last_notified_mod_ts:
                        pending_albums.append({
                            'id': alb_id,
                            'name': name,
                            'code': code,
                            'mod_ts': mod_ts,
                            'open_ts': open_ts
                        })

                if pending_albums:
                    # 4. Send email
                    album_list = "\n".join([f"- {a['name']} (https://shareshot.eu/album/{a['code']})" for a in pending_albums])
                    subject = "New photos in your albums!"
                    if notify_type == "daily":
                        body = f"Hi {username},\n\nHere is your daily summary of new photos in your albums:\n\n{album_list}\n\nCheck them out!"
                    else:
                        body = f"Hi {username},\n\nYou have new photos in the following albums:\n\n{album_list}\n\nCheck them out!"

                    print(f"Notifying {username} ({notify_type}) about {len(pending_albums)} updated albums")
                    if send_email(email, subject, body):
                        # 5. Update SQLite
                        for a in pending_albums:
                            row_id = f"{user_id}--{a['id']}"
                            _sqlite_conn.execute("""
                                INSERT OR REPLACE INTO notified ("index", user_id, album_id, modified_at, opened_at, notified_at)
                                VALUES (?, ?, ?, ?, ?, ?)
                            """, (row_id, user_id, a['id'], a['mod_ts'], a['open_ts'], now))
                        _sqlite_conn.commit()


if __name__ == "__main__":
    print("Starting album notification service...")
    try:
        while True:
            check_customers()
            check_daily_customers()
            time.sleep(180)
    except KeyboardInterrupt:
        print("Stopping service...")
    finally:
        close_pool()
        if _sqlite_conn:
            _sqlite_conn.close()