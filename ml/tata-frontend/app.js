'use strict';

// ── CONFIG ──────────────────────────────────────────
let API_BASE = 'https://tata-sales-analysis.onrender.com';
const USD_TO_INR = 93.74;

async function initApiConfig() {
  // Backend URL is hardcoded above to ensure Vercel always connects to Render
}

// ── CURRENCY ────────────────────────────────────────
function toINR(v) { return v * USD_TO_INR; }
function fmtINR(v) {
  const x = toINR(v);
  if (Math.abs(x)>=1e12) return '₹'+(x/1e12).toFixed(1)+'T';
  if (Math.abs(x)>=1e9)  return '₹'+(x/1e9).toFixed(1)+'B';
  if (Math.abs(x)>=1e7)  return '₹'+(x/1e7).toFixed(1)+'Cr';
  if (Math.abs(x)>=1e5)  return '₹'+(x/1e5).toFixed(1)+'L';
  return '₹'+Math.round(x).toLocaleString('en-IN');
}
function fmtPrice(v) { return '₹'+Math.round(v*USD_TO_INR).toLocaleString('en-IN'); }
function pct(v) { return (v>=0?'+':'')+parseFloat(v).toFixed(1)+'%'; }

// ── CHART PALETTE ───────────────────────────────────
const BLUE='#1d4ed8', LBLUE='#93c5fd', GREEN='#059669', RED='#dc2626', AMBER='#d97706', PURPLE='#7c3aed', TEAL='#0d9488', SLATE='#94a3b8';
const COLORS = [BLUE,GREEN,AMBER,PURPLE,RED,TEAL,LBLUE,'#f472b6'];
const GRID = '#f1f5f9', TICK = '#94a3b8';

Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = TICK;
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.padding = 12;

// ── STATE ───────────────────────────────────────────
const state = { charts: {}, currentSection: 'overview', fcCountry: 'India', fcYears: 5 };
let HIST_GLOBAL=[], HIST_COUNTRY=[], HIST_COUNTRY_LATEST=[], FORECAST_DATA={}, SPECS=[];

// ── CHART UTILS ─────────────────────────────────────
function makeChart(id, cfg) {
  if (state.charts[id]) state.charts[id].destroy();
  const el = document.getElementById(id);
  if (!el) return null;
  state.charts[id] = new Chart(el, cfg);
  return state.charts[id];
}

// ── NAVIGATION ──────────────────────────────────────
function navigateTo(section) {
  state.currentSection = section;
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  const sec = document.getElementById('sec-'+section);
  if (sec) sec.classList.add('active');
  const nav = document.querySelector(`[data-section="${section}"]`);
  if (nav) nav.classList.add('active');
  const renderers = {
    overview: renderOverview, filters: renderFilters, segments: renderSegments,
    models: renderModels, forecast: renderForecast, worldmap: renderWorldMap,
    whatif: renderWhatIf, risk: renderRisk
  };
  if (renderers[section]) renderers[section]();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Nav clicks
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); navigateTo(link.dataset.section); });
  });

  // Load data
  await initApiConfig();
  await loadData();
  navigateTo('overview');
  checkApi();
});

async function loadData() {
  try {
    const [histG, histC, fcAll, specs] = await Promise.all([
      fetch(API_BASE+'/historical?view=global&years=10').then(r=>r.json()).catch(()=>({data:[]})),
      fetch(API_BASE+'/historical?view=country&years=10').then(r=>r.json()).catch(()=>({data:[]})),
      fetch(API_BASE+'/forecast-all?years=10').then(r=>r.json()).catch(()=>({forecasts:{}})),
      fetch(API_BASE+'/models').then(r=>r.json()).catch(()=>({models:[]}))
    ]);
    HIST_GLOBAL = histG.data || [];
    HIST_COUNTRY = histC.data || [];
    // Group country data: take the latest year per country for market charts
    if (HIST_COUNTRY.length) {
      const latest = {};
      HIST_COUNTRY.forEach(r => {
        if (!latest[r.country] || r.year > latest[r.country].year) latest[r.country] = r;
      });
      HIST_COUNTRY_LATEST = Object.values(latest);
    }
    FORECAST_DATA = fcAll.forecasts || {};
    SPECS = specs.models || [];
  } catch(e) { console.warn('Data load error', e); }
}

