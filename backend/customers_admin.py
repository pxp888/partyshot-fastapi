import os
from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager
import csv

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import env

_pool = None
_db_pool = None

# this file is intended to run independantly of the FastAPI app
# it will output a csv file with the customer summary


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



def get_customer_summary():
    # output a csv file with the following columns:
    # username, email, class, created_at, stripe_customer_id, total Mb, total photos, total albums

    filename = os.path.expanduser("~/customer_summary.csv")
    
    query = """
        SELECT 
            u.username, 
            u.email, 
            u.class, 
            u.created_at, 
            u.stripe_customer_id,
            COALESCE(s.space, 0) / (1024.0 * 1024.0) as total_mb,
            (SELECT COUNT(*) FROM photos p WHERE p.user_id = u.id) as total_photos,
            (SELECT COUNT(*) FROM albums a WHERE a.user_id = u.id) as total_albums
        FROM users u
        LEFT JOIN spaceused s ON u.id = s.user_id
        ORDER BY u.created_at DESC;
    """
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query)
                rows = cursor.fetchall()
                
        with open(filename, mode='w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(['username', 'email', 'class', 'created_at', 'stripe_customer_id', 'total Mb', 'total photos', 'total albums'])
            writer.writerows(rows)
            
        print(f"Customer summary exported to {filename}")
        
    except Exception as e:
        print(f"Error generating customer summary: {e}")

if __name__ == "__main__":
    get_customer_summary()
    close_pool()
