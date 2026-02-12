import asyncio

from arq.connections import RedisSettings


# 1. Define your background task
async def say_hello(ctx, name: str):
    await asyncio.sleep(2)  # Simulate a heavy task
    print(f"Hello, {name}!")
    return f"Said hello to {name}"


# 2. Worker settings
class WorkerSettings:
    functions = [say_hello]
    # Connect to the Redis Docker container we set up earlier
    redis_settings = RedisSettings(host="localhost", port=6379)
