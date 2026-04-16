---
name: ml-pipeline
description: Develop ML models for transaction categorization, receipt parsing, anomaly detection, spending forecasting, or LLM insights. Use when building or updating AI/ML features.
allowed-tools: Read Write Edit Glob Grep Bash(python *) Bash(pytest *)
---

# ML Pipeline Development

Build and maintain ML models for SpendSmart's AI features.

## ML Models Overview

| Model | Task | Framework | Location |
|-------|------|-----------|----------|
| TF-IDF + LogReg | Transaction categorization (fast) | scikit-learn | `apps/api/app/ml/categorizer.py` |
| DistilBERT | Transaction categorization (fallback) | HuggingFace | `apps/api/app/ml/categorizer_bert.py` |
| Isolation Forest | Spending anomaly detection | scikit-learn | `apps/api/app/ml/anomaly.py` |
| Prophet/ARIMA | Spending forecasting | Prophet/statsmodels | `apps/api/app/ml/forecaster.py` |
| Tesseract + Florence-2 | Receipt OCR + extraction | Tesseract/HF | `apps/api/app/ml/receipt_parser.py` |
| Llama 3 / Mistral | Natural language insights | Ollama/HF | `apps/api/app/ml/insights_engine.py` |

## 1. Transaction Categorizer

### Model Architecture

```python
# apps/api/app/ml/categorizer.py
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
from typing import Tuple, List, Optional
import logging

logger = logging.getLogger(__name__)

class TransactionCategorizer:
    """Two-tier transaction categorization system."""

    def __init__(self, model_path: str = "ml_models/categorizer"):
        self.model_path = model_path
        self.fast_model: Optional[Pipeline] = None
        self.categories: List[str] = []
        self.confidence_threshold = 0.85

    def train(self, descriptions: List[str], categories: List[str]) -> dict:
        """Train the TF-IDF + Logistic Regression model."""
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            descriptions, categories, test_size=0.2, random_state=42
        )

        # Create pipeline
        self.fast_model = Pipeline([
            ('tfidf', TfidfVectorizer(
                max_features=5000,
                ngram_range=(1, 2),
                min_df=2,
                max_df=0.95,
                strip_accents='unicode',
                lowercase=True,
            )),
            ('clf', LogisticRegression(
                max_iter=1000,
                multi_class='multinomial',
                class_weight='balanced',
            ))
        ])

        # Train
        self.fast_model.fit(X_train, y_train)
        self.categories = list(set(categories))

        # Evaluate
        y_pred = self.fast_model.predict(X_test)
        report = classification_report(y_test, y_pred, output_dict=True)

        # Save model
        self.save()

        return {
            "accuracy": report["accuracy"],
            "samples_trained": len(X_train),
            "samples_tested": len(X_test),
            "categories": len(self.categories),
        }

    def predict(self, description: str) -> Tuple[str, float]:
        """Predict category with confidence score."""
        if not self.fast_model:
            self.load()

        # Clean input
        cleaned = self._preprocess(description)

        # Get prediction probabilities
        proba = self.fast_model.predict_proba([cleaned])[0]
        max_idx = proba.argmax()
        confidence = proba[max_idx]
        category = self.fast_model.classes_[max_idx]

        return category, confidence

    def predict_with_fallback(self, description: str) -> dict:
        """Use fast model, fallback to BERT if confidence is low."""
        category, confidence = self.predict(description)

        if confidence >= self.confidence_threshold:
            return {
                "category": category,
                "confidence": confidence,
                "model": "tfidf_logreg",
                "needs_review": False,
            }

        # Fallback to BERT for low-confidence predictions
        from app.ml.categorizer_bert import BertCategorizer
        bert = BertCategorizer()
        bert_category, bert_confidence = bert.predict(description)

        return {
            "category": bert_category,
            "confidence": bert_confidence,
            "model": "distilbert",
            "needs_review": bert_confidence < 0.7,
        }

    def _preprocess(self, text: str) -> str:
        """Clean transaction description."""
        import re
        # Remove numbers, special chars
        text = re.sub(r'[0-9#*]+', ' ', text)
        # Remove common transaction noise
        noise_patterns = [
            r'\bXXXX\d+\b', r'\b\d{4}\b', r'\bVISA\b', r'\bMASTERCARD\b',
            r'\bDEBIT\b', r'\bCREDIT\b', r'\bPOS\b', r'\bACH\b',
        ]
        for pattern in noise_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        return ' '.join(text.split()).lower()

    def save(self):
        """Save model to disk."""
        joblib.dump({
            'model': self.fast_model,
            'categories': self.categories,
        }, f"{self.model_path}/model.joblib")

    def load(self):
        """Load model from disk."""
        data = joblib.load(f"{self.model_path}/model.joblib")
        self.fast_model = data['model']
        self.categories = data['categories']
```

