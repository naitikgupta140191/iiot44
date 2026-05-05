import { useEffect, useState } from 'react';
import { api, fmtINR, pct, toINR } from '../services/api';
import ChartCard, { LegendDot } from '../components/cards/ChartCard';
import KpiCard from '../components/cards/KpiCard';
import { SelectField, ToggleGroup } from '../components/ui/FormControls';
import { TrendingUp, Target, Zap } from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const BLUE = '#003c75', GREEN = '#059669', LBLUE = '#a7c8ff';
const COUNTRIES = ['Australia', 'France', 'Germany', 'India', 'Japan', 'UK', 'USA'];
const TIME_OPTS = [
  { value: 1, label: '1Y' }, { value: 3, label: '3Y' },
  { value: 5, label: '5Y' }, { value: 10, label: '10Y' },
];

export default function Forecast() {
  const [country, setCountry] = useState('India');
  const [years, setYears] = useState(5);
  const [forecast, setForecast] = useState([]);
  const [allForecasts, setAllForecasts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.forecast(country, years).catch(() => ({ forecast: [] })),
      api.forecastAll(years).catch(() => ({ forecasts: {} })),
    ]).then(([fc, all]) => {
      setForecast((fc.forecast || []).map(d => ({
        ...d,
        revINR: +(toINR(d.revenue) / 1e7).toFixed(1),
        profINR: +(toINR(d.profit) / 1e7).toFixed(1),
        ciLow: +(toINR(d.ci_lower) / 1e7).toFixed(1),
        ciHigh: +(toINR(d.ci_upper) / 1e7).toFixed(1),
      })));
      setAllForecasts(all.forecasts || {});
      setLoading(false);
    });
  }, [country, years]);

  const fc0 = forecast[0] || {};
  const peak = forecast.reduce((a, b) => (a.revenue || 0) > (b.revenue || 0) ? a : b, {});
  const cagr = forecast.length > 1
    ? (Math.pow((forecast[forecast.length - 1]?.revenue || 1) / (forecast[0]?.revenue || 1), 1 / (forecast.length - 1)) - 1) * 100
    : 0;

  // All-country comparison data
  const compData = Object.entries(allForecasts).map(([c, data]) => ({
    country: c,
    revenue: data?.[data.length - 1]?.revenue || 0,
  })).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight" style={{ letterSpacing: '-0.02em' }}>
          Sales Forecast
        </h1>
        <p className="text-base text-on-surface-variant mt-2">
          ML-powered revenue and profit projections (2025–2034).
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end animate-fade-in-up">
        <SelectField label="Country" value={country} onChange={setCountry} options={COUNTRIES} className="w-44" />
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-on-surface-variant mb-1.5">Period</label>
          <ToggleGroup options={TIME_OPTS} value={years} onChange={setYears} />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 stagger-children">
        <KpiCard label="2025 Revenue" value={fmtINR(fc0.revenue || 0)} icon={TrendingUp} delay={0.05} />
        <KpiCard label="Peak Revenue" value={fmtINR(peak.revenue || 0)} icon={Target} delay={0.1} />
        <KpiCard label="Avg Yearly Growth" value={pct(cagr) + '/yr'} icon={Zap} delay={0.15} />
      </div>

      {/* Forecast Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Revenue Forecast"
          legend={
            <div className="flex gap-4">
              <LegendDot color={BLUE} label="Revenue" />
              <LegendDot color={LBLUE} label="Expected Range" />
            </div>
          }
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#727782' }} />
                <YAxis tick={{ fontSize: 12, fill: '#727782' }} tickFormatter={v => '₹' + v + 'Cr'} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  formatter={(v) => ['₹' + v + ' Cr']} />
                <Area type="monotone" dataKey="ciHigh" stroke="none" fill={LBLUE} fillOpacity={0.15} name="Best Case" />
                <Area type="monotone" dataKey="ciLow" stroke="none" fill="#f7f9fb" fillOpacity={1} name="Worst Case" />
                <Area type="monotone" dataKey="revINR" stroke={BLUE} fill={BLUE} fillOpacity={0.08} strokeWidth={2.5} name="Revenue" dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Profit Forecast" legend={<LegendDot color={GREEN} label="Profit" />}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#727782' }} />
                <YAxis tick={{ fontSize: 12, fill: '#727782' }} tickFormatter={v => '₹' + v + 'Cr'} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  formatter={(v) => ['₹' + v + ' Cr']} />
                <Area type="monotone" dataKey="profINR" stroke={GREEN} fill={GREEN} fillOpacity={0.08} strokeWidth={2.5} name="Profit" dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* All-Country Comparison */}
      <ChartCard title={`All Countries — ${years}Y Forecast Comparison`}>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#727782' }} tickFormatter={v => fmtINR(v)} />
              <YAxis dataKey="country" type="category" tick={{ fontSize: 12, fill: '#727782' }} width={80} />
              <Tooltip formatter={(v) => [fmtINR(v)]} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="revenue" fill={BLUE} radius={[0, 6, 6, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
