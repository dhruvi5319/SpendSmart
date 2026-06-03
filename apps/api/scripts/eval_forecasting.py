"""
Forecast-accuracy eval for the Prophet-based spending forecaster.

This uses a synthetic 90-day daily-spending series (no DB dependency) so the
eval is reproducible from a fresh checkout. The synthetic series is built
with a known weekly seasonality + a small upward trend + Gaussian noise,
which mirrors the structure a household-spending pattern actually has:
weekends spend more than weekdays, with daily noise on top.

Procedure:
  1. Generate 90 days of synthetic daily spending.
  2. Train Prophet on the first 60 days using the same config as
     app/ml/forecasting.py:277 (yearly off, weekly on, daily off,
     changepoint_prior_scale=0.1).
  3. Predict the next 30 days.
  4. Report MAE, MAPE, the share of actuals inside the 80% CI, and
     save an actuals-vs-predicted PNG to docs/images/forecast_eval.png.

Caveat: synthetic data validates that the forecasting *machinery* is sane.
A real production eval needs a backtest on actual user expenses; the
roadmap calls that out as the next step.

Run from apps/api/ with the venv active:
    python scripts/eval_forecasting.py
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from prophet import Prophet

logging.getLogger("prophet").setLevel(logging.WARNING)
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)

REPO_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_DIR = REPO_ROOT / "docs" / "images"

TOTAL_DAYS = 90
TRAIN_DAYS = 60
TEST_DAYS = TOTAL_DAYS - TRAIN_DAYS  # 30
RNG_SEED = 42


def generate_synthetic_spending(total_days: int = TOTAL_DAYS) -> pd.DataFrame:
    """Build a daily spending series with weekly seasonality + trend + noise.

    Weekday spending averages ~$35, weekend spending averages ~$75. A small
    linear upward trend (~$0.20/day) and N(0, 8) Gaussian noise are layered
    on top so the model has something realistic to learn.
    """
    rng = np.random.default_rng(RNG_SEED)
    start = date.today() - timedelta(days=total_days)
    dates = pd.date_range(start=start, periods=total_days, freq="D")

    rows = []
    for i, ts in enumerate(dates):
        weekday = ts.weekday()  # 0 = Monday
        base = 75.0 if weekday >= 5 else 35.0       # weekend vs weekday
        trend = 0.20 * i                             # small upward drift
        noise = rng.normal(0, 8)
        rows.append({"ds": ts, "y": max(0.0, base + trend + noise)})

    return pd.DataFrame(rows)


def fit_predict(df_train: pd.DataFrame, horizon: int) -> pd.DataFrame:
    """Train Prophet with the production config and return the forecast frame."""
    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.1,
    )
    model.fit(df_train)
    future = model.make_future_dataframe(periods=horizon)
    forecast = model.predict(future)
    forecast["yhat"] = forecast["yhat"].clip(lower=0)
    forecast["yhat_lower"] = forecast["yhat_lower"].clip(lower=0)
    forecast["yhat_upper"] = forecast["yhat_upper"].clip(lower=0)
    return forecast


def plot_actual_vs_predicted(df_train: pd.DataFrame, df_test: pd.DataFrame,
                             forecast: pd.DataFrame, output_path: Path) -> None:
    test_window = forecast[forecast["ds"] > df_train["ds"].max()].copy()

    fig, ax = plt.subplots(figsize=(12, 5))
    ax.plot(df_train["ds"], df_train["y"], color="#999999", linewidth=1.5,
            label=f"Train ({TRAIN_DAYS} days)")
    ax.plot(df_test["ds"], df_test["y"], color="#222222", linewidth=1.8,
            label=f"Actual ({TEST_DAYS} days held out)")
    ax.plot(test_window["ds"], test_window["yhat"], color="#1f77b4",
            linewidth=2.0, label="Prophet forecast")
    ax.fill_between(test_window["ds"], test_window["yhat_lower"],
                    test_window["yhat_upper"], color="#1f77b4", alpha=0.15,
                    label="80% interval")
    ax.axvline(df_train["ds"].max(), color="red", linestyle="--", linewidth=1,
               alpha=0.6)
    ax.set_xlabel("Date")
    ax.set_ylabel("Daily spending (synthetic $)")
    ax.set_title("Forecast eval: Prophet on synthetic spending (60-day train, 30-day forecast)")
    ax.legend(loc="upper left")
    fig.tight_layout()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    df = generate_synthetic_spending(TOTAL_DAYS)
    df_train = df.iloc[:TRAIN_DAYS].reset_index(drop=True)
    df_test = df.iloc[TRAIN_DAYS:].reset_index(drop=True)

    forecast = fit_predict(df_train, horizon=TEST_DAYS)

    test_window = forecast[forecast["ds"] > df_train["ds"].max()].copy()
    test_window = test_window.reset_index(drop=True)

    actual = df_test["y"].to_numpy()
    predicted = test_window["yhat"].to_numpy()
    lower = test_window["yhat_lower"].to_numpy()
    upper = test_window["yhat_upper"].to_numpy()

    mae = float(np.mean(np.abs(actual - predicted)))
    mape = float(np.mean(np.abs((actual - predicted) / np.maximum(actual, 1e-9))) * 100)
    in_interval = float(np.mean((actual >= lower) & (actual <= upper)) * 100)
    actual_mean = float(actual.mean())
    predicted_mean = float(predicted.mean())

    print("Synthetic spending eval")
    print("=" * 60)
    print(f"Total days generated:    {TOTAL_DAYS}")
    print(f"Train window:            first {TRAIN_DAYS} days")
    print(f"Test window:             last {TEST_DAYS} days")
    print(f"Actual mean daily spend: ${actual_mean:.2f}")
    print(f"Predicted mean:          ${predicted_mean:.2f}")
    print()
    print(f"MAE:                     ${mae:.2f}")
    print(f"MAPE:                    {mape:.1f}%")
    print(f"Coverage of 80% CI:      {in_interval:.0f}% of held-out days fall inside the interval")

    output_path = OUTPUT_DIR / "forecast_eval.png"
    plot_actual_vs_predicted(df_train, df_test, forecast, output_path)
    print(f"\nPlot saved to: {output_path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
