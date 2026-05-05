# Tata Motors Sales Intelligence Platform

![Tata Motors Platform](https://img.shields.io/badge/Status-Completed-success) ![Machine Learning](https://img.shields.io/badge/ML-Gradient_Boosting_Regressor-blue) ![Backend](https://img.shields.io/badge/Backend-FastAPI-teal) ![Frontend](https://img.shields.io/badge/Frontend-React%2FVite-blue)

An advanced, machine-learning-powered sales and business intelligence dashboard designed for Tata Motors. This tool operationalizes historical sales data across 7 global markets (2015-2024) to predict revenue, forecast growth targets, detect market anomalies, and evaluate product-level price elasticity.

*In academic association with **Invertis University Bareilly** and **DUCAT School of AI**.*

## Key Features

1. **Global Sales Forecasting**: High-accuracy forecasting (2025–2034) powered by a trained Gradient Boosting Regressor model (R² = 0.9953).
2. **Interactive What-If Simulator**: Adjust corporate levers—such as R&D investments, marketing spend, and manufacturing cost ratios—to instantly simulate the aggregate impact on market revenue.
3. **Goal Tracker & Gap Analysis**: Set future revenue targets and let the ML engine reverse-engineer the required cost reductions to achieve them.
4. **Segment Prediction**: Determines primary customer segmentation arrays, churn risks, and loyalty scores based on selected models, fuel types, and prices.
5. **Anomaly Detection**: Compares raw historical values against ML-predicted expectations to flag underlying positive/negative anomalies autonomously.
6. **Price Elasticity Engine**: Calculates revenue impact when adjusting MSRP base costs across different regions.

## Machine Learning Model Details

The predictive engine is powered by an **XGBoost (Gradient Boosting Regressor)** model.
*   **Accuracy (R² Score):** 0.9953 (99.53%)
*   **Error Rate (MAPE):** 8.45%
*   **Artifact:** `model_bundle.pkl`

## Project Architecture

The repository is modular and divided into two core architectures:

### 1. Backend (`/ml/tata-backend`)
A High-performance API built with **FastAPI** wrapping the serialized Scikit-Learn `XGBoost` model bundle (`model_bundle.pkl`). 
*   **Technologies**: Python 3, FastAPI, Pandas, NumPy, Scikit-Learn.
*   **Endpoints**:
    *   `GET /summary`: Core KPI snapshot.
    *   `GET /historical`: Retrieves historical metrics by global or country filter.
    *   `GET /models`: Inventory of 50 globally available Tata models.
    *   `GET /forecast-all`: Dynamic generation of future scaling forecasts.
    *   `POST /what-if`: Simulation engine for corporate levers.
    *   `POST /goal-tracker`: Gap analysis and lever requirement generator.
    *   `POST /segment-predict`: Outputs customer segmentation profiles.

### 2. Frontend (`/ml/tata-frontend-v2`)
A modern, responsive UI built with **React** and **Vite**, featuring a premium dark theme ("Tata Dark").
*   **Technologies**: React, Vite, Tailwind CSS, Recharts.
*   **Features**: Asynchronous API integration, advanced visualizations, profit/ROI simulations, and interactive what-if scenarios.

## Local Setup Instructions

### Backend
1. Navigate to the backend directory:
   ```bash
   cd "ml/tata-backend"
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the API Server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd "ml/tata-frontend-v2"
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the dashboard at `http://localhost:5173`.

> **Note on Configuration**: The frontend expects the backend to run on `http://localhost:8000`. You can change this in `ml/tata-frontend-v2/src/services/api.js` if necessary.

## Academic Contributions
This full-stack system was conceptualized and completed as a capstone project under the guidance of our institutional sponsors:
*   **Institution:** Invertis University Bareilly
*   **Training & Execution Partner:** DUCAT School of AI
*   **Author:** Ankur 