### Training Script

```python
# apps/api/training/train_categorizer.py
import asyncio
from sqlalchemy import select
from app.db.session import async_session
from app.db.models import Expense, UserCorrection
from app.ml.categorizer import TransactionCategorizer

async def load_training_data():
    """Load labeled transactions from database."""
    async with async_session() as db:
        # Get confirmed categorizations (user didn't correct)
        confirmed = await db.execute(
            select(Expense.description, Expense.category.name)
            .where(Expense.ml_category_confidence >= 0.9)
        )

        # Get user corrections (high-quality labels)
        corrections = await db.execute(
            select(UserCorrection.description, UserCorrection.corrected_category)
        )

        descriptions = []
        categories = []

        for desc, cat in confirmed.all():
            descriptions.append(desc)
            categories.append(cat)

        for desc, cat in corrections.all():
            descriptions.append(desc)
            categories.append(cat)

        return descriptions, categories

async def main():
    descriptions, categories = await load_training_data()

    if len(descriptions) < 100:
        print("Not enough data for training. Need at least 100 samples.")
        return

    categorizer = TransactionCategorizer()
    metrics = categorizer.train(descriptions, categories)

    print(f"Training complete!")
    print(f"Accuracy: {metrics['accuracy']:.2%}")
    print(f"Samples: {metrics['samples_trained']} train, {metrics['samples_tested']} test")
    print(f"Categories: {metrics['categories']}")

if __name__ == "__main__":
    asyncio.run(main())
```

## 2. Anomaly Detection

```python
# apps/api/app/ml/anomaly.py
from sklearn.ensemble import IsolationForest
import numpy as np
from typing import List, Dict
from datetime import datetime, timedelta
from decimal import Decimal

class SpendingAnomalyDetector:
    """Detect unusual spending patterns using Isolation Forest."""

    def __init__(self, contamination: float = 0.1):
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100,
        )
        self.is_fitted = False

    def fit(self, user_expenses: List[Dict]) -> None:
        """Fit model on user's historical expenses."""
        if len(user_expenses) < 30:
            raise ValueError("Need at least 30 expenses to detect anomalies")

        features = self._extract_features(user_expenses)
        self.model.fit(features)
        self.is_fitted = True

    def detect(self, expense: Dict, history: List[Dict]) -> Dict:
        """Check if a single expense is anomalous."""
        if not self.is_fitted:
            self.fit(history)

        features = self._extract_features([expense])
        prediction = self.model.predict(features)[0]
        score = self.model.decision_function(features)[0]

        is_anomaly = prediction == -1

        if is_anomaly:
            reason = self._explain_anomaly(expense, history)
        else:
            reason = None

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": float(score),
            "reason": reason,
        }

    def _extract_features(self, expenses: List[Dict]) -> np.ndarray:
        """Extract features for anomaly detection."""
        features = []
        for exp in expenses:
            features.append([
                float(exp["amount"]),
                exp["expense_date"].weekday(),  # Day of week
                exp["expense_date"].day,         # Day of month
                exp["expense_date"].hour if hasattr(exp["expense_date"], "hour") else 12,
                hash(exp.get("category", "")) % 100,  # Category encoding
            ])
        return np.array(features)

    def _explain_anomaly(self, expense: Dict, history: List[Dict]) -> str:
        """Generate human-readable explanation for anomaly."""
        amount = float(expense["amount"])
        category = expense.get("category", "Unknown")

        # Calculate stats for this category
        category_expenses = [
            float(e["amount"]) for e in history
            if e.get("category") == category
        ]

        if category_expenses:
            avg = np.mean(category_expenses)
            std = np.std(category_expenses) or 1

            if amount > avg + 2 * std:
                return f"Spent ${amount:.2f} on {category} — that's {(amount/avg - 1)*100:.0f}% higher than your average of ${avg:.2f}"

        # Check for unusual day
        day = expense["expense_date"].strftime("%A")
        return f"Unusual ${amount:.2f} {category} expense on {day}"
```

