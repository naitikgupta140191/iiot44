"""
Tata Motors — Profit Model Retraining Script
Trains a dedicated GradientBoostingRegressor for profit prediction
and updates model_bundle.pkl with the new profit model.

Current state: profit is estimated as revenue * 17.5% (flat margin)
Goal: Train a proper profit model using the full finance dataset

Run: python retrain_profit_model.py
"""

import pickle
import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    r2_score, mean_absolute_error, mean_squared_error,
    mean_absolute_percentage_error,
)
from sklearn.preprocessing import LabelEncoder

# ── Paths ─────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model_bundle.pkl")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "TATA")
FINANCE_CSV = os.path.join(DATA_DIR, "tata_car_finance.csv")


def load_bundle():
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def engineer_profit_features(row, le_country):
    """
    Extended feature engineering specifically for profit prediction.
    Includes financial ratios and cost structure features.
    """
    rev = row.get("total_revenue", 5e7)
    units = row.get("units_sold", 1200)
    mfg = row.get("local_manufacturing_cost_usd", 15000)
    mkt = row.get("marketing_expense_usd", 5000)
    rnd = row.get("r_and_d_expense_usd", 8000)
    opex = row.get("operating_expense_usd", mfg * 1.1)
    war = row.get("warranty_cost_usd", 1200)
    capex = row.get("capital_expenditure_usd", 30000)
    gross_margin = row.get("gross_margin_usd", rev * 0.35)
    ebitda = row.get("ebitda_usd", rev * 0.20)
    tax_rate = row.get("tax_rate_pct", 15.0)
    dealer_comm = row.get("dealer_commission_pct", 6.0)
    import_duty = row.get("import_duty_usd", 800)
    interest = row.get("interest_expense_usd", 5000)
    depreciation = row.get("depreciation_usd", 6000)

    try:
        country_enc = int(le_country.transform([row["country"]])[0])
    except Exception:
        country_enc = 0

    return {
        "year": row.get("year", 2025),
        "model_id": row.get("model_id", 1),
        "country_enc": country_enc,
        "units_sold": units,
        "total_revenue": rev,
        "tax_rate_pct": tax_rate,
        "local_manufacturing_cost_usd": mfg,
        "marketing_expense_usd": mkt,
        "r_and_d_expense_usd": rnd,
        "dealer_commission_pct": dealer_comm,
        # Revenue-derived ratios
        "rev_per_unit": rev / (units + 1),
        "cost_ratio": (mfg + mkt) / (rev + 1),
        "rnd_ratio": rnd / (rev + 1),
        "opex_ratio": opex / (rev + 1),
        "mkt_per_unit": mkt / (units + 1),
        "warranty_ratio": war / (rev + 1),
        "capex_ratio": capex / (rev + 1),
        # Profit-specific features
        "gross_margin_ratio": gross_margin / (rev + 1),
        "ebitda_ratio": ebitda / (rev + 1),
        "import_duty_per_unit": import_duty / (units + 1),
        "interest_ratio": interest / (rev + 1),
        "depreciation_ratio": depreciation / (rev + 1),
        "total_cost_per_unit": (mfg + mkt + rnd + war + opex) / (units + 1),
        "effective_tax_burden": tax_rate * rev / 100,
        "net_margin_proxy": (rev - mfg * units - mkt - rnd - opex - war) / (rev + 1),
    }