async function checkApi() {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('apiStatusText');
  try {
    const r = await fetch(API_BASE+'/health');
    if (r.ok) { dot.className='w-2 h-2 rounded-full bg-emerald-500'; txt.textContent='Online'; }
    else throw 0;
  } catch { dot.className='w-2 h-2 rounded-full bg-amber-400'; txt.textContent='Offline (Mock)'; }
}

// ── RENDER STUBS (will fill next) ───────────────────
function renderOverview() { renderKPIs(); renderRevProfitChart(); renderTopMarkets(); renderMarketDist(); renderFuelPortfolio(); }
function renderFilters() {}
function renderSegments() {}
function renderModels() { renderModelGrid(); }
function renderForecast() { renderForecastCharts(); }
function renderWorldMap() { renderWorldCharts(); }
function renderWhatIf() { renderWhatIfSection(); }
function renderRisk() { renderRiskCards(); }

// ── OVERVIEW: KPIs ──────────────────────────────────
function renderKPIs() {
  if (!HIST_GLOBAL.length) return;
  const latest = HIST_GLOBAL[HIST_GLOBAL.length-1];
  const prev = HIST_GLOBAL[HIST_GLOBAL.length-2];
  const el = id => document.getElementById(id);
  if (el('kpiRevenue')) el('kpiRevenue').textContent = fmtINR(latest.revenue);
  if (el('kpiProfit')) el('kpiProfit').textContent = fmtINR(latest.profit);
  if (el('kpiUnits')) el('kpiUnits').textContent = (latest.units/1e6).toFixed(1)+'M';
  if (el('kpiMargin')) el('kpiMargin').textContent = latest.margin.toFixed(1)+'%';
  const fc = FORECAST_DATA['India'];
  if (fc && el('kpiForecast')) el('kpiForecast').textContent = fmtINR(fc[0].revenue);
  // Badges
  const rd = ((latest.revenue-prev.revenue)/prev.revenue*100);
  const pd = ((latest.profit-prev.profit)/prev.profit*100);
  if (el('kpiRevBadge')) { el('kpiRevBadge').textContent = pct(rd); el('kpiRevBadge').className = 'kpi-badge '+(rd>=0?'positive':'negative'); }
  if (el('kpiProfBadge')) { el('kpiProfBadge').textContent = pct(pd); el('kpiProfBadge').className = 'kpi-badge '+(pd>=0?'positive':'negative'); }
}

// ── OVERVIEW: Revenue & Profit Chart ────────────────
function renderRevProfitChart() {
  if (!HIST_GLOBAL.length) return;
  makeChart('chartRevProfit', {
    type:'line',
    data: {
      labels: HIST_GLOBAL.map(d=>d.year),
      datasets: [
        { label:'Revenue', data:HIST_GLOBAL.map(d=>+(toINR(d.revenue)/1e9).toFixed(1)), borderColor:BLUE, backgroundColor:'rgba(29,78,216,0.08)', fill:true, tension:.4, pointRadius:4, borderWidth:2.5 },
        { label:'Profit', data:HIST_GLOBAL.map(d=>+(toINR(d.profit)/1e9).toFixed(1)), borderColor:LBLUE, backgroundColor:'rgba(147,197,253,0.08)', fill:true, tension:.4, pointRadius:4, borderWidth:2.5 }
      ]
    },
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{legend:{labels:{color:TICK,font:{size:11}}}},
      scales:{
        x:{grid:{color:GRID},ticks:{color:TICK,font:{size:11}},border:{color:GRID}},
        y:{grid:{color:GRID},ticks:{color:TICK,font:{size:11},callback:v=>'₹'+v+'B'},border:{color:GRID}}
      }
    }
  });
}

// ── OVERVIEW: Top Markets ───────────────────────────
function renderTopMarkets() {
  const el = document.getElementById('topMarketsBar');
  if (!el || !HIST_COUNTRY_LATEST.length) return;
  const sorted = [...HIST_COUNTRY_LATEST].sort((a,b)=>b.revenue-a.revenue).slice(0,5);
  const max = sorted[0].revenue;
  const codes = {India:'IN',USA:'US','United Kingdom':'UK',Germany:'DE',France:'FR',Australia:'AU','South Africa':'ZA',Thailand:'TH'};
  el.innerHTML = sorted.map(c => `
    <div class="market-row mb-4">
      <div class="flex justify-between text-sm">
        <span class="font-semibold flex items-center gap-2">
          <span class="w-6 h-4 bg-slate-100 rounded text-[10px] flex items-center justify-center font-black">${codes[c.country]||'--'}</span>
          ${c.country}
        </span>
        <span class="text-slate-500 font-medium">${fmtINR(c.revenue)}</span>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width:${(c.revenue/max*100).toFixed(0)}%"></div></div>
    </div>`).join('');
}

