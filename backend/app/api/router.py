from fastapi import APIRouter

from app.api.routes import auth, users, conversations, personas, health

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(conversations.router)
api_router.include_router(personas.router)
api_router.include_router(health.router)
