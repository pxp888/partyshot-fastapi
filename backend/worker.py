import asyncio

import aws
import env
from arq.connections import RedisSettings
from PIL import Image


# 1. Define your background task
async def say_hello(ctx, name: str):
    await asyncio.sleep(2)  # Simulate a heavy task
    print(f"Hello, {name}!")
    return f"Said hello to {name}"


async def upload_to_s3(ctx, file_path: str, object_name: str):
    s3_up = aws.upload_file_to_s3(file_path, object_name)
    return s3_up


# 2. Worker settings
class WorkerSettings:
    functions = [say_hello]
    # Connect to the Redis Docker container we set up earlier
    redis_settings = RedisSettings(host="localhost", port=6379)
