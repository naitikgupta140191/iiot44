import pandas as pd
import numpy as np
from typing import Dict, List, Optional
import pickle
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model_bundle.pkl")

_bundle = None

def load_bundle():
    global _bundle
    if _bundle is None:
        with open(MODEL_PATH, "rb") as f:
            _bundle = pickle.load(f)
    return _bundle


def engineer_features(row: Dict) -> Dict:
    """
    Takes raw input dict and returns fully engineered feature dict
    ready for the revenue model.
    """
    rev   = row.get("total_revenue", row.get("rev_estimate", 5e7))
    units = row.get("units_sold", 1200)
    mfg   = row.get("local_manufacturing_cost_usd", 15000)
    mkt   = row.get("marketing_expense_usd", 5000)
    rnd   = row.get("r_and_d_expense_usd", 8000)
    opex  = row.get("operating_expense_usd", mfg * 1.1)
    war   = row.get("warranty_cost_usd", 1200)
    capex = row.get("capital_expenditure_usd", 30000)

    return {
        "year":                          row.get("year", 2025),
        "model_id":                      row.get("model_id", 1),
        "country_enc":                   row.get("country_enc", 0),
        "units_sold":                    units,
        "tax_rate_pct":                  row.get("tax_rate_pct", 15.0),
        "local_manufacturing_cost_usd":  mfg,
        "marketing_expense_usd":         mkt,
        "r_and_d_expense_usd":           rnd,
        "dealer_commission_pct":         row.get("dealer_commission_pct", 6.0),
        "rev_per_unit":                  rev / (units + 1),
        "cost_ratio":                    (mfg + mkt) / (rev + 1),
        "rnd_ratio":                     rnd / (rev + 1),
        "opex_ratio":                    opex / (rev + 1),
        "mkt_per_unit":                  mkt / (units + 1),
        "warranty_ratio":                war / (rev + 1),
        "capex_ratio":                   capex / (rev + 1),
    }


def engineer_profit_features(row: Dict) -> Dict:
    """Extended features for profit / margin model."""
    base = engineer_features(row)
    rev  = row.get("total_revenue", row.get("rev_estimate", 5e7))
    base.update({
        "gross_margin_r": row.get("gross_margin_usd", rev * 0.35) / (rev + 1),
        "ebitda_ratio":   row.get("ebitda_usd", rev * 0.20) / (rev + 1),
        "total_revenue":  rev,
    })
    return base


def get_country_baseline(country: str, year: int = 2024) -> Dict:
    """
    Returns average financial baseline for a country/year from historical data.
    Falls back to global average if not found.
    """
    bundle = load_bundle()
    hist   = pd.DataFrame(bundle["hist_country"])
    mask   = (hist["country"] == country) & (hist["year"] == year)
    row    = hist[mask]

    if row.empty:
        row = hist[hist["country"] == country].sort_values("year").tail(1)
    if row.empty:
        row = hist.sort_values("year").tail(1)

    r = row.iloc[0]
    return {
        "units_sold":  float(r["units"]),
        "total_revenue": float(r["revenue"]),
        "profit":      float(r["profit"]),
    }


def compute_confidence_interval(prediction: float, mape: float = 0.085) -> Dict:
    """Returns ±1 sigma confidence band based on model MAPE."""
    delta = prediction * mape
    return {
        "lower": round(prediction - delta, 2),
        "upper": round(prediction + delta, 2),
    }


