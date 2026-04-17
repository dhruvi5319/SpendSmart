"""
ML-powered expense categorization using scikit-learn.
Uses TF-IDF vectorization + Multinomial Naive Bayes classifier.
"""

import os
import logging
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from .training_data import get_training_descriptions, get_training_categories, get_category_names

logger = logging.getLogger(__name__)

# Path to save trained model
MODEL_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "category_classifier.pkl"


class CategoryPredictor:
    """
    ML model for predicting expense categories from descriptions.
    Uses a pre-trained global model that works for all users.
    """

    _instance: Optional["CategoryPredictor"] = None
    _model: Optional[Pipeline] = None

    def __new__(cls):
        """Singleton pattern - only one model instance."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize the predictor, loading or training the model."""
        if self._model is None:
            self._load_or_train_model()

    def _load_or_train_model(self):
        """Load existing model or train a new one."""
        if MODEL_PATH.exists():
            try:
                logger.info(f"Loading model from {MODEL_PATH}")
                self._model = joblib.load(MODEL_PATH)
                logger.info("Model loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load model: {e}. Training new model.")
                self._train_model()
        else:
            logger.info("No existing model found. Training new model.")
            self._train_model()

    def _train_model(self):
        """Train the categorization model on the default training data."""
        logger.info("Training expense categorization model...")

        # Get training data
        descriptions = get_training_descriptions()
        categories = get_training_categories()

        logger.info(f"Training on {len(descriptions)} examples")

        # Create the ML pipeline
        self._model = Pipeline([
            ('tfidf', TfidfVectorizer(
                ngram_range=(1, 2),  # Use unigrams and bigrams
                max_features=5000,    # Limit vocabulary size
                stop_words='english', # Remove common words
                lowercase=True,       # Normalize case
                strip_accents='unicode'
            )),
            ('clf', MultinomialNB(alpha=0.1))  # Naive Bayes with smoothing
        ])

        # Split for evaluation
        X_train, X_test, y_train, y_test = train_test_split(
            descriptions, categories, test_size=0.2, random_state=42, stratify=categories
        )

        # Train the model
        self._model.fit(X_train, y_train)

        # Evaluate
        y_pred = self._model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        logger.info(f"Model accuracy: {accuracy:.2%}")

        # Save the model
        self._save_model()

    def _save_model(self):
        """Save the trained model to disk."""
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(self._model, MODEL_PATH)
        logger.info(f"Model saved to {MODEL_PATH}")

    def predict(self, description: str) -> dict:
        """
        Predict category for an expense description.

        Args:
            description: The expense description text

        Returns:
            dict with 'category', 'confidence', and 'all_probabilities'
        """
        if self._model is None:
            raise RuntimeError("Model not initialized")

        # Clean the description
        description = description.strip().lower()

        if not description:
            return {
                "category": "Other",
                "confidence": 0.0,
                "all_probabilities": {}
            }

        # Get prediction and probabilities
        prediction = self._model.predict([description])[0]
        probabilities = self._model.predict_proba([description])[0]

        # Get class names
        classes = self._model.classes_

        # Find confidence for predicted class
        pred_idx = list(classes).index(prediction)
        confidence = float(probabilities[pred_idx])

        # Build probability dict for all classes
        all_probs = {
            cls: float(prob)
            for cls, prob in zip(classes, probabilities)
        }

        # Sort by probability descending
        all_probs = dict(sorted(all_probs.items(), key=lambda x: x[1], reverse=True))

        return {
            "category": prediction,
            "confidence": round(confidence, 4),
            "all_probabilities": all_probs
        }

    def predict_top_n(self, description: str, n: int = 3) -> list:
        """
        Get top N category predictions with probabilities.

        Args:
            description: The expense description text
            n: Number of top predictions to return

        Returns:
            List of dicts with 'category' and 'confidence'
        """
        result = self.predict(description)
        probs = result["all_probabilities"]

        top_n = []
        for category, confidence in list(probs.items())[:n]:
            top_n.append({
                "category": category,
                "confidence": round(confidence, 4)
            })

        return top_n

    def retrain(self, descriptions: list, categories: list):
        """
        Retrain the model with additional data.

        Args:
            descriptions: List of expense descriptions
            categories: List of corresponding categories
        """
        # Combine with existing training data
        all_descriptions = get_training_descriptions() + descriptions
        all_categories = get_training_categories() + categories

        # Retrain
        self._model.fit(all_descriptions, all_categories)
        self._save_model()

        logger.info(f"Model retrained with {len(descriptions)} new examples")

    def get_model_info(self) -> dict:
        """Get information about the current model."""
        return {
            "is_loaded": self._model is not None,
            "model_path": str(MODEL_PATH),
            "model_exists": MODEL_PATH.exists(),
            "categories": get_category_names(),
            "training_examples": len(get_training_descriptions())
        }


# Global instance for easy access
_predictor: Optional[CategoryPredictor] = None


def get_predictor() -> CategoryPredictor:
    """Get or create the global CategoryPredictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = CategoryPredictor()
    return _predictor


def predict_category(description: str) -> dict:
    """
    Convenience function to predict category for a description.

    Args:
        description: The expense description

    Returns:
        dict with 'category', 'confidence', 'all_probabilities'
    """
    predictor = get_predictor()
    return predictor.predict(description)
