"""
Tata Motors Sales Forecasting API
FastAPI backend — deploy on Render
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
import pickle
import json
import os
import time
from datetime import datetime, timezone

from data_utils import (
    load_bundle,
    engineer_features,
    build_forecast_curve,
    detect_anomalies,
    get_top_performers,
    compute_elasticity,
    compute_goal_gap,
    compute_confidence_interval,
    get_country_baseline,
)

# ── App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Tata Motors Sales Forecasting API",
    description="ML-powered forecasting, threat analysis and business intelligence for Tata Motors",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_start_time = time.time()

# ── Load specs ────────────────────────────────────────────────────────
SPECS_PATH = os.path.join(os.path.dirname(__file__), "specs_data.json")
with open(SPECS_PATH) as f:
    SPECS: List[Dict] = json.load(f)

COUNTRIES  = ["Australia", "France", "Germany", "India", "Japan", "UK", "USA"]
FUEL_TYPES = ["Hybrid", "Electric", "Diesel", "Petrol"]
CAR_TYPES  = ["MPV", "Pickup", "SUV", "Sedan", "Hatchback", "Coupe", "Convertible"]

# ── Pydantic Models ───────────────────────────────────────────────────
class PredictRequest(BaseModel):
    country: str = Field(..., example="India")
    model_id: int = Field(1, ge=1, le=50)
    year: int = Field(2025, ge=2025, le=2034)
    units_sold: Optional[float] = None
    tax_rate_pct: float = Field(15.0, ge=0, le=50)
    local_manufacturing_cost_usd: float = Field(15000.0, ge=0)
    marketing_expense_usd: float = Field(5000.0, ge=0)
    r_and_d_expense_usd: float = Field(8000.0, ge=0)
    dealer_commission_pct: float = Field(6.0, ge=0, le=30)

class WhatIfRequest(BaseModel):
    country: str = "India"
    model_id: int = 1
    year: int = Field(2025, ge=2025, le=2034)
    cost_ratio_delta: float = Field(0.0, ge=-50, le=50, description="% change in cost ratio, e.g. -5 means reduce by 5%")
    rnd_delta: float = Field(0.0, ge=-50, le=50, description="% change in R&D spend")
    marketing_delta: float = Field(0.0, ge=-50, le=50, description="% change in marketing spend")
    units_delta: float = Field(0.0, ge=-50, le=50, description="% change in units sold")

class PriceOptimizeRequest(BaseModel):
    country: str = "India"
    model_id: int = 1
    target_margin_pct: float = Field(18.0, ge=5, le=40)
    units_sold: float = Field(1200.0, ge=1)

class SegmentRequest(BaseModel):
    country: str = "India"
    fuel_type: str = "Electric"
    car_type: str = "SUV"
    price_usd: float = 25000.0

class GoalRequest(BaseModel):
    country: str = "India"
    target_revenue: float
    year: int = 2026

# ── Routes ────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health():
    try:
        bundle  = load_bundle()
        metrics = bundle.get("metrics", {})
        return {
            "status": "ok",
            "uptime_seconds": round(time.time() - _start_time, 1),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model_r2_revenue": metrics.get("r2_revenue"),
            "model_mae_revenue": metrics.get("mae_revenue"),
            "model_mape_revenue": metrics.get("mape_revenue"),
            "countries_supported": COUNTRIES,
            "forecast_horizon": "2025–2034",
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "detail": str(e),
            "traceback": traceback.format_exc()
        }


@app.get("/summary", tags=["Overview"])
def summary():
    """Global KPI summary — hero card data."""
    bundle   = load_bundle()
    hist     = pd.DataFrame(bundle["hist_global"])
    h_cntry  = pd.DataFrame(bundle["hist_country"])

    latest   = hist[hist["year"] == hist["year"].max()].iloc[0]
    prev     = hist[hist["year"] == hist["year"].max() - 1].iloc[0]

    rev_delta   = ((latest["revenue"] - prev["revenue"]) / prev["revenue"]) * 100
    profit_delta= ((latest["profit"]  - prev["profit"])  / prev["profit"])  * 100

    # 2025 global forecast
    fc = build_forecast_curve("India", 1, 2025, 2025)
    fc_rev = fc[0]["revenue"] if fc else 0

    top = get_top_performers(3)

    return {
        "latest_year":        int(latest["year"]),
        "total_revenue":      round(float(latest["revenue"]), 2),
        "total_profit":       round(float(latest["profit"]),  2),
        "total_units":        int(latest["units"]),
        "avg_margin_pct":     round(float(latest["margin"]),  2),
        "revenue_yoy_pct":    round(rev_delta,    2),
        "profit_yoy_pct":     round(profit_delta, 2),
        "forecast_2025_revenue": round(fc_rev, 2),
        "top_countries":      top["top_countries"],
        "top_models":         top["top_models"],
        "countries_count":    len(COUNTRIES),
        "models_count":       len(SPECS),
    }


@app.get("/historical", tags=["Historical"])
def historical(
    view: str = Query("global", description="global | country | model"),
    country: Optional[str] = None,
    years: int = Query(10, description="2, 5, or 10"),
):
    """Historical revenue, profit, units, margin with time-range filter."""
    bundle  = load_bundle()
    max_year = 2024
    min_year = max_year - years + 1

    if view == "global":
        df = pd.DataFrame(bundle["hist_global"])
        df = df[df["year"] >= min_year].sort_values("year")
        return {
            "view": "global",
            "years": years,
            "data": df.round(2).to_dict(orient="records"),
        }

    elif view == "country":
        df = pd.DataFrame(bundle["hist_country"])
        df = df[df["year"] >= min_year]
        if country:
            df = df[df["country"] == country]
        df = df.sort_values(["country", "year"])
        return {
            "view": "country",
            "country": country,
            "years": years,
            "data": df.round(2).to_dict(orient="records"),
        }

    elif view == "model":
        df = pd.DataFrame(bundle["hist_model"])
        df = df[df["year"] >= min_year].sort_values(["model_id", "year"])
        return {
            "view": "model",
            "years": years,
            "data": df.round(2).to_dict(orient="records"),
        }

    raise HTTPException(status_code=400, detail="view must be global | country | model")


@app.post("/predict", tags=["Forecasting"])
def predict(req: PredictRequest):
    """Single-point revenue & profit prediction."""
    bundle = load_bundle()
    gbr    = bundle["revenue_model"]
    le     = bundle["le_country"]
    feats  = bundle["features"]

    if req.country not in COUNTRIES:
        raise HTTPException(status_code=400, detail=f"Country must be one of {COUNTRIES}")

    try:
        country_enc = int(le.transform([req.country])[0])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid country")

    base = get_country_baseline(req.country, 2024)
    units = req.units_sold or base["units_sold"] * (1 + 0.03 * (req.year - 2024))
    rev_est = base["total_revenue"] * (1 + 0.03 * (req.year - 2024))

    row = {
        "year": req.year, "model_id": req.model_id,
        "country_enc": country_enc, "units_sold": units,
        "tax_rate_pct": req.tax_rate_pct,
        "local_manufacturing_cost_usd": req.local_manufacturing_cost_usd,
        "marketing_expense_usd": req.marketing_expense_usd,
        "r_and_d_expense_usd": req.r_and_d_expense_usd,
        "dealer_commission_pct": req.dealer_commission_pct,
        "rev_estimate": rev_est, "total_revenue": rev_est,
        "operating_expense_usd": req.local_manufacturing_cost_usd * 1.1,
        "warranty_cost_usd": 1300.0,
        "capital_expenditure_usd": 32000.0,
    }

    eng   = engineer_features(row)
    X     = pd.DataFrame([[eng[f] for f in feats]], columns=feats)
    pred  = float(gbr.predict(X)[0])
    ci    = compute_confidence_interval(pred)

    # Use profit model if available, fallback to 17.5% estimate
    profit_model = bundle.get("profit_model")
    if profit_model and bundle.get("profit_features"):
        try:
            from data_utils import engineer_profit_features
            pf = engineer_profit_features(row)
            Xp = pd.DataFrame([[pf[f] for f in bundle["profit_features"]]], columns=bundle["profit_features"])
            profit_est = float(profit_model.predict(Xp)[0])
        except Exception:
            profit_est = pred * 0.175
    else:
        profit_est = pred * 0.175

    return {
        "country":         req.country,
        "model_id":        req.model_id,
        "year":            req.year,
        "predicted_revenue": round(pred, 2),
        "predicted_profit":  round(profit_est, 2),
        "margin_pct":        round((profit_est / pred) * 100, 2),
        "units_forecast":    round(units, 0),
        "ci_lower":          ci["lower"],
        "ci_upper":          ci["upper"],
    }


@app.get("/forecast/{country}", tags=["Forecasting"])
def forecast_country(
    country: str,
    model_id: int = 1,
    years: int = Query(5, description="1, 5, or 10"),
    growth_rate: float = Query(0.03, description="Annual volume growth rate"),
):
    """Multi-year forecast curve for a country."""
    if country not in COUNTRIES:
        raise HTTPException(status_code=400, detail=f"Country must be one of {COUNTRIES}")

    end_year = 2024 + years
    curve    = build_forecast_curve(country, model_id, 2025, end_year, growth_rate)

    return {
        "country":    country,
        "model_id":   model_id,
        "years":      years,
        "start_year": 2025,
        "end_year":   end_year,
        "forecast":   curve,
    }


@app.get("/forecast-all", tags=["Forecasting"])
def forecast_all(years: int = Query(5, ge=1, le=10)):
    """Forecast for all 7 countries — used for world map and comparison."""
    result = {}
    for country in COUNTRIES:
        end_year = 2024 + years
        curve    = build_forecast_curve(country, 1, 2025, end_year)
        result[country] = curve
    return {"years": years, "forecasts": result}


@app.post("/what-if", tags=["Forecasting"])
def what_if(req: WhatIfRequest):
    """What-If simulator — adjust levers and see revenue impact."""
    bundle = load_bundle()
    gbr    = bundle["revenue_model"]
    le     = bundle["le_country"]
    feats  = bundle["features"]

    if req.country not in COUNTRIES:
        raise HTTPException(status_code=400, detail=f"Country must be one of {COUNTRIES}")

    country_enc = int(le.transform([req.country])[0])
    base        = get_country_baseline(req.country, 2024)
    base_rev    = base["total_revenue"]
    base_units  = base["units_sold"]

    units   = base_units  * (1 + req.units_delta / 100)
    mfg     = 15500.0
    mkt     = 5000.0  * (1 + req.marketing_delta / 100)
    rnd     = 8500.0  * (1 + req.rnd_delta / 100)
    rev_est = base_rev * (1 + req.units_delta / 100)
    cost_r  = ((mfg + mkt) / (rev_est + 1)) * (1 + req.cost_ratio_delta / 100)

    row = {
        "year": req.year, "model_id": req.model_id,
        "country_enc": country_enc, "units_sold": units,
        "tax_rate_pct": 15.0,
        "local_manufacturing_cost_usd": mfg,
        "marketing_expense_usd": mkt,
        "r_and_d_expense_usd": rnd,
        "dealer_commission_pct": 6.0,
        "rev_estimate": rev_est, "total_revenue": rev_est,
        "operating_expense_usd": mfg * 1.1,
        "warranty_cost_usd": 1300.0,
        "capital_expenditure_usd": 32000.0,
    }

    eng  = engineer_features(row)
    eng["cost_ratio"] = cost_r
    X    = pd.DataFrame([[eng[f] for f in feats]], columns=feats)
    pred = float(gbr.predict(X)[0])

    # Baseline prediction
    base_row = {**row, "cost_ratio": (mfg + 5000) / (base_rev + 1)}
    base_eng = engineer_features({**row, "rev_estimate": base_rev, "total_revenue": base_rev,
                                   "marketing_expense_usd": 5000.0, "r_and_d_expense_usd": 8500.0,
                                   "units_sold": base_units})
    X_base   = pd.DataFrame([[base_eng[f] for f in feats]], columns=feats)
    base_pred= float(gbr.predict(X_base)[0])

    delta    = pred - base_pred
    delta_pct= (delta / base_pred) * 100

    # Profit calculations
    base_margin = 0.175
    base_profit = base_pred * base_margin
    
    base_cost_ratio = 1 - base_margin
    adj_cost_ratio = base_cost_ratio * (1 + req.cost_ratio_delta / 100)
    adj_margin = 1 - adj_cost_ratio
    
    # The new profit includes the margin on the new revenue, minus extra investments
    extra_mkt = mkt - 5000.0
    extra_rnd = rnd - 8500.0
    investment_delta = extra_mkt + extra_rnd
    
    adjusted_profit = (pred * adj_margin) - investment_delta
    profit_delta = adjusted_profit - base_profit
    profit_delta_pct = (profit_delta / base_profit) * 100 if base_profit != 0 else 0
    
    roi_multiplier = profit_delta / investment_delta if investment_delta > 0 else 0.0

    return {
        "country":          req.country,
        "year":             req.year,
        "baseline_revenue": round(base_pred, 2),
        "adjusted_revenue": round(pred, 2),
        "delta":            round(delta, 2),
        "delta_pct":        round(delta_pct, 2),
        "baseline_profit":  round(base_profit, 2),
        "adjusted_profit":  round(adjusted_profit, 2),
        "profit_delta":     round(profit_delta, 2),
        "profit_delta_pct": round(profit_delta_pct, 2),
        "adjusted_margin_pct": round(adj_margin * 100, 2),
        "roi_multiplier":   round(roi_multiplier, 1),
        "levers_applied": {
            "cost_ratio_delta":    req.cost_ratio_delta,
            "rnd_delta":           req.rnd_delta,
            "marketing_delta":     req.marketing_delta,
            "units_delta":         req.units_delta,
        },
    }


@app.post("/price-optimize", tags=["Analysis"])
def price_optimize(req: PriceOptimizeRequest):
    """Suggest optimal price to hit target margin."""
    base     = get_country_baseline(req.country, 2024)
    avg_cost = 15500.0
    target_margin = req.target_margin_pct / 100

    optimal_price = avg_cost / (1 - target_margin)
    current_price = base["total_revenue"] / (base["units_sold"] + 1)
    revenue_est   = optimal_price * req.units_sold
    profit_est    = revenue_est   * target_margin

    return {
        "country":            req.country,
        "model_id":           req.model_id,
        "target_margin_pct":  req.target_margin_pct,
        "current_avg_price":  round(current_price, 2),
        "optimal_price_usd":  round(optimal_price, 2),
        "price_delta_pct":    round(((optimal_price - current_price) / current_price) * 100, 2),
        "estimated_revenue":  round(revenue_est, 2),
        "estimated_profit":   round(profit_est, 2),
        "units_input":        req.units_sold,
    }


@app.post("/segment-predict", tags=["Analysis"])
def segment_predict(req: SegmentRequest):
    """Predict likely customer segment for a given car/country."""
    fuel_segments = {
        "Electric":  {"age_group": "30–45", "income": "High",   "profession": "Tech/Engineer"},
        "Hybrid":    {"age_group": "45–60", "income": "High",   "profession": "Business"},
        "Petrol":    {"age_group": "30–45", "income": "Medium", "profession": "Service/Sales"},
        "Diesel":    {"age_group": "45–60", "income": "Medium", "profession": "Transport/Logistics"},
    }
    country_income = {
        "India": "Medium", "Germany": "High", "UK": "High",
        "USA": "High", "France": "High", "Australia": "High", "Japan": "High",
    }
    seg = fuel_segments.get(req.fuel_type, fuel_segments["Petrol"])
    churn_risk = "Low" if req.fuel_type in ["Electric", "Hybrid"] else "Medium"

    return {
        "country":          req.country,
        "fuel_type":        req.fuel_type,
        "car_type":         req.car_type,
        "predicted_segment": {
            "age_group":       seg["age_group"],
            "income_group":    country_income.get(req.country, "Medium"),
            "profession":      seg["profession"],
            "payment_mode":    "Loan" if req.price_usd > 20000 else "Cash",
            "loyalty_score":   0.72 if req.fuel_type == "Electric" else 0.58,
            "churn_risk":      churn_risk,
            "test_drive_prob": 0.68,
            "first_time_buyer_prob": 0.31,
        },
    }


@app.get("/models", tags=["Data"])
def get_models(
    fuel_type: Optional[str] = None,
    car_type:  Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by:   Optional[str] = Query(None, description="price_usd | horsepower | engine_cc | safety_rating"),
    sort_order: Optional[str] = Query("asc", description="asc | desc"),
):
    """Return car model specs with optional filters and sort."""
    data = SPECS.copy()
    if fuel_type:
        data = [m for m in data if m.get("fuel_type", "").lower() == fuel_type.lower()]
    if car_type:
        data = [m for m in data if m.get("car_type",  "").lower() == car_type.lower()]
    if min_price is not None:
        data = [m for m in data if float(m.get("price_usd", 0)) >= min_price]
    if max_price is not None:
        data = [m for m in data if float(m.get("price_usd", 0)) <= max_price]
    if sort_by and sort_by in ["price_usd", "horsepower", "engine_cc", "safety_rating"]:
        reverse = sort_order == "desc"
        data = sorted(data, key=lambda x: float(x.get(sort_by, 0) or 0), reverse=reverse)
    return {"count": len(data), "models": data}


@app.get("/model-sales", tags=["Data"])
def model_sales(
    country: Optional[str] = Query(None, description="Filter by country"),
    sort_by: Optional[str] = Query("total_revenue", description="total_revenue | units_sold | profit"),
    sort_order: Optional[str] = Query("desc", description="asc | desc"),
):
    """Per-model sales cards with specs, filterable by country."""
    fp = os.path.join(os.path.dirname(__file__), "..", "..", "TATA", "tata_car_finance.csv")
    try:
        df_all = pd.read_csv(fp)
    except Exception:
        raise HTTPException(500, "Finance dataset not found")

    df = df_all[df_all["country"] == country] if country else df_all.copy()

    agg = df.groupby("model_id").agg(
        units_sold=("units_sold", "sum"),
        total_revenue=("total_revenue", "sum"),
        profit=("profit", "sum"),
        avg_revenue_per_unit=("revenue_per_unit", "mean"),
        avg_margin_pct=("average_profit_margin_pct", "mean"),
        min_price=("min_price", "mean"),
        max_price=("max_price", "mean"),
    ).reset_index()

    if sort_by in ["total_revenue", "units_sold", "profit"]:
        agg = agg.sort_values(sort_by, ascending=(sort_order == "asc"))

    specs_map = {s["model_id"]: s for s in SPECS}
    cards = []
    for _, row in agg.iterrows():
        mid = int(row["model_id"])
        spec = specs_map.get(mid, {})
        cards.append({
            "model_id": mid,
            "car_model": spec.get("car_model", f"Model #{mid}"),
            "car_type": spec.get("car_type", ""),
            "fuel_type": spec.get("fuel_type", ""),
            "drivetrain": spec.get("drivetrain", "FWD"),
            "horsepower": spec.get("horsepower"),
            "engine_cc": spec.get("engine_cc"),
            "safety_rating": spec.get("safety_rating"),
            "transmission": spec.get("transmission", ""),
            "units_sold": int(round(row["units_sold"])),
            "total_revenue": round(float(row["total_revenue"]), 2),
            "profit": round(float(row["profit"]), 2),
            "avg_revenue_per_unit": round(float(row["avg_revenue_per_unit"]), 2),
            "avg_margin_pct": round(float(row["avg_margin_pct"]), 2),
            "min_price": round(float(row["min_price"]), 2),
            "max_price": round(float(row["max_price"]), 2),
        })

    ctot = df_all.groupby("country")["units_sold"].sum().sort_values(ascending=False).reset_index()
    ctot.columns = ["country", "total_units"]
    ctot["total_units"] = ctot["total_units"].round(0).astype(int)

    return {
        "country_filter": country or "All",
        "grand_total_units": int(df_all["units_sold"].sum()),
        "card_count": len(cards),
        "cards": cards,
        "country_totals": ctot.to_dict(orient="records"),
    }



@app.get("/compare", tags=["Analysis"])
def compare(
    countries: str = Query("India,Germany", description="Comma-separated list of countries"),
    years: int = Query(5, ge=1, le=10),
):
    """Side-by-side forecast comparison for multiple countries."""
    country_list = [c.strip() for c in countries.split(",")]
    invalid = [c for c in country_list if c not in COUNTRIES]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid countries: {invalid}")

    bundle = load_bundle()
    result = {}
    for c in country_list:
        curve = build_forecast_curve(c, 1, 2025, 2024 + years)
        h     = pd.DataFrame(bundle["hist_country"])
        h     = h[h["country"] == c].sort_values("year")
        result[c] = {
            "historical": h[["year", "revenue", "profit", "units"]].round(2).to_dict(orient="records"),
            "forecast":   curve,
        }
    return {"countries": country_list, "years": years, "data": result}


@app.get("/anomalies", tags=["Threat Analysis"])
def anomalies(threshold: float = Query(0.15, description="Deviation threshold 0.0–1.0")):
    """Detect historical anomalies — actual vs predicted deviation."""
    items = detect_anomalies(threshold)
    return {
        "threshold_pct": round(threshold * 100, 1),
        "count":         len(items),
        "anomalies":     items,
    }


@app.get("/alerts", tags=["Threat Analysis"])
def alerts():
    """Auto-generated smart business alerts based on forecast trends."""
    bundle  = load_bundle()
    hist    = pd.DataFrame(bundle["hist_global"])
    latest  = hist[hist["year"] == 2024].iloc[0]
    prev    = hist[hist["year"] == 2023].iloc[0]

    alerts_list = []

    rev_delta = ((latest["revenue"] - prev["revenue"]) / prev["revenue"]) * 100
    if rev_delta < 0:
        alerts_list.append({
            "type": "warning", "category": "Revenue",
            "message": f"Global revenue declined {abs(rev_delta):.1f}% in 2024 vs 2023. Forecast models suggest recovery by 2026.",
            "severity": "medium",
        })

    # Margin alert
    if latest["margin"] < 17.0:
        alerts_list.append({
            "type": "danger", "category": "Margin",
            "message": f"Profit margin at {latest['margin']:.1f}% — below 17% threshold. Cost ratio optimisation recommended.",
            "severity": "high",
        })

    # Forecast upside
    fc_india = build_forecast_curve("India", 1, 2025, 2026)
    if len(fc_india) >= 2:
        growth = ((fc_india[1]["revenue"] - fc_india[0]["revenue"]) / fc_india[0]["revenue"]) * 100
        alerts_list.append({
            "type": "success", "category": "Forecast",
            "message": f"India revenue forecast growing {growth:.1f}% year-over-year 2025→2026. EV segment driving demand.",
            "severity": "info",
        })

    alerts_list.append({
        "type": "info", "category": "Competition",
        "message": "BYD and Tesla expanding in Tata's top 3 markets. EV pricing pressure expected to intensify in 2026.",
        "severity": "medium",
    })

    alerts_list.append({
        "type": "warning", "category": "FX Risk",
        "message": "Multi-currency exposure across 6 currencies. INR/USD and GBP/USD volatility flagged as top financial threats.",
        "severity": "medium",
    })

    return {"count": len(alerts_list), "alerts": alerts_list}


@app.get("/top-performers", tags=["Overview"])
def top_performers(n: int = Query(5, ge=1, le=10)):
    return get_top_performers(n)


@app.get("/elasticity/{model_id}", tags=["Analysis"])
def elasticity(
    model_id: int,
    country: str = Query("India"),
    price_changes: str = Query("-20,-10,-5,0,5,10,20", description="Comma-separated % changes"),
):
    """Price elasticity — how price changes affect units & revenue."""
    changes = [float(x) for x in price_changes.split(",")]
    result  = compute_elasticity(model_id, country, changes)
    return {"model_id": model_id, "country": country, "elasticity": result}


@app.post("/goal-tracker", tags=["Analysis"])
def goal_tracker(req: GoalRequest):
    """Back-calculate what's needed to hit a revenue target."""
    if req.country not in COUNTRIES:
        raise HTTPException(status_code=400, detail=f"Country must be one of {COUNTRIES}")
    result = compute_goal_gap(req.target_revenue, req.country, req.year)
    return result