def build_forecast_curve(
    country: str,
    model_id: int,
    start_year: int,
    end_year: int,
    growth_rate: float = 0.03,
    price_escalation: float = 0.02,
) -> List[Dict]:
    """
    Generates year-by-year forecast from start_year to end_year.
    Uses GBR revenue model + trained margin model for profit.
    """
    bundle  = load_bundle()
    gbr     = bundle["revenue_model"]
    le      = bundle["le_country"]
    feats   = bundle["features"]
    profit_mdl  = bundle.get("profit_model")
    profit_feats = bundle.get("profit_features")

    try:
        country_enc = int(le.transform([country])[0])
    except Exception:
        country_enc = 0

    base = get_country_baseline(country, 2024)
    results = []

    for yr in range(start_year, end_year + 1):
        g = 1 + growth_rate * (yr - 2024)
        p = 1 + price_escalation * (yr - 2024)
        units = base["units_sold"] * g
        rev_est = base["total_revenue"] * g * p
        mfg = 15500 * g
        mkt = 5000 * 1.02 ** (yr - 2024)
        rnd = 8500 * 1.05 ** (yr - 2024)
        opex = 17000 * g
        war = 1300 * g
        capex = 32000 * g

        row = {
            "year": yr, "model_id": model_id, "country_enc": country_enc,
            "units_sold": units, "tax_rate_pct": 15.0,
            "local_manufacturing_cost_usd": mfg,
            "marketing_expense_usd": mkt,
            "r_and_d_expense_usd": rnd,
            "dealer_commission_pct": 6.0,
            "rev_estimate": rev_est,
            "total_revenue": rev_est,
            "operating_expense_usd": opex,
            "warranty_cost_usd": war,
            "capital_expenditure_usd": capex,
        }
        eng = engineer_features(row)
        X   = pd.DataFrame([[eng[f] for f in feats]], columns=feats)
        pred_rev = float(gbr.predict(X)[0])

        # Use trained margin model if available, else fall back to 17.5%
        if profit_mdl is not None and profit_feats is not None:
            try:
                margin_row = _build_margin_features(
                    yr, model_id, country_enc, units, pred_rev,
                    mfg, mkt, rnd, opex, war, capex,
                )
                Xp = pd.DataFrame([[margin_row[f] for f in profit_feats]], columns=profit_feats)
                pred_margin = float(profit_mdl.predict(Xp)[0])
                pred_margin = max(0.02, min(pred_margin, 0.45))  # clamp to sane range
                pred_profit = pred_rev * pred_margin
            except Exception:
                pred_profit = pred_rev * 0.175
        else:
            pred_profit = pred_rev * 0.175

        ci  = compute_confidence_interval(pred_rev)

        results.append({
            "year":           yr,
            "revenue":        round(pred_rev, 2),
            "profit":         round(pred_profit, 2),
            "units":          round(units, 0),
            "margin_pct":     round((pred_profit / pred_rev) * 100, 2),
            "ci_lower":       ci["lower"],
            "ci_upper":       ci["upper"],
        })

    return results


def _build_margin_features(yr, model_id, country_enc, units, rev, mfg, mkt, rnd, opex, war, capex):
    """Build the feature dict expected by the trained margin model."""
    import numpy as _np
    return {
        "year": yr, "model_id": model_id, "country_enc": country_enc,
        "log_units": _np.log1p(units), "log_revenue": _np.log1p(rev),
        "tax_burden": 0.15, "dealer_commission_pct": 6.0,
        "cost_ratio": (mfg + mkt) / (rev + 1),
        "rnd_ratio": rnd / (rev + 1),
        "opex_ratio": opex / (rev + 1),
        "warranty_ratio": war / (rev + 1),
        "capex_ratio": capex / (rev + 1),
        "rev_per_unit": rev / (units + 1),
        "mkt_per_unit": mkt / (units + 1),
        "gross_margin_ratio": 0.35,  # default estimate
        "ebitda_ratio": 0.20,        # default estimate
        "interest_ratio": 5000 / (rev + 1),
        "depreciation_ratio": 6000 / (rev + 1),
        "import_per_unit": 800 / (units + 1),
        "total_cost_per_unit": (mfg + mkt + rnd + war + opex) / (units + 1),
    }


