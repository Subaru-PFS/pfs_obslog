import asyncio
from typing import Any, Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import event

from ..database import engine

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self._active_connections: Dict[int, WebSocket] = {}

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._active_connections[id(ws)] = ws

    def disconnect(self, ws: WebSocket):
        self._active_connections.pop(id(ws))

    async def broadcast(self, data: Any):
        for ws in self._active_connections.values():
            asyncio.create_task(ws.send_json(data))


connection_manager = ConnectionManager()


@router.websocket('/api/event')
async def watch_event(ws: WebSocket):
    await connection_manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(ws)


def on_commit(db):
    asyncio.run(connection_manager.broadcast({'type': 'on_commit'}))


event.listen(engine, 'commit', on_commit)
