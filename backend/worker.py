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
    size = aws.s3size(s3_key)
    thumb_size = None
    if thumb_key:
        thumb_size = aws.s3size(thumb_key)
    
    db.updatePhotoSizes(photo_id, size, thumb_size)
    print(f"Updated sizes for photo {photo_id}: size={size}, thumb_size={thumb_size}")
    return {"photo_id": photo_id, "size": size, "thumb_size": thumb_size}


# 2. Worker settings
class WorkerSettings:
    functions = [say_hello, check_photo_sizes]
    # Connect to the Redis Docker container we set up earlier
    redis_settings = RedisSettings(host=env.REDIS_URL2, port=6379)
