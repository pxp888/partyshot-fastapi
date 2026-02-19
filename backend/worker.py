import asyncio

import aws
import db
import env
from arq.connections import RedisSettings
from PIL import Image


# 1. Define your background task
async def say_hello(ctx, name: str):
    await asyncio.sleep(2)  # Simulate a heavy task
    print(f"Hello, {name}!")
    return f"Said hello to {name}"


async def check_photo_sizes(ctx, photo_id: int, s3_key: str, thumb_key: str = None):
    print(f"Checking sizes for photo {photo_id}: {s3_key}, {thumb_key}")
    
    # Run blocking S3 calls in threads
    size = await asyncio.to_thread(aws.s3size, s3_key)
    thumb_size = None
    if thumb_key:
        thumb_size = await asyncio.to_thread(aws.s3size, thumb_key)
    
    # Run blocking DB call in thread
    await asyncio.to_thread(db.updatePhotoSizes, photo_id, size, thumb_size)
    
    print(f"Updated sizes for photo {photo_id}: size={size}, thumb_size={thumb_size}")
    return {"photo_id": photo_id, "size": size, "thumb_size": thumb_size}


async def recount_missing_sizes(ctx):
    print("Starting re-count of missing photo sizes...")
    # Fetch list (blocking, but fast)
    photos = await asyncio.to_thread(db.uncountedPhotos)
    print(f"Found {len(photos)} photos with missing sizes.")
    
    count = 0
    for photo_id, s3_key, thumb_key in photos:
        # Run blocking S3/DB calls in threads to keep the worker responsive
        size = await asyncio.to_thread(aws.s3size, s3_key)
        thumb_size = None
        if thumb_key:
            thumb_size = await asyncio.to_thread(aws.s3size, thumb_key)
        
        await asyncio.to_thread(db.updatePhotoSizes, photo_id, size, thumb_size)
        
        count += 1
        if count % 10 == 0:
            print(f"Processed {count}/{len(photos)} photos...")

        # Pace the task - 0.1s ensures we don't hog the CPU/Network
        await asyncio.sleep(0.1) 
            
    print(f"Re-count completed. Updated {count} photos.")
    return {"updated": count}


# 2. Worker settings
class WorkerSettings:
    functions = [say_hello, check_photo_sizes, recount_missing_sizes]
    # Connect to the Redis Docker container we set up earlier
    redis_settings = RedisSettings(host=env.REDIS_URL2, port=6379)