## 3. Spending Forecaster

```python
# apps/api/app/ml/forecaster.py
from prophet import Prophet
import pandas as pd
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from decimal import Decimal

class SpendingForecaster:
    """Forecast monthly spending using Prophet."""

    def __init__(self):
        self.model: Optional[Prophet] = None

    def fit(self, expenses: List[Dict]) -> None:
        """Fit Prophet model on expense history."""
        # Aggregate daily spending
        df = pd.DataFrame(expenses)
        df['ds'] = pd.to_datetime(df['expense_date'])
        df['y'] = df['amount'].astype(float)
        daily = df.groupby('ds')['y'].sum().reset_index()

        # Fit Prophet
        self.model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
        )
        self.model.fit(daily)

    def forecast_month_end(self, current_date: datetime) -> Dict:
        """Predict total spending by end of month."""
        if not self.model:
            raise ValueError("Model not fitted. Call fit() first.")

        # Days remaining in month
        days_in_month = (
            (current_date.replace(month=current_date.month % 12 + 1, day=1) - timedelta(days=1)).day
        )
        days_remaining = days_in_month - current_date.day

        # Create future dataframe
        future = self.model.make_future_dataframe(periods=days_remaining)
        forecast = self.model.predict(future)

        # Sum predicted spending for remaining days
        remaining_forecast = forecast.tail(days_remaining)['yhat'].sum()

        return {
            "days_remaining": days_remaining,
            "predicted_remaining": float(remaining_forecast),
            "predicted_daily_avg": float(remaining_forecast / days_remaining) if days_remaining > 0 else 0,
            "confidence_interval": {
                "lower": float(remaining_forecast * 0.85),
                "upper": float(remaining_forecast * 1.15),
            }
        }

    def forecast_investable_surplus(
        self,
        monthly_income: Decimal,
        expenses: List[Dict],
        savings_goal_contributions: Decimal,
    ) -> Dict:
        """Calculate investable surplus after expenses and savings."""
        forecast = self.forecast_month_end(datetime.now())

        total_expenses = sum(float(e["user_share"]) for e in expenses)
        predicted_total = total_expenses + forecast["predicted_remaining"]

        surplus = float(monthly_income) - predicted_total - float(savings_goal_contributions)

        return {
            "monthly_income": float(monthly_income),
            "current_expenses": total_expenses,
            "predicted_remaining": forecast["predicted_remaining"],
            "predicted_total_expenses": predicted_total,
            "savings_contributions": float(savings_goal_contributions),
            "investable_surplus": max(0, surplus),
            "confidence": "high" if forecast["days_remaining"] < 7 else "medium",
        }
```

## 4. Receipt Parser

