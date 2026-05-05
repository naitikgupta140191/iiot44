"""
Tata Motors — Profit Model Retraining v2
Strategy: Predict profit_margin_ratio instead of raw profit,
then derive profit = revenue * predicted_margin.
Uses RandomForest + feature selection for robustness.

Run: $env:PYTHONIOENCODING='utf-8'; python retrain_profit_v2.py
"""

import pickle, os, sys, warnings
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import r2_score, mean_absolute_error, mean_absolute_percentage_error
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore", category=UserWarning)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model_bundle.pkl")
FINANCE_CSV = os.path.join(os.path.dirname(__file__), "..", "..", "TATA", "tata_car_finance.csv")


def load_bundle():
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def main():
    print("\n" + "=" * 60)
    print("  PROFIT MODEL RETRAINING v2 — Margin Ratio Approach")
    print("=" * 60 + "\n")

    bundle = load_bundle()
    le = bundle["le_country"]
    df = pd.read_csv(FINANCE_CSV)
    print(f"Dataset: {len(df)} records, {df['country'].nunique()} countries, {df['year'].nunique()} years\n")

    # ── Strategy: Predict margin ratio ────────────────────
    # profit_margin = profit / revenue
    df["margin_ratio"] = df["profit"] / (df["total_revenue"] + 1)
    df["country_enc"] = le.transform(df["country"])

    # Feature engineering — focus on cost structure ratios
    df["cost_ratio"] = (df["local_manufacturing_cost_usd"] + df["marketing_expense_usd"]) / (df["total_revenue"] + 1)
    df["rnd_ratio"] = df["r_and_d_expense_usd"] / (df["total_revenue"] + 1)
    df["opex_ratio"] = df["operating_expense_usd"] / (df["total_revenue"] + 1)
    df["warranty_ratio"] = df["warranty_cost_usd"] / (df["total_revenue"] + 1)
    df["capex_ratio"] = df["capital_expenditure_usd"] / (df["total_revenue"] + 1)
    df["rev_per_unit"] = df["total_revenue"] / (df["units_sold"] + 1)
    df["mkt_per_unit"] = df["marketing_expense_usd"] / (df["units_sold"] + 1)
    df["gross_margin_ratio"] = df["gross_margin_usd"] / (df["total_revenue"] + 1)
    df["ebitda_ratio"] = df["ebitda_usd"] / (df["total_revenue"] + 1)
    df["interest_ratio"] = df["interest_expense_usd"] / (df["total_revenue"] + 1)
    df["depreciation_ratio"] = df["depreciation_usd"] / (df["total_revenue"] + 1)
    df["tax_burden"] = df["tax_rate_pct"] / 100.0
    df["import_per_unit"] = df["import_duty_usd"] / (df["units_sold"] + 1)
    df["total_cost_per_unit"] = (
        df["local_manufacturing_cost_usd"] + df["marketing_expense_usd"] +
        df["r_and_d_expense_usd"] + df["warranty_cost_usd"] + df["operating_expense_usd"]
    ) / (df["units_sold"] + 1)
    df["log_revenue"] = np.log1p(df["total_revenue"])
    df["log_units"] = np.log1p(df["units_sold"])

    # Features for margin prediction
    margin_features = [
        "year", "model_id", "country_enc", "log_units", "log_revenue",
        "tax_burden", "dealer_commission_pct",
        "cost_ratio", "rnd_ratio", "opex_ratio", "warranty_ratio", "capex_ratio",
        "rev_per_unit", "mkt_per_unit",
        "gross_margin_ratio", "ebitda_ratio", "interest_ratio", "depreciation_ratio",
        "import_per_unit", "total_cost_per_unit",
    ]

    X = df[margin_features].values
    y = df["margin_ratio"].values

    # Remove extreme outliers (margins outside 1st-99th percentile)
    q1, q99 = np.percentile(y, 1), np.percentile(y, 99)
    mask = (y >= q1) & (y <= q99)
    X, y = X[mask], y[mask]
    print(f"After outlier removal: {len(y)} records (removed {(~mask).sum()})")
    print(f"Margin range: {y.min():.4f} to {y.max():.4f}, mean={y.mean():.4f}\n")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # ── Model 1: GBR with tuned hyperparams ──────────────
    print("Training Model 1: GradientBoostingRegressor...")
    gbr = GradientBoostingRegressor(
        n_estimators=500, max_depth=4, learning_rate=0.05,
        subsample=0.85, min_samples_split=10, min_samples_leaf=5,
        max_features=0.8, random_state=42,
    )
    gbr.fit(X_train, y_train)
    gbr_pred = gbr.predict(X_test)
    gbr_r2 = r2_score(y_test, gbr_pred)
    gbr_mae = mean_absolute_error(y_test, gbr_pred)
    print(f"  GBR Margin R2={gbr_r2:.6f}, MAE={gbr_mae:.6f}\n")

    # ── Model 2: RandomForest ────────────────────────────
    print("Training Model 2: RandomForestRegressor...")
    rf = RandomForestRegressor(
        n_estimators=500, max_depth=8, min_samples_split=10,
        min_samples_leaf=5, max_features=0.7, random_state=42, n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    rf_r2 = r2_score(y_test, rf_pred)
    rf_mae = mean_absolute_error(y_test, rf_pred)
    print(f"  RF  Margin R2={rf_r2:.6f}, MAE={rf_mae:.6f}\n")

    # ── Select best model ────────────────────────────────
    if gbr_r2 >= rf_r2:
        best_model, best_name, best_r2, best_mae = gbr, "GBR", gbr_r2, gbr_mae
        best_pred = gbr_pred
    else:
        best_model, best_name, best_r2, best_mae = rf, "RF", rf_r2, rf_mae
        best_pred = rf_pred

    print(f"Best model: {best_name} (R2={best_r2:.6f})\n")

    # ── Now evaluate end-to-end: predicted_profit = revenue * predicted_margin
    df_test = df[mask].iloc[X_test.shape[0] * -1:]  # approximate test set
    # Properly reconstruct for evaluation
    X_full = df[margin_features].values[mask]
    y_margin_full = y
    y_profit_actual = df["profit"].values[mask]
    y_revenue = df["total_revenue"].values[mask]

    margin_pred_full = best_model.predict(X_full)
    profit_pred_full = y_revenue * margin_pred_full
    profit_r2 = r2_score(y_profit_actual, profit_pred_full)
    profit_mae = mean_absolute_error(y_profit_actual, profit_pred_full)
    profit_mape = mean_absolute_percentage_error(y_profit_actual, profit_pred_full) * 100

    # Old approach comparison
    old_profit_pred = y_revenue * 0.175
    old_r2 = r2_score(y_profit_actual, old_profit_pred)
    old_mae = mean_absolute_error(y_profit_actual, old_profit_pred)
    old_mape = mean_absolute_percentage_error(y_profit_actual, old_profit_pred) * 100

    print("-" * 55)
    print("END-TO-END PROFIT PREDICTION COMPARISON")
    print("-" * 55)
    print(f"  Old (17.5%)    R2={old_r2:.6f}  MAPE={old_mape:.1f}%  MAE=${old_mae:,.0f}")
    print(f"  New ({best_name} margin)  R2={profit_r2:.6f}  MAPE={profit_mape:.1f}%  MAE=${profit_mae:,.0f}")
    print(f"  Improvement    R2={profit_r2-old_r2:+.6f}  MAPE={old_mape-profit_mape:+.1f}%")
    print()

    # ── Cross-validation on margin model ─────────────────
    cv = cross_val_score(best_model, X_full, y_margin_full, cv=5, scoring="r2")
    print(f"5-fold CV R2 (margin): {cv.mean():.6f} +/- {cv.std():.6f}")
    print(f"CV scores: {[f'{s:.4f}' for s in cv]}\n")

    # ── Feature importance ───────────────────────────────
    importances = best_model.feature_importances_
    feat_imp = sorted(zip(margin_features, importances), key=lambda x: x[1], reverse=True)
    print("-" * 55)
    print("TOP 10 FEATURE IMPORTANCES (Margin Model)")
    print("-" * 55)
    for fname, imp in feat_imp[:10]:
        bar = "#" * int(imp * 80)
        print(f"  {fname:30s} {imp:.4f}  {bar}")
    print()

    # ── Update bundle if improved ────────────────────────
    if profit_r2 > old_r2:
        print("[OK] New margin model improves profit prediction. Updating bundle...")

        bundle["profit_model"] = best_model
        bundle["profit_features"] = margin_features
        bundle["profit_model_type"] = best_name
        bundle["metrics"]["r2_profit"] = round(profit_r2, 6)
        bundle["metrics"]["mae_profit"] = round(profit_mae, 2)
        bundle["metrics"]["mape_profit"] = round(profit_mape, 2)
        bundle["metrics"]["r2_margin"] = round(best_r2, 6)

        with open(MODEL_PATH, "wb") as f:
            pickle.dump(bundle, f)

        print(f"  Saved to {MODEL_PATH}")
        print(f"  Keys: {list(bundle.keys())}")
    else:
        print("[SKIP] No improvement over flat margin. Bundle NOT updated.")

    print(f"\n{'='*55}")
    print(f"  VERDICT: Profit R2 = {profit_r2:.4f} (was {old_r2:.4f})")
    status = "PASS" if profit_r2 >= 0.80 else "IMPROVED" if profit_r2 > old_r2 else "NO CHANGE"
    print(f"  Status: {status}")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    main()
