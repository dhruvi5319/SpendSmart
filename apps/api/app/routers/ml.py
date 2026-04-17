"""
ML API endpoints for expense categorization and predictions.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db.session import get_db
from ..db.models.category import Category
from ..auth.dependencies import get_current_user
from ..db.models.user import User
from ..models.ml import (
    CategoryPredictionRequest,
    CategoryPredictionResponse,
    CategoryPrediction,
    MLModelStatus,
    BatchPredictionRequest,
    BatchPredictionResponse,
)
from ..ml.categorization import get_predictor, predict_category

router = APIRouter(prefix="/api/v1/ml", tags=["ML"])


async def get_category_id_by_name(
    db: AsyncSession, user_id: str, category_name: str
) -> str | None:
    """Look up category ID by name for the user."""
    query = select(Category).where(
        Category.name == category_name,
        (Category.user_id == user_id) | (Category.user_id.is_(None))
    )
    result = await db.execute(query)
    category = result.scalar_one_or_none()
    return str(category.id) if category else None


@router.post("/categorize", response_model=CategoryPredictionResponse)
async def categorize_expense(
    request: CategoryPredictionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Predict the category for an expense description.

    Uses ML to suggest the most likely category based on the description text.
    Returns the top predictions with confidence scores.
    """
    try:
        predictor = get_predictor()
        result = predictor.predict(request.description)
        top_predictions = predictor.predict_top_n(request.description, n=3)

        # Look up category ID
        category_id = await get_category_id_by_name(
            db, str(current_user.id), result["category"]
        )

        return CategoryPredictionResponse(
            description=request.description,
            predicted_category=result["category"],
            confidence=result["confidence"],
            top_predictions=[
                CategoryPrediction(category=p["category"], confidence=p["confidence"])
                for p in top_predictions
            ],
            category_id=category_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/categorize/batch", response_model=BatchPredictionResponse)
async def categorize_expenses_batch(
    request: BatchPredictionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Predict categories for multiple expense descriptions at once.

    Useful for bulk imports or CSV processing.
    Limited to 50 descriptions per request.
    """
    try:
        predictor = get_predictor()
        predictions = []

        for description in request.descriptions:
            result = predictor.predict(description)
            top_predictions = predictor.predict_top_n(description, n=3)
            category_id = await get_category_id_by_name(
                db, str(current_user.id), result["category"]
            )

            predictions.append(
                CategoryPredictionResponse(
                    description=description,
                    predicted_category=result["category"],
                    confidence=result["confidence"],
                    top_predictions=[
                        CategoryPrediction(category=p["category"], confidence=p["confidence"])
                        for p in top_predictions
                    ],
                    category_id=category_id,
                )
            )

        return BatchPredictionResponse(predictions=predictions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@router.get("/status", response_model=MLModelStatus)
async def get_ml_status(
    current_user: User = Depends(get_current_user),
):
    """
    Get the status of the ML categorization model.

    Returns information about whether the model is loaded,
    available categories, and training data size.
    """
    try:
        predictor = get_predictor()
        info = predictor.get_model_info()
        return MLModelStatus(**info)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


@router.post("/retrain")
async def retrain_model(
    current_user: User = Depends(get_current_user),
):
    """
    Retrain the ML model (admin only - future implementation).

    Currently just re-trains on the default dataset.
    Future: Include user corrections as additional training data.
    """
    # TODO: Add admin check
    try:
        predictor = get_predictor()
        predictor._train_model()
        return {"status": "success", "message": "Model retrained successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")
