/**
 * Tata Motors Sales Intelligence — API Service Layer
 * Connects React frontend to FastAPI backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://tata-sales.onrender.com';

async function request(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] ${url}`, err.message);
    throw err;
  }
}

function post(url, body) {
  return request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const api = {
  health:        ()                => request(`${API_BASE}/health`),
  summary:       ()                => request(`${API_BASE}/summary`),
  historical:    (view='global', years=10, country=null) =>
    request(`${API_BASE}/historical?view=${view}&years=${years}${country ? '&country='+country : ''}`),
  forecast:      (country, years=5, modelId=1) =>
    request(`${API_BASE}/forecast/${country}?model_id=${modelId}&years=${years}`),
  forecastAll:   (years=5)         => request(`${API_BASE}/forecast-all?years=${years}`),
  predict:       (body)            => post(`${API_BASE}/predict`, body),
  whatIf:        (body)            => post(`${API_BASE}/what-if`, body),
  priceOptimize: (body)            => post(`${API_BASE}/price-optimize`, body),
  segmentPredict:(body)            => post(`${API_BASE}/segment-predict`, body),
  goalTracker:   (body)            => post(`${API_BASE}/goal-tracker`, body),
  models:        (params={})       => request(`${API_BASE}/models?${new URLSearchParams(params)}`),
  compare:       (countries, years=5) =>
    request(`${API_BASE}/compare?countries=${countries}&years=${years}`),
  anomalies:     (threshold=0.15)  => request(`${API_BASE}/anomalies?threshold=${threshold}`),
  alerts:        ()                => request(`${API_BASE}/alerts`),
  topPerformers: (n=5)             => request(`${API_BASE}/top-performers?n=${n}`),
  elasticity:    (modelId, country='India', changes='-20,-10,-5,0,5,10,20') =>
    request(`${API_BASE}/elasticity/${modelId}?country=${country}&price_changes=${changes}`),
  sankeyData:    (year=2024)       => request(`${API_BASE}/sankey-data?year=${year}`),
  modelPerf:     ()                => request(`${API_BASE}/model-performance`),
  modelSales:    (params={})       => request(`${API_BASE}/model-sales?${new URLSearchParams(params)}`),
};

/* Currency helpers */
export const USD_TO_INR = 93.74;
export const toINR = (v) => v * USD_TO_INR;
export const fmtINR = (v) => {
  const x = toINR(v);
  if (Math.abs(x) >= 1e12) return '₹' + (x/1e12).toFixed(1) + 'T';
  if (Math.abs(x) >= 1e9)  return '₹' + (x/1e9).toFixed(1) + 'B';
  if (Math.abs(x) >= 1e7)  return '₹' + (x/1e7).toFixed(1) + 'Cr';
  if (Math.abs(x) >= 1e5)  return '₹' + (x/1e5).toFixed(1) + 'L';
  return '₹' + Math.round(x).toLocaleString('en-IN');
};
export const fmtPrice = (v) => '₹' + Math.round(v * USD_TO_INR).toLocaleString('en-IN');
export const pct = (v) => (v >= 0 ? '+' : '') + parseFloat(v).toFixed(1) + '%';
export const fmtNum = (v) => {
  if (Math.abs(v) >= 1e6) return (v/1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return (v/1e3).toFixed(1) + 'K';
  return Math.round(v).toLocaleString('en-IN');
};

export default api;
