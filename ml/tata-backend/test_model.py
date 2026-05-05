"""
Tata Motors — Model Accuracy Test Script
Tests the trained GBR model against the actual finance dataset.
Run: python test_model.py
"""

import pickle
import os
import sys
import numpy as np
import pandas as pd
from sklearn.metrics import (
    r2_score,
    mean_absolute_error,
    mean_squared_error,
    mean_absolute_percentage_error,
)

# ── Paths ─────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model_bundle.pkl")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "TATA")
FINANCE_CSV = os.path.join(DATA_DIR, "tata_car_finance.csv")
SALES_CSV = os.path.join(DATA_DIR, "tata_car_sales.csv")
SPECS_CSV = os.path.join(DATA_DIR, "tata_car_specs.csv")


def load_model_bundle():
    """Load the pickled model bundle."""
    if not os.path.exists(MODEL_PATH):
        print(f"[ERROR] Model bundle not found at: {MODEL_PATH}")
        sys.exit(1)

    with open(MODEL_PATH, "rb") as f:
        bundle = pickle.load(f)

    print("=" * 60)
    print("MODEL BUNDLE CONTENTS")
    print("=" * 60)
    for key in bundle:
        val = bundle[key]
        if isinstance(val, (list, dict)):
            print(f"  {key:25s} → {type(val).__name__} (len={len(val)})")
        elif isinstance(val, np.ndarray):
            print(f"  {key:25s} → ndarray shape={val.shape}")
        else:
            print(f"  {key:25s} → {type(val).__name__}")
    print()
    return bundle


def engineer_features(row, le_country):
    """Replicate the feature engineering from data_utils.py."""
    rev = row.get("total_revenue", 5e7)
    units = row.get("units_sold", 1200)
    mfg = row.get("local_manufacturing_cost_usd", 15000)
    mkt = row.get("marketing_expense_usd", 5000)
    rnd = row.get("r_and_d_expense_usd", 8000)
    opex = row.get("operating_expense_usd", mfg * 1.1)
    war = row.get("warranty_cost_usd", 1200)
    capex = row.get("capital_expenditure_usd", 30000)

    try:
        country_enc = int(le_country.transform([row["country"]])[0])
    except Exception:
        country_enc = 0

    return {
        "year": row.get("year", 2025),
        "model_id": row.get("model_id", 1),
        "country_enc": country_enc,
        "units_sold": units,
        "tax_rate_pct": row.get("tax_rate_pct", 15.0),
        "local_manufacturing_cost_usd": mfg,
        "marketing_expense_usd": mkt,
        "r_and_d_expense_usd": rnd,
        "dealer_commission_pct": row.get("dealer_commission_pct", 6.0),
        "rev_per_unit": rev / (units + 1),
        "cost_ratio": (mfg + mkt) / (rev + 1),
        "rnd_ratio": rnd / (rev + 1),
        "opex_ratio": opex / (rev + 1),
        "mkt_per_unit": mkt / (units + 1),
        "warranty_ratio": war / (rev + 1),
        "capex_ratio": capex / (rev + 1),
    }


