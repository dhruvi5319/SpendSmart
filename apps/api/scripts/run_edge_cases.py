"""
Run the hand-curated edge-case test set through a freshly trained
categorization pipeline and print a per-case report.

Run from apps/api/ with the venv active:
    python scripts/run_edge_cases.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ml.training_data import get_training_categories, get_training_descriptions
from scripts.edge_cases import EDGE_CASES


def build_and_train() -> Pipeline:
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=5000,
            stop_words="english",
            lowercase=True,
            strip_accents="unicode",
        )),
        ("clf", MultinomialNB(alpha=0.1)),
    ])
    pipeline.fit(get_training_descriptions(), get_training_categories())
    return pipeline


def main() -> None:
    pipeline = build_and_train()

    matches = 0
    total = len(EDGE_CASES)

    print(f"{'#':>2}  {'description':28s}  {'expected':16s}  {'predicted':16s}  conf   note")
    print("-" * 130)

    rows = []
    for i, (desc, expected, why) in enumerate(EDGE_CASES, start=1):
        probs = pipeline.predict_proba([desc.strip().lower()])[0]
        classes = pipeline.classes_
        order = probs.argsort()[::-1]
        predicted = classes[order[0]]
        confidence = probs[order[0]]
        ok = predicted == expected
        if ok:
            matches += 1
        flag = "OK " if ok else "MISS"
        print(f"{i:>2}  {desc:28s}  {expected:16s}  {predicted:16s}  {confidence:.2f}  {flag}  {why}")
        rows.append((desc, expected, predicted, confidence, ok, why))

    print("-" * 130)
    print(f"Edge-case accuracy: {matches}/{total} = {matches / total:.1%}")
    print()
    print("Misses, with top-3 predictions:")
    for desc, expected, predicted, conf, ok, why in rows:
        if ok:
            continue
        probs = pipeline.predict_proba([desc.strip().lower()])[0]
        classes = pipeline.classes_
        order = probs.argsort()[::-1][:3]
        top3 = ", ".join(f"{classes[i]}({probs[i]:.2f})" for i in order)
        print(f"  - {desc!r} (expected {expected}): top-3 = {top3}")
        print(f"      why tricky: {why}")


if __name__ == "__main__":
    main()