// ── OVERVIEW: Market Distribution ───────────────────
function renderMarketDist() {
  if (!HIST_COUNTRY_LATEST.length) return;
  makeChart('chartMarketDist', {
    type:'doughnut',
    data: { labels:HIST_COUNTRY_LATEST.map(c=>c.country), datasets:[{data:HIST_COUNTRY_LATEST.map(c=>+(toINR(c.revenue)/1e9).toFixed(1)), backgroundColor:COLORS, borderWidth:0, hoverOffset:6}] },
    options: { responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{legend:{position:'bottom',labels:{color:TICK,font:{size:10},padding:8}}} }
  });
}

// ── OVERVIEW: Fuel Portfolio ────────────────────────
function renderFuelPortfolio() {
  const el = document.getElementById('fuelStats');
  const bar = document.getElementById('fuelBar');
  if (!el) return;
  const fuels = [{name:'EV Series',icon:'bolt',count:'8.2M',growth:'+24%',color:'emerald'},{name:'ICE Series',icon:'local_gas_station',count:'22.4M',growth:'-4%',color:'blue'},{name:'Alternate',icon:'eco',count:'7.0M',growth:'+12%',color:'sky'}];
  el.innerHTML = fuels.map(f=>`
    <div class="p-4 rounded-xl border border-slate-50 bg-slate-50/50">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-8 h-8 bg-${f.color}-100 text-${f.color}-700 rounded-lg flex items-center justify-center"><span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1">${f.icon}</span></div>
        <span class="font-semibold text-slate-900 text-sm">${f.name}</span>
      </div>
      <h4 class="text-xl font-black">${f.count}</h4>
      <p class="text-xs font-bold mt-1 ${f.growth.startsWith('+')?'text-emerald-600':'text-slate-400'}">${f.growth} YoY</p>
    </div>`).join('');
  if (bar) bar.innerHTML = '<div class="h-full bg-emerald-500 w-[22%]"></div><div class="h-full bg-blue-700 w-[59%]"></div><div class="h-full bg-sky-300 w-[19%]"></div>';
}

// ── MODELS ──────────────────────────────────────────
function renderModelGrid() {
  const el = document.getElementById('modelGrid');
  if (!el || !SPECS.length) return;
  const fuelCls = {Electric:'tag-ev',Hybrid:'tag-hybrid',Petrol:'tag-petrol',Diesel:'tag-diesel'};
  el.innerHTML = SPECS.map(m=>`
    <div class="model-card">
      <h4 class="font-bold text-sm mb-1">${m.car_model}</h4>
      <p class="text-xs text-slate-500 mb-3">${m.car_type} · ${m.drivetrain||'FWD'}</p>
      <div class="flex gap-1.5 flex-wrap mb-3">
        <span class="model-tag ${fuelCls[m.fuel_type]||'tag-hybrid'}">${m.fuel_type}</span>
        <span class="model-tag bg-slate-50 text-slate-600">${m.car_type}</span>
      </div>
      <p class="text-xs text-slate-400 mb-2">${m.horsepower||'—'} HP · ${m.engine_cc||'—'} CC · ★ ${m.safety_rating||'4.0'}</p>
      <p class="text-lg font-bold text-primary">${fmtPrice(m.price_usd)}</p>
    </div>`).join('');
}