def detect_anomalies(threshold: float = 0.15) -> List[Dict]:
    """
    Compares actual vs model-predicted revenue per country/year.
    Flags records where deviation > threshold.
    """
    bundle = load_bundle()
    hist   = pd.DataFrame(bundle["hist_country"])
    gbr    = bundle["revenue_model"]
    le     = bundle["le_country"]
    feats  = bundle["features"]

    anomalies = []
    for _, r in hist.iterrows():
        try:
            cenc = int(le.transform([r["country"]])[0])
        except Exception:
            continue

        base_rev = float(r["revenue"])
        row = {
            "year": int(r["year"]), "model_id": 1,
            "country_enc": cenc, "units_sold": float(r["units"]),
            "tax_rate_pct": 15.0,
            "local_manufacturing_cost_usd": 15000,
            "marketing_expense_usd": 5000,
            "r_and_d_expense_usd": 8000,
            "dealer_commission_pct": 6.0,
            "rev_estimate": base_rev, "total_revenue": base_rev,
            "operating_expense_usd": 17000,
            "warranty_cost_usd": 1200,
            "capital_expenditure_usd": 30000,
        }
        eng  = engineer_features(row)
        X    = pd.DataFrame([[eng[f] for f in feats]], columns=feats)
        pred = float(gbr.predict(X)[0])
        dev  = abs(base_rev - pred) / (pred + 1)

        if dev > threshold:
            anomalies.append({
                "year":      int(r["year"]),
                "country":   r["country"],
                "actual":    round(base_rev, 2),
                "predicted": round(pred, 2),
                "deviation": round(dev * 100, 2),
                "direction": "above" if base_rev > pred else "below",
            })

    return sorted(anomalies, key=lambda x: x["deviation"], reverse=True)[:20]


def get_top_performers(n: int = 5) -> Dict:
    """Returns top N countries and models by total historical revenue."""
    bundle   = load_bundle()
    h_cntry  = pd.DataFrame(bundle["hist_country"])
    h_model  = pd.DataFrame(bundle["hist_model"])

    top_countries = (
        h_cntry.groupby("country")["revenue"]
        .sum().sort_values(ascending=False).head(n)
        .reset_index().rename(columns={"revenue": "total_revenue"})
        .to_dict(orient="records")
    )
    top_models = (
        h_model.groupby("model_id")["revenue"]
        .sum().sort_values(ascending=False).head(n)
        .reset_index().rename(columns={"revenue": "total_revenue"})
        .to_dict(orient="records")
    )
    return {"top_countries": top_countries, "top_models": top_models}


def compute_elasticity(model_id: int, country: str, price_changes: List[float]) -> List[Dict]:
    """
    For each % price change, estimate impact on units and revenue.
    Simple price elasticity: e = -1.5 (inelastic premium segment).
    """
    bundle = load_bundle()
    base   = get_country_baseline(country, 2024)
    base_price  = base["total_revenue"] / (base["units_sold"] + 1)
    elasticity  = -1.2

    results = []
    for pct in price_changes:
        new_price   = base_price * (1 + pct / 100)
        units_delta = elasticity * (pct / 100)
        new_units   = base["units_sold"] * (1 + units_delta)
        new_revenue = new_price * new_units
        results.append({
            "price_change_pct": pct,
            "new_price_usd":    round(new_price, 2),
            "units_delta_pct":  round(units_delta * 100, 2),
            "estimated_units":  round(new_units, 0),
            "estimated_revenue":round(new_revenue, 2),
        })
    return results


def compute_goal_gap(target_revenue: float, country: str, year: int) -> Dict:
    """
    Back-calculates what cost_ratio reduction is needed to hit a revenue target.
    """
    forecast = build_forecast_curve(country, 1, year, year)
    if not forecast:
        return {}
    base_rev = forecast[0]["revenue"]
    gap      = target_revenue - base_rev
    gap_pct  = (gap / base_rev) * 100

    # cost_ratio is 68.9% importance — approximate required change
    cost_lever = gap_pct / 0.689
    is_ok = abs(cost_lever) < 15
    return {
        "target_revenue":      round(target_revenue, 2),
        "forecast_revenue":    round(base_rev, 2),
        "gap":                 round(gap, 2),
        "gap_pct":             round(gap_pct, 2),
        "required_cost_reduction_pct": round(cost_lever, 2),
        "required_levers": {"cost_ratio_reduction_pct": round(cost_lever, 2)},
        "achievable":          is_ok,
        "is_achievable":       is_ok,
    }