def test_revenue_model(bundle, finance_df):
    """Test the revenue model against actual finance data."""
    print("=" * 60)
    print("REVENUE MODEL ACCURACY TEST")
    print("=" * 60)

    gbr = bundle["revenue_model"]
    le = bundle["le_country"]
    feats = bundle["features"]
    stored_metrics = bundle.get("metrics", {})

    print(f"\nModel type       : {type(gbr).__name__}")
    print(f"Feature count    : {len(feats)}")
    print(f"Features         : {feats}")
    print(f"Label encoder    : {list(le.classes_)}")
    print()

    # ── Predict on each finance row ───────────────────────
    actuals = []
    predictions = []
    skipped = 0

    for _, row in finance_df.iterrows():
        try:
            eng = engineer_features(row.to_dict(), le)
            X = pd.DataFrame([[eng[f] for f in feats]], columns=feats)
            pred = float(gbr.predict(X)[0])
            actual = float(row["total_revenue"])

            if actual > 0:
                actuals.append(actual)
                predictions.append(pred)
        except Exception as e:
            skipped += 1

    actuals = np.array(actuals)
    predictions = np.array(predictions)

    n = len(actuals)
    print(f"Records tested   : {n}")
    print(f"Records skipped  : {skipped}")
    print()

    if n == 0:
        print("[ERROR] No records could be tested!")
        return

    # ── Compute metrics ───────────────────────────────────
    r2 = r2_score(actuals, predictions)
    mae = mean_absolute_error(actuals, predictions)
    rmse = np.sqrt(mean_squared_error(actuals, predictions))
    mape = mean_absolute_percentage_error(actuals, predictions) * 100

    # Median absolute percentage error (more robust to outliers)
    ape = np.abs((actuals - predictions) / actuals) * 100
    medape = np.median(ape)

    print("─" * 40)
    print("COMPUTED METRICS (from test data)")
    print("─" * 40)
    print(f"  R² Score       : {r2:.6f}")
    print(f"  MAE            : ${mae:,.2f}")
    print(f"  RMSE           : ${rmse:,.2f}")
    print(f"  MAPE           : {mape:.2f}%")
    print(f"  MedAPE         : {medape:.2f}%")
    print()

    # ── Compare with stored metrics ───────────────────────
    if stored_metrics:
        print("─" * 40)
        print("STORED METRICS (from model training)")
        print("─" * 40)
        for k, v in stored_metrics.items():
            print(f"  {k:18s}: {v}")
        print()

        print("─" * 40)
        print("COMPARISON")
        print("─" * 40)
        stored_r2 = stored_metrics.get("r2_revenue")
        stored_mae = stored_metrics.get("mae_revenue")
        stored_mape = stored_metrics.get("mape_revenue")
        if stored_r2:
            diff = r2 - stored_r2
            print(f"  R² diff        : {diff:+.6f} ({'better' if diff >= 0 else 'worse'})")
        if stored_mae:
            diff = mae - stored_mae
            print(f"  MAE diff       : ${diff:+,.2f} ({'worse' if diff > 0 else 'better'})")
        if stored_mape:
            diff = mape - stored_mape
            print(f"  MAPE diff      : {diff:+.2f}% ({'worse' if diff > 0 else 'better'})")
        print()

    # ── Quality assessment ────────────────────────────────
    print("─" * 40)
    print("QUALITY ASSESSMENT")
    print("─" * 40)

    if r2 >= 0.99:
        print("  ✓ R² ≥ 0.99     → EXCELLENT fit")
    elif r2 >= 0.95:
        print("  ✓ R² ≥ 0.95     → VERY GOOD fit")
    elif r2 >= 0.90:
        print("  ~ R² ≥ 0.90     → GOOD fit")
    elif r2 >= 0.80:
        print("  ⚠ R² ≥ 0.80     → ACCEPTABLE fit")
    else:
        print(f"  ✗ R² = {r2:.4f}  → POOR fit — model needs retraining")

    if mape <= 5:
        print("  ✓ MAPE ≤ 5%     → HIGHLY accurate predictions")
    elif mape <= 10:
        print("  ✓ MAPE ≤ 10%    → GOOD accuracy")
    elif mape <= 20:
        print("  ~ MAPE ≤ 20%    → ACCEPTABLE accuracy")
    else:
        print(f"  ✗ MAPE = {mape:.1f}%  → LOW accuracy — consider retraining")

    # ── Per-country breakdown ─────────────────────────────
    print()
    print("─" * 40)
    print("PER-COUNTRY ACCURACY")
    print("─" * 40)

    countries = finance_df["country"].unique()
    country_results = []
    for country in sorted(countries):
        mask = finance_df["country"] == country
        idx = finance_df.index[mask]
        c_actuals = []
        c_preds = []

        for i in idx:
            row = finance_df.loc[i]
            try:
                eng = engineer_features(row.to_dict(), le)
                X = pd.DataFrame([[eng[f] for f in feats]], columns=feats)
                pred = float(gbr.predict(X)[0])
                actual = float(row["total_revenue"])
                if actual > 0:
                    c_actuals.append(actual)
                    c_preds.append(pred)
            except Exception:
                pass

        if len(c_actuals) > 1:
            c_r2 = r2_score(c_actuals, c_preds)
            c_mape = mean_absolute_percentage_error(c_actuals, c_preds) * 100
            c_mae = mean_absolute_error(c_actuals, c_preds)
            country_results.append((country, len(c_actuals), c_r2, c_mape, c_mae))
            status = "✓" if c_r2 >= 0.90 else ("~" if c_r2 >= 0.80 else "✗")
            print(f"  {status} {country:12s}  n={len(c_actuals):4d}  R²={c_r2:.4f}  MAPE={c_mape:.1f}%  MAE=${c_mae:,.0f}")

    # ── Per-year breakdown ────────────────────────────────
    print()
    print("─" * 40)
    print("PER-YEAR ACCURACY")
    print("─" * 40)

    years = sorted(finance_df["year"].unique())
    for yr in years:
        mask = finance_df["year"] == yr
        idx = finance_df.index[mask]
        y_actuals = []
        y_preds = []

        for i in idx:
            row = finance_df.loc[i]
            try:
                eng = engineer_features(row.to_dict(), le)
                X = pd.DataFrame([[eng[f] for f in feats]], columns=feats)
                pred = float(gbr.predict(X)[0])
                actual = float(row["total_revenue"])
                if actual > 0:
                    y_actuals.append(actual)
                    y_preds.append(pred)
            except Exception:
                pass

        if len(y_actuals) > 1:
            y_r2 = r2_score(y_actuals, y_preds)
            y_mape = mean_absolute_percentage_error(y_actuals, y_preds) * 100
            status = "✓" if y_r2 >= 0.90 else ("~" if y_r2 >= 0.80 else "✗")
            print(f"  {status} {yr}  n={len(y_actuals):4d}  R²={y_r2:.4f}  MAPE={y_mape:.1f}%")

    # ── Sample predictions ────────────────────────────────
    print()
    print("─" * 40)
    print("SAMPLE PREDICTIONS (first 10)")
    print("─" * 40)
    print(f"  {'Country':12s} {'Year':>5s} {'Model':>6s}  {'Actual':>14s}  {'Predicted':>14s}  {'Error%':>8s}")
    print("  " + "-" * 65)

    sample_idx = min(10, n)
    for i in range(sample_idx):
        actual = actuals[i]
        pred = predictions[i]
        err = abs(actual - pred) / actual * 100
        row = finance_df.iloc[i]
        print(f"  {row['country']:12s} {int(row['year']):5d} M{int(row['model_id']):>4d}  ${actual:>13,.0f}  ${pred:>13,.0f}  {err:>7.1f}%")

    return r2, mape, mae