```python
# apps/api/app/ml/receipt_parser.py
import pytesseract
from PIL import Image
import io
from typing import Dict, Optional, List
import re
from datetime import datetime

class ReceiptParser:
    """Parse receipt images using OCR + Vision-Language model."""

    def __init__(self, use_vlm: bool = True):
        self.use_vlm = use_vlm

    async def parse(self, image_bytes: bytes) -> Dict:
        """Extract structured data from receipt image."""
        # Step 1: OCR with Tesseract
        image = Image.open(io.BytesIO(image_bytes))
        ocr_text = pytesseract.image_to_string(image)

        # Step 2: Use VLM for structured extraction
        if self.use_vlm:
            structured = await self._extract_with_vlm(image_bytes, ocr_text)
        else:
            structured = self._extract_with_regex(ocr_text)

        # Step 3: Validate and clean
        structured = self._validate(structured)

        return structured

    async def _extract_with_vlm(self, image_bytes: bytes, ocr_text: str) -> Dict:
        """Use Florence-2 or LLaVA to extract structured fields."""
        from app.ml.model_service import get_model_service

        model = get_model_service()

        prompt = f"""Analyze this receipt image and OCR text. Extract:
1. Merchant name
2. Total amount (final amount paid)
3. Subtotal (before tax)
4. Tax amount
5. Date of purchase
6. Individual line items with quantities and prices

OCR Text:
{ocr_text}

Return as JSON:
{{
    "merchant": "store name",
    "total": 0.00,
    "subtotal": 0.00,
    "tax": 0.00,
    "date": "YYYY-MM-DD",
    "currency": "USD",
    "line_items": [
        {{"name": "item", "quantity": 1, "price": 0.00}}
    ]
}}"""

        response = await model.generate_with_image(image_bytes, prompt)
        return self._parse_json_response(response)

    def _extract_with_regex(self, text: str) -> Dict:
        """Fallback: Extract using regex patterns."""
        result = {
            "merchant": None,
            "total": None,
            "subtotal": None,
            "tax": None,
            "date": None,
            "currency": "USD",
            "line_items": [],
        }

        # Extract total (look for TOTAL, GRAND TOTAL, etc.)
        total_patterns = [
            r'(?:TOTAL|GRAND TOTAL|AMOUNT DUE)[:\s]*\$?(\d+\.?\d*)',
            r'\$(\d+\.\d{2})\s*$',
        ]
        for pattern in total_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                result["total"] = float(match.group(1))
                break

        # Extract date
        date_patterns = [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(\d{4}[/-]\d{2}[/-]\d{2})',
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    result["date"] = self._parse_date(match.group(1))
                    break
                except:
                    pass

        # Extract merchant (usually first line)
        lines = text.strip().split('\n')
        if lines:
            result["merchant"] = lines[0].strip()

        return result

    def _validate(self, data: Dict) -> Dict:
        """Validate and clean extracted data."""
        # Ensure total is positive
        if data.get("total") and data["total"] < 0:
            data["total"] = abs(data["total"])

        # Validate date
        if data.get("date"):
            try:
                datetime.strptime(data["date"], "%Y-%m-%d")
            except:
                data["date"] = datetime.now().strftime("%Y-%m-%d")

        # Calculate tax if missing
        if data.get("subtotal") and data.get("total") and not data.get("tax"):
            data["tax"] = round(data["total"] - data["subtotal"], 2)

        return data

    def _parse_date(self, date_str: str) -> str:
        """Parse various date formats to YYYY-MM-DD."""
        formats = ["%m/%d/%Y", "%m-%d-%Y", "%Y-%m-%d", "%m/%d/%y", "%d/%m/%Y"]
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
            except:
                continue
        return datetime.now().strftime("%Y-%m-%d")

    def _parse_json_response(self, response: str) -> Dict:
        """Parse JSON from model response."""
        import json
        # Find JSON in response
        start = response.find('{')
        end = response.rfind('}') + 1
        if start != -1 and end > start:
            try:
                return json.loads(response[start:end])
            except:
                pass
        return {}
```

## 5. Model Service Abstraction