def main():
    print()
    print("╔" + "═" * 58 + "╗")
    print("║   TATA MOTORS — PROFIT MODEL RETRAINING                  ║")
    print("╚" + "═" * 58 + "╝")
    print()

    # ── Load existing bundle ──────────────────────────────
    bundle = load_bundle()
    le = bundle["le_country"]

    print("Existing bundle keys:", list(bundle.keys()))
    print()

    # ── Load finance data ─────────────────────────────────
    if not os.path.exists(FINANCE_CSV):
        print(f"[ERROR] Finance CSV not found: {FINANCE_CSV}")
        sys.exit(1)

    df = pd.read_csv(FINANCE_CSV)
    print(f"Finance dataset: {len(df)} records")
    print(f"Countries: {sorted(df['country'].unique())}")
    print(f"Years: {sorted(df['year'].unique())}")
    print()

    # ── Feature engineering ───────────────────────────────
    print("Engineering profit-specific features...")

    feature_rows = []
    targets = []
    skipped = 0

    for _, row in df.iterrows():
        try:
            profit = float(row["profit"])
            if profit <= 0:
                skipped += 1
                continue

            eng = engineer_profit_features(row.to_dict(), le)
            feature_rows.append(eng)
            targets.append(profit)
        except Exception as e:
            skipped += 1

    print(f"  Valid records: {len(targets)}")
    print(f"  Skipped: {skipped}")

    profit_features = list(feature_rows[0].keys())
    X = pd.DataFrame(feature_rows, columns=profit_features)
    y = np.array(targets)

    print(f"  Features ({len(profit_features)}): {profit_features}")
    print()

    # ── Train/Test Split ──────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    # ── Train GBR for Profit ──────────────────────────────
    print()
    print("Training GradientBoostingRegressor for profit...")
    print("  Hyperparameters: n_estimators=300, max_depth=5, lr=0.1, subsample=0.9")

    gbr_profit = GradientBoostingRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.9,
        min_samples_split=5,
        min_samples_leaf=3,
        random_state=42,
    )
    gbr_profit.fit(X_train, y_train)

    # ── Evaluate ──────────────────────────────────────────
    y_pred_train = gbr_profit.predict(X_train)
    y_pred_test = gbr_profit.predict(X_test)

    r2_train = r2_score(y_train, y_pred_train)
    r2_test = r2_score(y_test, y_pred_test)
    mae_test = mean_absolute_error(y_test, y_pred_test)
    rmse_test = np.sqrt(mean_squared_error(y_test, y_pred_test))
    mape_test = mean_absolute_percentage_error(y_test, y_pred_test) * 100

    print()
    print("─" * 50)
    print("PROFIT MODEL METRICS")
    print("─" * 50)
    print(f"  Train R²     : {r2_train:.6f}")
    print(f"  Test  R²     : {r2_test:.6f}")
    print(f"  Test  MAE    : ${mae_test:,.2f}")
    print(f"  Test  RMSE   : ${rmse_test:,.2f}")
    print(f"  Test  MAPE   : {mape_test:.2f}%")
    print()

    # ── Cross Validation ──────────────────────────────────
    cv_scores = cross_val_score(gbr_profit, X, y, cv=5, scoring="r2")
    print(f"  5-fold CV R² : {cv_scores.mean():.6f} ± {cv_scores.std():.6f}")
    print(f"  CV scores    : {[f'{s:.4f}' for s in cv_scores]}")
    print()

    # ── Feature Importance ────────────────────────────────
    importances = gbr_profit.feature_importances_
    feat_imp = sorted(zip(profit_features, importances), key=lambda x: x[1], reverse=True)
    print("─" * 50)
    print("TOP 10 FEATURE IMPORTANCES (Profit)")
    print("─" * 50)
    for fname, imp in feat_imp[:10]:
        bar = "█" * int(imp * 100)
        print(f"  {fname:35s} {imp:.4f}  {bar}")
    print()

    # ── Compare with old approach ─────────────────────────
    print("─" * 50)
    print("COMPARISON: New Model vs Flat 17.5% Margin")
    print("─" * 50)
    # Old approach: profit = revenue * 0.175
    old_pred = X_test["total_revenue"].values * 0.175
    old_r2 = r2_score(y_test, old_pred)
    old_mape = mean_absolute_percentage_error(y_test, old_pred) * 100
    old_mae = mean_absolute_error(y_test, old_pred)

    print(f"  Old (flat 17.5%)  R²={old_r2:.6f}  MAPE={old_mape:.2f}%  MAE=${old_mae:,.0f}")
    print(f"  New (GBR profit)  R²={r2_test:.6f}  MAPE={mape_test:.2f}%  MAE=${mae_test:,.0f}")
    improvement_r2 = r2_test - old_r2
    improvement_mape = old_mape - mape_test
    print(f"  Improvement       R²={improvement_r2:+.6f}  MAPE={improvement_mape:+.2f}%")
    print()

    # ── Decide whether to update bundle ───────────────────
    if r2_test > old_r2 and r2_test > 0.80:
        print("✓ New profit model is BETTER. Updating model bundle...")

        # Update the bundle
        bundle["profit_model"] = gbr_profit
        bundle["profit_features"] = profit_features
        bundle["metrics"]["r2_profit"] = round(r2_test, 6)
        bundle["metrics"]["mae_profit"] = round(mae_test, 2)
        bundle["metrics"]["mape_profit"] = round(mape_test, 2)
        bundle["metrics"]["profit_model_type"] = "GradientBoostingRegressor"

        # Save
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(bundle, f)

        print(f"  ✓ Saved updated bundle to {MODEL_PATH}")
        print(f"  ✓ Bundle now contains: {list(bundle.keys())}")
    else:
        print("✗ New model did not improve significantly. Bundle NOT updated.")

    # ── Final Summary ─────────────────────────────────────
    print()
    print("╔" + "═" * 58 + "╗")
    print("║   RETRAINING SUMMARY                                     ║")
    print("╠" + "═" * 58 + "╣")
    print(f"║   Old Profit R²  : {old_r2:.6f} (flat 17.5% margin)       ║")
    print(f"║   New Profit R²  : {r2_test:.6f} (GBR dedicated model)    ║")
    print(f"║   New MAPE       : {mape_test:.2f}%                             ║")
    verdict = "PASS ✓" if r2_test >= 0.85 else "ACCEPTABLE ~" if r2_test >= 0.70 else "NEEDS WORK ✗"
    print(f"║   Verdict        : {verdict:40s} ║")
    print("╚" + "═" * 58 + "╝")
    print()


if __name__ == "__main__":
    main()
