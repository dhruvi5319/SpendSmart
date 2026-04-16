from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "spendsmart-api",
    }


@router.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "SpendSmart API",
        "version": "1.0.0",
        "docs": "/docs",
    }