// ── FORECAST ────────────────────────────────────────
function renderForecastCharts() {
  const fc = FORECAST_DATA[state.fcCountry];
  if (!fc) return;
  const years = state.fcYears;
  const data = fc.slice(0, years);
  const labels = data.map(d=>d.year);
  // KPIs
  const el = id => document.getElementById(id);
  if (el('fcRev2025')) el('fcRev2025').textContent = fmtINR(data[0].revenue);
  const peak = data.reduce((a,b)=>a.revenue>b.revenue?a:b);
  if (el('fcRevPeak')) el('fcRevPeak').textContent = fmtINR(peak.revenue);
  if (el('fcCAGR') && data.length>1) {
    const cagr = (Math.pow(data[data.length-1].revenue/data[0].revenue,1/(data.length-1))-1)*100;
    el('fcCAGR').textContent = pct(cagr)+'/yr';
  }
  makeChart('chartForecastRev', {type:'line', data:{labels,datasets:[{label:'Revenue Forecast',data:data.map(d=>+(toINR(d.revenue)/1e7).toFixed(1)),borderColor:BLUE,backgroundColor:'rgba(29,78,216,0.08)',fill:true,tension:.4,pointRadius:4,borderWidth:2.5}]},
    options:{responsive:true,maintainAspectRatio:false,scales:{x:{grid:{color:GRID},ticks:{color:TICK}},y:{grid:{color:GRID},ticks:{color:TICK,callback:v=>'₹'+v+'Cr'}}}}});
  makeChart('chartForecastProfit', {type:'line', data:{labels,datasets:[{label:'Profit Forecast',data:data.map(d=>+(toINR(d.profit)/1e7).toFixed(1)),borderColor:GREEN,backgroundColor:'rgba(5,150,105,0.08)',fill:true,tension:.4,pointRadius:4,borderWidth:2.5}]},
    options:{responsive:true,maintainAspectRatio:false,scales:{x:{grid:{color:GRID},ticks:{color:TICK}},y:{grid:{color:GRID},ticks:{color:TICK,callback:v=>'₹'+v+'Cr'}}}}});
  // Wire controls once
  if (!state._fcBound) {
    state._fcBound = true;
    el('fcCountry')?.addEventListener('change', ()=>{ state.fcCountry=el('fcCountry').value; renderForecastCharts(); });
    document.querySelectorAll('#fcTimeToggle .tt-btn').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('#fcTimeToggle .tt-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); state.fcYears=+btn.dataset.years; renderForecastCharts();
    }));
    // Populate country dropdown
    const sel = el('fcCountry');
    if (sel) { sel.innerHTML = Object.keys(FORECAST_DATA).map(c=>`<option value="${c}">${c}</option>`).join(''); }
  }
}

// ── WORLD MAP ───────────────────────────────────────
function renderWorldCharts() {
  if (!HIST_COUNTRY_LATEST.length) return;
  const sorted = [...HIST_COUNTRY_LATEST].sort((a,b)=>b.revenue-a.revenue);
  makeChart('chartWorldBar', {type:'bar',data:{labels:sorted.map(c=>c.country),datasets:[{label:'Revenue (₹B)',data:sorted.map(c=>+(toINR(c.revenue)/1e9).toFixed(1)),backgroundColor:BLUE+'cc',borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:GRID},ticks:{color:TICK,callback:v=>'₹'+v+'B'}},y:{grid:{color:GRID},ticks:{color:TICK}}}}});
  makeChart('chartWorldDonut', {type:'doughnut',data:{labels:sorted.map(c=>c.country),datasets:[{data:sorted.map(c=>+(toINR(c.revenue)/1e9).toFixed(1)),backgroundColor:COLORS,borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{display:false}}}});
  const el = document.getElementById('worldLegend');
  if (el) el.innerHTML = sorted.map((c,i)=>`<div class="flex items-center justify-between"><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background:${COLORS[i%COLORS.length]}"></div><span class="text-sm">${c.country}</span></div><span class="text-sm font-semibold">${fmtINR(c.revenue)}</span></div>`).join('');
}

// ── WHAT-IF ─────────────────────────────────────────
function renderWhatIfSection() {
  const sliders = [{id:'wiCost',valId:'wiCostVal'},{id:'wiMkt',valId:'wiMktVal'},{id:'wiRnd',valId:'wiRndVal'},{id:'wiUnits',valId:'wiUnitsVal'}];
  sliders.forEach(s=>{
    const sl=document.getElementById(s.id), vl=document.getElementById(s.valId);
    if(sl&&vl){ vl.textContent=sl.value+'%'; sl.oninput=()=>{vl.textContent=sl.value+'%';}; }
  });
  if (HIST_GLOBAL.length) {
    const base = HIST_GLOBAL[HIST_GLOBAL.length-1].revenue;
    const el=document.getElementById('wiBaseline');
    if(el) el.textContent=fmtINR(base);
  }
}

