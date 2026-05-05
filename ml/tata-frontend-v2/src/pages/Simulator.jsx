import { useState } from 'react';
import { api, fmtINR, pct } from '../services/api';
import ChartCard from '../components/cards/ChartCard';
import { SelectField, SliderField, Button } from '../components/ui/FormControls';
import { Play, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COUNTRIES = ['Australia','France','Germany','India','Japan','UK','USA'];

export default function Simulator() {
  const [country, setCountry] = useState('India');
  const [cost, setCost] = useState(0);
  const [mkt, setMkt] = useState(0);
  const [rnd, setRnd] = useState(0);
  const [units, setUnits] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSim = async () => {
    setLoading(true);
    try {
      const r = await api.whatIf({ country, cost_ratio_delta: cost, marketing_delta: mkt, rnd_delta: rnd, units_delta: units });
      setResult(r);
    } catch { setResult(null); }
    setLoading(false);
  };

  const reset = () => { setCost(0); setMkt(0); setRnd(0); setUnits(0); setResult(null); };

  const revenueData = result ? [
    { name: 'Current Forecast', value: result.baseline_revenue, fill: '#94a3b8' },
    { name: 'New Scenario', value: result.adjusted_revenue, fill: '#003c75' },
  ] : [];

  const profitData = result ? [
    { name: 'Current Profit', value: result.baseline_profit, fill: '#94a3b8' },
    { name: 'New Profit', value: result.adjusted_profit, fill: '#059669' }, // Green for profit
  ] : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">What-If Simulator</h1>
        <p className="text-base text-on-surface-variant mt-2">Adjust corporate levers and simulate revenue impact.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-[24px] p-6 high-depth-shadow animate-fade-in-up flex flex-col gap-5">
          <SelectField label="Country" value={country} onChange={setCountry} options={COUNTRIES} />
          <SliderField label="Production Costs" value={cost} onChange={setCost} />
          <SliderField label="Marketing Budget" value={mkt} onChange={setMkt} />
          <SliderField label="Research Budget" value={rnd} onChange={setRnd} />
          <SliderField label="Cars Sold" value={units} onChange={setUnits} />
          <div className="flex gap-3 mt-2">
            <Button onClick={runSim} icon={Play} disabled={loading}>{loading ? 'Running...' : 'Simulate'}</Button>
            <Button onClick={reset} variant="secondary" icon={RotateCcw}>Reset</Button>
          </div>
        </div>
        {/* Results */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {result ? (
            <>
              {/* Revenue KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
                <ResultCard label="Current Forecast" value={fmtINR(result.baseline_revenue)} />
                <ResultCard label="New Scenario" value={fmtINR(result.adjusted_revenue)} highlight />
                <ResultCard label="Revenue Impact" value={`${result.delta >= 0 ? '+' : ''}${fmtINR(Math.abs(result.delta))}`}
                  sub={pct(result.delta_pct)} positive={result.delta >= 0} />
              </div>
              
              {/* Profit & Margin KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
                <ResultCard label="Current Profit" value={fmtINR(result.baseline_profit)} />
                <ResultCard label="New Profit" value={fmtINR(result.adjusted_profit)} highlight />
                <ResultCard label="Profit Impact" value={`${result.profit_delta >= 0 ? '+' : ''}${fmtINR(Math.abs(result.profit_delta))}`}
                  sub={pct(result.profit_delta_pct)} positive={result.profit_delta >= 0} />
              </div>

              {/* Extra Insights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
                <ResultCard label="New Profit Margin" value={`${result.adjusted_margin_pct.toFixed(1)}%`} highlight />
                <ResultCard label="Return on Investment (ROI)" value={result.roi_multiplier > 0 ? `${result.roi_multiplier}x` : 'N/A'}
                  sub={result.roi_multiplier > 0 ? 'Multiplier on extra spend' : 'No extra spend / negative'} positive={result.roi_multiplier > 1} />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Current vs New Revenue">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
                        <XAxis dataKey="name" tick={{fontSize:12,fill:'#727782'}} />
                        <YAxis tick={{fontSize:12,fill:'#727782'}} tickFormatter={v=>fmtINR(v)} />
                        <Tooltip formatter={v=>[fmtINR(v)]} contentStyle={{borderRadius:12,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.08)'}} />
                        <Bar dataKey="value" radius={[8,8,0,0]}>
                          {revenueData.map((d,i)=><Cell key={i} fill={d.fill}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
                <ChartCard title="Current vs New Profit">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profitData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
                        <XAxis dataKey="name" tick={{fontSize:12,fill:'#727782'}} />
                        <YAxis tick={{fontSize:12,fill:'#727782'}} tickFormatter={v=>fmtINR(v)} />
                        <Tooltip formatter={v=>[fmtINR(v)]} contentStyle={{borderRadius:12,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.08)'}} />
                        <Bar dataKey="value" radius={[8,8,0,0]}>
                          {profitData.map((d,i)=><Cell key={i} fill={d.fill}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>


            </>
          ) : (
            <div className="bg-surface-container-lowest rounded-[24px] p-12 high-depth-shadow flex items-center justify-center text-on-surface-variant animate-fade-in">
              <div className="text-center">
                <Play size={40} className="mx-auto mb-4 text-outline-variant" />
                <p className="text-lg font-medium">Adjust levers and click Simulate</p>
                <p className="text-sm mt-1">See how cost, marketing, R&D, and volume changes affect revenue.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value, sub, highlight, positive }) {
  return (
    <div className={`rounded-[20px] p-5 animate-fade-in-up ${highlight ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest high-depth-shadow'}`}>
      <span className={`text-xs font-semibold uppercase tracking-wide ${highlight ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>{label}</span>
      <h3 className="text-2xl font-bold mt-2">{value}</h3>
      {sub && <p className={`text-sm font-medium mt-1 ${positive === true ? 'text-success-container' : positive === false ? 'text-error-container' : ''}`}>{sub}</p>}
    </div>
  );
}
