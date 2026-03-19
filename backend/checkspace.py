import os
import sys
import psycopg2
from contextlib import contextmanager

# Add current directory to path so we can import env
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    import env3 as env 
except ImportError:
    print("Could not import env.py. Make sure this script is in the backend directory.")
    sys.exit(1)

def get_db_connection():
    return psycopg2.connect(
        host=env.DB_HOST,
        port=env.DB_PORT,
        dbname=env.DB_NAME,
        user=env.DB_USER,
        password=env.DB_PASSWORD,
    )

def check_space():
    query = """
        SELECT 
            u.id, 
            u.username,
            COALESCE(su.space, 0) as actual_space,
            COALESCE(sum_photos.calc_space, 0) as calculated_space,
            COALESCE(sum_photos.photo_count, 0) as photo_count,
            COALESCE(sum_photos.total_thumb_size, 0) as calculated_thumb_space,
            COALESCE(sum_photos.total_mid_size, 0) as calculated_mid_space
        FROM users u
        LEFT JOIN spaceused su ON u.id = su.user_id
        LEFT JOIN (
            SELECT 
                a.user_id, 
                SUM(COALESCE(p.size, 0)) as calc_space, 
                COUNT(p.id) as photo_count,
                SUM(COALESCE(p.thumb_size, 0)) as total_thumb_size,
                SUM(COALESCE(p.mid_size, 0)) as total_mid_size
            FROM albums a
            JOIN photos p ON a.id = p.album_id
            WHERE p.deleted_at IS NULL
            GROUP BY a.user_id
        ) sum_photos ON u.id = sum_photos.user_id
        WHERE su.space IS NOT NULL OR sum_photos.calc_space IS NOT NULL
        ORDER BY u.id;
    """

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

        print(f"{'Username':<15} | {'Actual (DB)':<12} | {'Calc (Orig)':<12} | {'Diff':<10} | {'Thumb':<10} | {'Mid':<10} | {'Total':<12}")
        print("-" * 100)
        
        total_actual = 0
        total_calc = 0
        total_thumb = 0
        total_mid = 0
        
        for row in rows:
            uid, username, actual, calc, count, thumb, mid = row
            diff = actual - calc
            total_sum = calc + thumb + mid
            print(f"{username:<15} | {actual:>12,} | {calc:>12,} | {diff:>10,} | {thumb:>10,} | {mid:>10,} | {total_sum:>12,}")
            total_actual += actual
            total_calc += calc
            total_thumb += thumb
            total_mid += mid
            
        print("-" * 100)
        print(f"{'TOTAL':<15} | {total_actual:>12,} | {total_calc:>12,} | {total_actual - total_calc:>10,} | {total_thumb:>10,} | {total_mid:>10,} | {total_calc + total_thumb + total_mid:>12,}")

    except Exception as e:
        print(f"Error checking space: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

def fix_space():
    print("Fixing spaceused table...")
    update_query = """
        WITH calculated AS (
            SELECT 
                a.user_id, 
                SUM(COALESCE(p.size, 0)) as total_size
            FROM albums a
            JOIN photos p ON a.id = p.album_id
            WHERE p.deleted_at IS NULL
            GROUP BY a.user_id
        )
        INSERT INTO spaceused (user_id, space)
        SELECT user_id, total_size FROM calculated
        ON CONFLICT (user_id) DO UPDATE
        SET space = EXCLUDED.space;
    """
    
    # We also want to reset anyone who has 0 usage but is not in the calculated set
    reset_others_query = """
        UPDATE spaceused su
        SET space = 0
        WHERE NOT EXISTS (
            SELECT 1 FROM albums a
            JOIN photos p ON a.id = p.album_id
            WHERE a.user_id = su.user_id AND p.deleted_at IS NULL
        );
    """

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            print("Resetting unused space records to 0...")
            cursor.execute(reset_others_query)
            print("Syncing calculated space to spaceused...")
            cursor.execute(update_query)
        conn.commit()
        print("Success: Space records fixed.")
    except Exception as e:
        print(f"Error fixing space: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    if "-fix" in sys.argv:
        # First show current state
        print("Current state before fix:")
        check_space()
        print("\n" + "="*80 + "\n")
        
        # Then fix
        fix_space()
        
        # Then show result
        print("\n" + "="*80 + "\n")
        print("Final state after fix:")
        check_space()
    else:
        check_space()
        print("\nTip: Run with '-fix' to synchronize spaceused table with calculated sizes.")