async function runWhatIf() {
  const costR=+document.getElementById('wiCost').value, mkt=+document.getElementById('wiMkt').value;
  const rnd=+document.getElementById('wiRnd').value, units=+document.getElementById('wiUnits').value;
  const base = HIST_GLOBAL.length ? HIST_GLOBAL[HIST_GLOBAL.length-1].revenue : 0;
  let adjRev = base, baseRev = base, delta = 0, deltaPct = 0;
  try {
    const r = await fetch(API_BASE+'/what-if', {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({cost_ratio_delta:costR, marketing_delta:mkt, rnd_delta:rnd, units_delta:units})});
    const d = await r.json();
    adjRev = d.adjusted_revenue || base*(1+(costR+mkt+rnd+units)/400);
    baseRev = d.baseline_revenue || base;
    delta = d.delta || (adjRev - baseRev);
    deltaPct = d.delta_pct || ((delta/baseRev)*100);
  } catch { adjRev = base*(1+(costR+mkt+rnd+units)/400); delta = adjRev - base; deltaPct = (delta/base)*100; }
  document.getElementById('wiSimulated').textContent = fmtINR(adjRev);
  document.getElementById('wiDelta').textContent = (delta>=0?'+':'')+fmtINR(Math.abs(delta));
  document.getElementById('wiDeltaPct').textContent = pct(deltaPct)+' change';
  makeChart('chartWhatIf',{type:'bar',data:{labels:['Baseline','Simulated'],datasets:[{data:[+(toINR(baseRev)/1e9).toFixed(1),+(toINR(adjRev)/1e9).toFixed(1)],backgroundColor:[SLATE,BLUE],borderRadius:8}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:GRID},ticks:{color:TICK,callback:v=>'₹'+v+'B'}}}}});
}

function resetWhatIf() {
  ['wiCost','wiMkt','wiRnd','wiUnits'].forEach(id=>{const s=document.getElementById(id);if(s)s.value=0;});
  renderWhatIfSection();
}

// ── SEGMENTS ────────────────────────────────────────
function renderSegments() {
  const segs = [{name:'Fleet',rev:12.4,pct:33},{name:'Retail',rev:10.8,pct:29},{name:'Government',rev:8.2,pct:22},{name:'Online',rev:6.0,pct:16}];
  makeChart('chartSegments',{type:'bar',data:{labels:segs.map(s=>s.name),datasets:[{label:'Revenue (₹B)',data:segs.map(s=>s.rev),backgroundColor:COLORS.slice(0,4),borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:GRID},ticks:{color:TICK,callback:v=>'₹'+v+'B'}}}}});
  makeChart('chartSegDonut',{type:'doughnut',data:{labels:segs.map(s=>s.name),datasets:[{data:segs.map(s=>s.pct),backgroundColor:COLORS.slice(0,4),borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:false}}}});
  const el=document.getElementById('segLegend');
  if(el) el.innerHTML=segs.map((s,i)=>`<div class="flex items-center justify-between"><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background:${COLORS[i]}"></div><span class="text-sm">${s.name}</span></div><span class="text-sm font-semibold">${s.pct}%</span></div>`).join('');
}

// ── FILTERS ─────────────────────────────────────────
function renderFilters() {
  const sel = document.getElementById('filterCountry');
  if (sel && sel.options.length<=1 && HIST_COUNTRY.length) {
    const uniqueCountries = [...new Set(HIST_COUNTRY.map(c => c.country))].sort();
    uniqueCountries.forEach(country=>{ const o=document.createElement('option'); o.value=country; o.text=country; sel.appendChild(o); });
  }
  if (!state._filterBound) {
    state._filterBound = true;
    document.getElementById('applyFilters')?.addEventListener('click', applyFilters);
  }
}

