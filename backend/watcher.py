import asyncio

import env
import redis.asyncio as redis
from fastapi import WebSocket

redis_client = redis.from_url(env.REDIS_URL, decode_responses=True)


class Watcher:
    """Simple Pub/Sub manager for WebSocket connections.

    Each WebSocket is associated with exactly one *subject* – the channel
    name it is subscribed to.  When a message is published to that subject
    on Redis, it is forwarded to the WebSocket.  The manager keeps track of
    which WebSocket belongs to which subject so that a connection can change
    its subject (e.g. from ``albums-{username}`` to ``album-{code}``).
    """

    def __init__(self):
        # Map a websocket to the subject it is currently listening on.
        self._websocket_subject: dict[WebSocket, str] = {}
        # Map subject -> set of websockets.
        self._subject_targets: dict[str, set[WebSocket]] = {}
        # Map subject -> listener task.
        self._subject_listeners: dict[str, asyncio.Task] = {}

    async def _listener(self, subject: str) -> None:
        """Internal task that listens to Redis for *subject* and forwards
        messages to all websockets subscribed to that subject."""
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(subject)
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    # Forward to all websockets subscribed to this subject.
                    for ws in list(self._subject_targets.get(subject, set())):
                        try:
                            await ws.send_text(message["data"])
                        except Exception as exc:  # pragma: no cover - defensive
                            # If sending fails (e.g., closed connection), clean up.
                            await self.unsubscribe(ws)
                            print(f"Error sending to websocket: {exc}")
        finally:
            await pubsub.unsubscribe(subject)
            # Remove the listener task reference.
            self._subject_listeners.pop(subject, None)

    async def subscribe(self, websocket: WebSocket, subject: str) -> None:
        """Subscribe *websocket* to *subject*.

        If the websocket was previously subscribed to another subject it is
        moved to the new one."""
        # Remove from old subject if present.
        old_subject = self._websocket_subject.get(websocket)
        if old_subject and old_subject != subject:
            await self.unsubscribe(websocket, old_subject)

        # Register new subject.
        self._websocket_subject[websocket] = subject
        targets = self._subject_targets.setdefault(subject, set())
        targets.add(websocket)

        # Ensure a listener task exists for the subject.
        if subject not in self._subject_listeners:
            self._subject_listeners[subject] = asyncio.create_task(
                self._listener(subject)
            )

    async def unsubscribe(
        self, websocket: WebSocket, subject: str | None = None
    ) -> None:
        """Unsubscribe *websocket* from *subject* (or from its current subject
        if *subject* is None)."""
        if subject is None:
            subject = self._websocket_subject.get(websocket)
        if not subject:
            return
        targets = self._subject_targets.get(subject)
        if targets and websocket in targets:
            targets.discard(websocket)
        self._websocket_subject.pop(websocket, None)
        # If no websockets left for a subject, cancel its listener.
        if targets is not None and not targets:
            task = self._subject_listeners.pop(subject, None)
            if task and not task.done():
                task.cancel()