```python
# apps/api/app/ml/model_service.py
from abc import ABC, abstractmethod
from typing import Optional
import os

class ModelService(ABC):
    """Abstract base for model serving (Ollama vs HuggingFace)."""

    @abstractmethod
    async def generate(self, prompt: str) -> str:
        pass

    @abstractmethod
    async def generate_with_image(self, image_bytes: bytes, prompt: str) -> str:
        pass

class OllamaService(ModelService):
    """Local model serving via Ollama."""

    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.text_model = "llama3"
        self.vision_model = "llava"

    async def generate(self, prompt: str) -> str:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={"model": self.text_model, "prompt": prompt},
                timeout=60.0,
            )
            return response.json()["response"]

    async def generate_with_image(self, image_bytes: bytes, prompt: str) -> str:
        import httpx
        import base64
        image_b64 = base64.b64encode(image_bytes).decode()
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.vision_model,
                    "prompt": prompt,
                    "images": [image_b64],
                },
                timeout=120.0,
            )
            return response.json()["response"]

class HuggingFaceService(ModelService):
    """Hosted model serving via HuggingFace Inference API."""

    def __init__(self, api_token: str):
        self.api_token = api_token
        self.text_model = "meta-llama/Llama-3-8B-Instruct"
        self.vision_model = "microsoft/Florence-2-large"

    async def generate(self, prompt: str) -> str:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api-inference.huggingface.co/models/{self.text_model}",
                headers={"Authorization": f"Bearer {self.api_token}"},
                json={"inputs": prompt},
                timeout=60.0,
            )
            return response.json()[0]["generated_text"]

    async def generate_with_image(self, image_bytes: bytes, prompt: str) -> str:
        # Use Florence-2 for vision tasks
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api-inference.huggingface.co/models/{self.vision_model}",
                headers={"Authorization": f"Bearer {self.api_token}"},
                files={"image": image_bytes},
                data={"prompt": prompt},
                timeout=120.0,
            )
            return response.json()

def get_model_service() -> ModelService:
    """Factory function to get the appropriate model service."""
    runtime = os.getenv("ML_RUNTIME", "ollama")

    if runtime == "huggingface":
        token = os.getenv("HF_API_TOKEN")
        if not token:
            raise ValueError("HF_API_TOKEN required for HuggingFace runtime")
        return HuggingFaceService(token)
    else:
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        return OllamaService(base_url)
```

## Testing ML Models

```python
# apps/api/tests/ml/test_categorizer.py
import pytest
from app.ml.categorizer import TransactionCategorizer

@pytest.fixture
def categorizer():
    cat = TransactionCategorizer(model_path="tests/fixtures/ml_models")
    cat.train(
        descriptions=["starbucks coffee", "uber ride", "walmart groceries", "netflix subscription"],
        categories=["Food", "Transport", "Groceries", "Entertainment"],
    )
    return cat

def test_categorizer_predicts_food(categorizer):
    category, confidence = categorizer.predict("mcdonald's")
    assert category == "Food"
    assert confidence > 0.5

def test_categorizer_predicts_transport(categorizer):
    category, confidence = categorizer.predict("lyft ride")
    assert category == "Transport"

def test_categorizer_handles_noise(categorizer):
    # Transaction with lots of noise
    category, confidence = categorizer.predict("VISA XXXX1234 POS STARBUCKS #12345")
    assert category == "Food"

def test_categorizer_returns_confidence(categorizer):
    _, confidence = categorizer.predict("unknown merchant xyz")
    assert 0 <= confidence <= 1
```

## Checklist
- [ ] Model architecture chosen
- [ ] Training data pipeline created
- [ ] Model trained and evaluated
- [ ] Model saved/versioned
- [ ] Inference code with proper error handling
- [ ] Confidence thresholds set
- [ ] Fallback behavior implemented
- [ ] Model service abstraction (Ollama/HF)
- [ ] Unit tests written
- [ ] Golden dataset for regression testing
- [ ] Monitoring metrics defined