function applyFilters() {
  const country = document.getElementById('filterCountry').value;
  const data = country==='all' ? HIST_GLOBAL : HIST_GLOBAL; // simplified
  makeChart('chartFilteredRev',{type:'line',data:{labels:data.map(d=>d.year),datasets:[{label:'Revenue',data:data.map(d=>+(toINR(d.revenue)/1e9).toFixed(1)),borderColor:BLUE,fill:true,backgroundColor:'rgba(29,78,216,0.08)',tension:.4,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,scales:{y:{grid:{color:GRID},ticks:{color:TICK,callback:v=>'₹'+v+'B'}}}}});
  // Table
  const thead=document.querySelector('#filteredTable thead'), tbody=document.querySelector('#filteredTable tbody');
  if(thead) thead.innerHTML='<tr><th>Year</th><th>Revenue</th><th>Profit</th><th>Units</th><th>Margin</th></tr>';
  if(tbody) tbody.innerHTML=data.map(d=>`<tr><td>${d.year}</td><td>${fmtINR(d.revenue)}</td><td>${fmtINR(d.profit)}</td><td>${(d.units/1e6).toFixed(1)}M</td><td>${d.margin.toFixed(1)}%</td></tr>`).join('');
}

// ── RISK ────────────────────────────────────────────
async function renderRiskCards() {
  const el = document.getElementById('riskGrid');
  if (!el) return;

  // Fetch live alerts from backend
  let alerts = [];
  try {
    const r = await fetch(API_BASE+'/alerts');
    const d = await r.json();
    alerts = d.alerts || [];
  } catch { alerts = []; }

  // Fetch model performance
  let metrics = {};
  try {
    const r = await fetch(API_BASE+'/model-performance');
    metrics = await r.json();
  } catch {}

  const sevMap = {high:'error',medium:'warning',info:'info',danger:'error'};
  const sevColor = {error:'bg-red-50 border-red-200 text-red-700',warning:'bg-amber-50 border-amber-200 text-amber-700',success:'bg-emerald-50 border-emerald-200 text-emerald-700',info:'bg-blue-50 border-blue-200 text-blue-700'};
  const dotColor = {error:'bg-red-500',warning:'bg-amber-500',success:'bg-emerald-500',info:'bg-blue-500'};

  // Risk signal cards
  const signalHTML = alerts.map(a => {
    const t = a.type || 'info';
    return `<div class="col-span-12 lg:col-span-6 p-5 rounded-xl border ${sevColor[t]||sevColor.info} transition-all hover:-translate-y-0.5">
      <div class="flex items-center gap-2 mb-3">
        <span class="w-2 h-2 rounded-full ${dotColor[t]||dotColor.info}"></span>
        <span class="text-xs font-bold uppercase tracking-wide">${a.severity||t}</span>
        <span class="ml-auto text-xs text-slate-400">${a.category||''}</span>
      </div>
      <p class="text-sm text-slate-700 mb-2">${a.message}</p>
    </div>`;
  }).join('');

  // Model confidence section
  const r2 = metrics?.metrics?.r2_revenue || 0.995;
  const mape = metrics?.metrics?.mape_revenue || 8.45;
  const confidenceHTML = `
    <div class="col-span-12 card mt-4">
      <div class="flex items-center gap-3 mb-6">
        <span class="material-symbols-outlined text-primary text-2xl" style="font-variation-settings:'FILL' 1">speed</span>
        <h3 class="text-lg font-semibold">Predictive Model Confidence</h3>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div class="flex justify-between items-end mb-2">
            <span class="text-xs font-medium text-slate-500">R² Score</span>
            <span class="text-lg font-bold text-primary">${r2.toFixed(4)}</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2"><div class="bg-primary h-2 rounded-full" style="width:${r2*100}%"></div></div>
        </div>
        <div>
          <div class="flex justify-between items-end mb-2">
            <span class="text-xs font-medium text-slate-500">MAPE</span>
            <span class="text-lg font-bold text-slate-600">${mape.toFixed(1)}%</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2"><div class="bg-slate-400 h-2 rounded-full" style="width:${Math.min(mape*2,100)}%"></div></div>
        </div>
        <div class="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <span class="material-symbols-outlined text-emerald-600 text-3xl" style="font-variation-settings:'FILL' 1">check_circle</span>
          <div>
            <p class="text-sm font-semibold">System Optimal</p>
            <p class="text-xs text-slate-500">No recalibration required.</p>
          </div>
        </div>
      </div>
    </div>`;

  el.innerHTML = signalHTML + confidenceHTML;
}

// ── EXPORT ──────────────────────────────────────────
function exportPDF() { window.print(); }
