"""
Pydantic schemas for ML endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional


class CategoryPredictionRequest(BaseModel):
    """Request to predict category for an expense description."""
    description: str = Field(..., min_length=1, max_length=500)


class CategoryPrediction(BaseModel):
    """A single category prediction with confidence."""
    category: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class CategoryPredictionResponse(BaseModel):
    """Response from category prediction endpoint."""
    description: str
    predicted_category: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    top_predictions: list[CategoryPrediction]
    category_id: Optional[str] = None  # Populated if category exists in DB


class MLModelStatus(BaseModel):
    """Status information about the ML model."""
    is_loaded: bool
    model_path: str
    model_exists: bool
    categories: list[str]
    training_examples: int


class BatchPredictionRequest(BaseModel):
    """Request to predict categories for multiple descriptions."""
    descriptions: list[str] = Field(..., min_length=1, max_length=50)


class BatchPredictionResponse(BaseModel):
    """Response from batch prediction endpoint."""
    predictions: list[CategoryPredictionResponse]
