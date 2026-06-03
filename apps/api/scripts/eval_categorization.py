"""
Evaluation script for the expense-categorization model.

Mirrors the training setup in app/ml/categorization.py exactly (same
pipeline config, same 80/20 stratified split, same random_state=42) so the
reported metrics describe the production model, not a separate one.

Outputs:
  - stdout: accuracy + sklearn classification_report
  - docs/images/confusion_matrix.png: normalized confusion matrix heatmap

Run from apps/api/ with the venv active:
    python scripts/eval_categorization.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

# Make app.* importable when running from apps/api/.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ml.training_data import (
    get_category_names,
    get_training_categories,
    get_training_descriptions,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "docs" / "images"


def build_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=5000,
            stop_words="english",
            lowercase=True,
            strip_accents="unicode",
        )),
        ("clf", MultinomialNB(alpha=0.1)),
    ])


def plot_confusion_matrix(cm: np.ndarray, labels: list[str], output_path: Path) -> None:
    """Save a normalized confusion-matrix heatmap (row-normalized = per-class recall)."""
    cm_normalized = cm.astype(float) / cm.sum(axis=1, keepdims=True)
    cm_normalized = np.nan_to_num(cm_normalized)

    fig, ax = plt.subplots(figsize=(10, 8))
    im = ax.imshow(cm_normalized, cmap="Blues", vmin=0, vmax=1)

    ax.set_xticks(np.arange(len(labels)))
    ax.set_yticks(np.arange(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_yticklabels(labels)
    ax.set_xlabel("Predicted category")
    ax.set_ylabel("True category")
    ax.set_title("Normalized confusion matrix (row = true category)")

    for i in range(len(labels)):
        for j in range(len(labels)):
            value = cm_normalized[i, j]
            if value < 0.01:
                continue
            text_color = "white" if value > 0.5 else "black"
            ax.text(j, i, f"{value:.2f}", ha="center", va="center",
                    color=text_color, fontsize=8)

    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    fig.tight_layout()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    descriptions = get_training_descriptions()
    categories = get_training_categories()
    label_order = get_category_names()

    X_train, X_test, y_train, y_test = train_test_split(
        descriptions,
        categories,
        test_size=0.2,
        random_state=42,
        stratify=categories,
    )

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)

    print(f"Training set size: {len(X_train)}")
    print(f"Test set size:     {len(X_test)}")
    print(f"Total examples:    {len(descriptions)}")
    print(f"Categories:        {len(label_order)}")
    print()
    print(f"Accuracy: {accuracy:.4f}  ({accuracy:.2%})")
    print()
    print("Classification report:")
    print(classification_report(y_test, y_pred, labels=label_order, zero_division=0))

    cm = confusion_matrix(y_test, y_pred, labels=label_order)
    output_path = OUTPUT_DIR / "confusion_matrix.png"
    plot_confusion_matrix(cm, label_order, output_path)
    print(f"Confusion matrix saved to: {output_path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