def main():
    print()
    print("╔" + "═" * 58 + "╗")
    print("║   TATA MOTORS — ML MODEL ACCURACY TEST                  ║")
    print("╚" + "═" * 58 + "╝")
    print()

    # Load model bundle
    bundle = load_model_bundle()

    # Load finance dataset
    if not os.path.exists(FINANCE_CSV):
        print(f"[ERROR] Finance dataset not found at: {FINANCE_CSV}")
        print(f"  Looked for: {os.path.abspath(FINANCE_CSV)}")
        sys.exit(1)

    finance_df = pd.read_csv(FINANCE_CSV)
    print(f"Finance dataset  : {len(finance_df)} records")
    print(f"Columns          : {list(finance_df.columns[:10])}...")
    print(f"Countries        : {sorted(finance_df['country'].unique())}")
    print(f"Years            : {sorted(finance_df['year'].unique())}")
    print(f"Models           : {sorted(finance_df['model_id'].unique())[:10]}... ({finance_df['model_id'].nunique()} total)")
    print()

    # Run accuracy test
    r2, mape, mae = test_revenue_model(bundle, finance_df)

    # Final summary
    print()
    print("╔" + "═" * 58 + "╗")
    print("║   FINAL SUMMARY                                         ║")
    print("╠" + "═" * 58 + "╣")
    print(f"║   R² Score       : {r2:.6f}                             ║")
    print(f"║   MAPE           : {mape:.2f}%                               ║")
    print(f"║   MAE            : ${mae:>12,.0f}                       ║")
    verdict = "PASS ✓" if r2 >= 0.90 and mape <= 15 else "NEEDS WORK ✗"
    print(f"║   Verdict        : {verdict:40s}  ║")
    print("╚" + "═" * 58 + "╝")
    print()


if __name__ == "__main__":
    main()
