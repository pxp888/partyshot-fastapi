import asyncio
import logging

import aws
import db
import env
from arq.connections import RedisSettings
from PIL import Image


logging.basicConfig(level=logging.ERROR, format='%(asctime)s - %(levelname)s - %(message)s')

# 1. Define your background task
async def say_hello(ctx, name: str):
    await asyncio.sleep(2)  # Simulate a heavy task
    logging.info("Hello, %s!", name)
    return f"Said hello to {name}"


async def check_photo_sizes(ctx, photo_id: int, s3_key: str, thumb_key: str = None, mid_key: str = None):
    # print(f"Checking sizes for photo {photo_id}: {s3_key}, {thumb_key}")
    
    # Run blocking S3 calls in threads
    size = await asyncio.to_thread(aws.s3size, s3_key)
    thumb_size = None
    if thumb_key:
        thumb_size = await asyncio.to_thread(aws.s3size, thumb_key)
    mid_size = None
    if mid_key:
        mid_size = await asyncio.to_thread(aws.s3size, mid_key)
    
    # Run blocking DB call in thread
    await asyncio.to_thread(db.updatePhotoSizes, photo_id, size, thumb_size, mid_size)
    
    logging.info("Updated sizes for photo %s: size=%s, thumb_size=%s, mid_size=%s", photo_id, size, thumb_size, mid_size)
    return {"photo_id": photo_id, "size": size, "thumb_size": thumb_size, "mid_size": mid_size}


async def recount_missing_sizes(ctx):
    logging.info("Starting re-count of missing photo sizes...")
    # Fetch list (blocking, but fast)
    photos = await asyncio.to_thread(db.uncountedPhotos)
    logging.info("Found %s photos with missing sizes.", len(photos))
    
    count = 0
    for photo_id, s3_key, thumb_key, mid_key in photos:
        # Run blocking S3/DB calls in threads to keep the worker responsive
        size = await asyncio.to_thread(aws.s3size, s3_key)
        thumb_size = None
        if thumb_key:
            thumb_size = await asyncio.to_thread(aws.s3size, thumb_key)
        mid_size = None
        if mid_key:
            mid_size = await asyncio.to_thread(aws.s3size, mid_key)
        
        await asyncio.to_thread(db.updatePhotoSizes, photo_id, size, thumb_size, mid_size)
        
        count += 1
        if count % 10 == 0:
            logging.info("Processed %s/%s photos...", count, len(photos))

        # Pace the task - 0.1s ensures we don't hog the CPU/Network
        await asyncio.sleep(0.1) 
            
    logging.info("Re-count completed. Updated %s photos.", count)
    return {"updated": count}


async def delete_s3_object(ctx, key: str):
    if key:
        logging.info("Deleting %s from S3", key)
        await asyncio.to_thread(aws.delete_file_from_s3, key)
    return True


async def record_atomic_photo(
    ctx,
    photo_id: int,
    user_id: int,
    album_id: int,
    size: int,
    filename: str,
    action: str,
):
    """Background task to record atomic photo transactions."""
    await asyncio.to_thread(
        db.recordAtomicPhoto, photo_id, user_id, album_id, size, filename, action
    )
    return True


async def startup(ctx):
    db.init_pool()


async def shutdown(ctx):
    db.close_pool()


# 2. Worker settings
class WorkerSettings:
    functions = [
        say_hello,
        check_photo_sizes,
        recount_missing_sizes,
        delete_s3_object,
        db.cleanup2,
        record_atomic_photo,
    ]
    # Connect to the Redis Docker container we set up earlier
    redis_settings = RedisSettings(host=env.REDIS_URL2, port=6379)
    on_startup = startup
    on_shutdown = shutdown
