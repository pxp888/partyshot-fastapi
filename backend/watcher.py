import asyncio
import time

import env
import redis.asyncio as redis
from fastapi import WebSocket

redis_client = redis.from_url(env.REDIS_URL, decode_responses=True)


class Watcher:
    """Pub/Sub manager for WebSocket connections.

    Each WebSocket can be associated with multiple *subjects*.
    When a message is published to any of those subjects on Redis,
    it is forwarded to the WebSocket.
    Subscriptions have a 10-minute expiration by default.
    """

    def __init__(self):
        # Map websocket -> { subject: expiration_timestamp }
        self._websocket_subscriptions: dict[WebSocket, dict[str, float]] = {}
        # Map subject -> set of websockets.
        self._subject_targets: dict[str, set[WebSocket]] = {}
        # Map subject -> listener task.
        self._subject_listeners: dict[str, asyncio.Task] = {}
        # Background task for cleanup
        self._cleanup_task = None

    async def _cleanup_loop(self) -> None:
        """Periodic task to remove expired subscriptions."""
        while True:
            try:
                await asyncio.sleep(60)
                now = time.time()
                # Iterate over a copy of the keys because we'll be modifying the dict.
                for ws in list(self._websocket_subscriptions.keys()):
                    subs = self._websocket_subscriptions.get(ws, {})
                    expired_subjects = [s for s, expire in subs.items() if expire < now]
                    for subject in expired_subjects:
                        await self.unsubscribe(ws, subject)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in Watcher cleanup loop: {e}")

    async def _listener(self, subject: str) -> None:
        """Internal task that listens to Redis for *subject* and forwards
        messages to all websockets subscribed to that subject."""
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(subject)
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    # Forward to all websockets currently subscribed to this subject.
                    targets = list(self._subject_targets.get(subject, set()))
                    for ws in targets:
                        try:
                            # Verify it hasn't expired since the last check
                            subs = self._websocket_subscriptions.get(ws, {})
                            if subject in subs and subs[subject] > time.time():
                                await ws.send_text(message["data"])
                            elif subject in subs:
                                # Connection still exists but this sub expired
                                await self.unsubscribe(ws, subject)
                        except Exception as exc:
                            await self.unsubscribe(ws)
                            print(f"Error sending to websocket: {exc}")
        finally:
            await pubsub.unsubscribe(subject)
            self._subject_listeners.pop(subject, None)

    async def subscribe(self, websocket: WebSocket, subject: str) -> None:
        """Subscribe *websocket* to *subject* with a 10-minute expiration."""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

        now = time.time()
        expiration = now + 600  # 10 minutes

        subs = self._websocket_subscriptions.setdefault(websocket, {})
        subs[subject] = expiration

        targets = self._subject_targets.setdefault(subject, set())
        targets.add(websocket)

        if subject not in self._subject_listeners:
            self._subject_listeners[subject] = asyncio.create_task(
                self._listener(subject)
            )

    async def keep_alive(self, websocket: WebSocket, subjects: list[str]) -> None:
        """Refresh specified subscriptions for this websocket for another 10 minutes."""
        subs = self._websocket_subscriptions.get(websocket)
        if subs:
            now = time.time()
            for subject in subjects:
                if subject in subs:
                    subs[subject] = now + 600

    async def unsubscribe(
        self, websocket: WebSocket, subject: str | None = None
    ) -> None:
        """Unsubscribe *websocket* from *subject* (or from ALL if *subject* is None)."""
        if subject is None:
            # Unsubscribe from ALL subjects for this websocket
            subs = self._websocket_subscriptions.pop(websocket, {})
            for sub in list(subs.keys()):
                targets = self._subject_targets.get(sub)
                if targets:
                    targets.discard(websocket)
                    if not targets:
                        task = self._subject_listeners.pop(sub, None)
                        if task and not task.done():
                            task.cancel()
            return

        # Unsubscribe from a specific subject
        subs = self._websocket_subscriptions.get(websocket)
        if subs:
            subs.pop(subject, None)
            if not subs:
                self._websocket_subscriptions.pop(websocket, None)

        targets = self._subject_targets.get(subject)
        if targets:
            targets.discard(websocket)
            if not targets:
                task = self._subject_listeners.pop(subject, None)
                if task and not task.done():
                    task.cancel()