@app.get("/sankey-data", tags=["Overview"])
def sankey_data(year: int = Query(2024)):
    """Revenue flow: Country → Car Type → Fuel Type."""
    bundle  = load_bundle()
    h       = pd.DataFrame(bundle["hist_country"])
    row     = h[h["year"] == year]

    fuel_split  = {"Hybrid": 0.38, "Electric": 0.32, "Diesel": 0.16, "Petrol": 0.14}
    type_split  = {"SUV": 0.30, "Sedan": 0.22, "Hatchback": 0.18,
                   "MPV": 0.15, "Pickup": 0.10, "Coupe": 0.05}

    nodes, links = [], []
    node_map = {}

    def add_node(name):
        if name not in node_map:
            node_map[name] = len(nodes)
            nodes.append({"name": name})
        return node_map[name]

    for _, r in row.iterrows():
        rev = float(r["revenue"])
        ci  = add_node(r["country"])
        for ctype, cs in type_split.items():
            ct = add_node(ctype)
            links.append({"source": ci, "target": ct, "value": round(rev * cs / 1e9, 2)})
            for fuel, fs in fuel_split.items():
                fn = add_node(fuel)
                links.append({"source": ct, "target": fn, "value": round(rev * cs * fs / 1e9, 3)})

    return {"year": year, "nodes": nodes, "links": links}


@app.get("/model-performance", tags=["System"])
def model_performance():
    """Return ML model accuracy metrics."""
    bundle  = load_bundle()
    metrics = bundle.get("metrics", {})
    return {
        "algorithm":       "Gradient Boosting Regressor (XGBoost-equivalent)",
        "n_estimators":    300,
        "max_depth":       5,
        "learning_rate":   0.08,
        "train_test_split":"80/20",
        "cv_folds":        5,
        "metrics": {
            "r2_revenue":    metrics.get("r2_revenue", 0.9953),
            "mae_revenue":   metrics.get("mae_revenue", 5361738),
            "mape_revenue":  metrics.get("mape_revenue", 8.45),
            "r2_profit":     metrics.get("r2_profit",  0.6618),
        },
        "top_features": [
            {"feature": "cost_ratio",    "importance": 0.295},
            {"feature": "rnd_ratio",     "importance": 0.229},
            {"feature": "opex_ratio",    "importance": 0.114},
            {"feature": "units_sold",    "importance": 0.124},
            {"feature": "rev_per_unit",  "importance": 0.119},
        ],
    }
