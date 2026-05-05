import { useEffect, useState } from 'react';
import { api, fmtINR, pct, fmtNum, toINR } from '../services/api';
import KpiCard from '../components/cards/KpiCard';
import ChartCard, { LegendDot } from '../components/cards/ChartCard';
import { Wallet, CreditCard, Car, Activity, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const BLUE = '#003c75', LBLUE = '#a7c8ff', GREEN = '#059669', AMBER = '#d97706';
const COLORS = [BLUE, '#0d9488', AMBER, '#7c3aed', '#dc2626', '#505f76', LBLUE];

export default function Overview() {
  const [summary, setSummary] = useState(null);
  const [historical, setHistorical] = useState([]);
  const [countryData, setCountryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.summary().catch(() => null),
      api.historical('global', 10).catch(() => ({ data: [] })),
      api.historical('country', 10).catch(() => ({ data: [] })),
    ]).then(([s, hg, hc]) => {
      setSummary(s);
      setHistorical((hg?.data || []).map(d => ({
        ...d,
        revINR: +(toINR(d.revenue) / 1e9).toFixed(1),
        profINR: +(toINR(d.profit) / 1e9).toFixed(1),
      })));
      // Get latest year per country
      const latest = {};
      (hc?.data || []).forEach(r => {
        if (!latest[r.country] || r.year > latest[r.country].year) latest[r.country] = r;
      });
      setCountryData(Object.values(latest).sort((a, b) => b.revenue - a.revenue));
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSkeleton />;

  const s = summary || {};
  const revDelta = s.revenue_yoy_pct || 0;
  const profDelta = s.profit_yoy_pct || 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            Overview Dashboard
          </h1>
          <p className="text-base text-on-surface-variant mt-2">
            Executive summary of FY24 sales performance.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 stagger-children">
        <KpiCard label="Total Revenue" value={fmtINR(s.total_revenue || 0)} change={revDelta} icon={Wallet} delay={0.05} />
        <KpiCard label="Net Profit" value={fmtINR(s.total_profit || 0)} change={profDelta} icon={CreditCard} delay={0.1} />
        <KpiCard label="Units Sold" value={fmtNum(s.total_units || 0)} icon={Car} delay={0.15} />
        <KpiCard label="Profit Margin" value={(s.avg_margin_pct || 0).toFixed(1) + '%'} icon={Activity} delay={0.2} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Profit */}
        <ChartCard
          title="Revenue vs Profit Growth"
          className="lg:col-span-2"
          legend={
            <div className="flex gap-4">
              <LegendDot color={BLUE} label="Revenue" />
              <LegendDot color={LBLUE} label="Profit" />
            </div>
          }
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historical}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#727782' }} />
                <YAxis tick={{ fontSize: 12, fill: '#727782' }} tickFormatter={v => '₹' + v + 'B'} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 13 }}
                  formatter={(v) => ['₹' + v + 'B']}
                />
                <Area type="monotone" dataKey="revINR" stroke={BLUE} fill={BLUE} fillOpacity={0.08} strokeWidth={2.5} name="Revenue" />
                <Area type="monotone" dataKey="profINR" stroke={LBLUE} fill={LBLUE} fillOpacity={0.08} strokeWidth={2.5} name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* AI Insights */}
        <div className="bg-surface-container-lowest rounded-[24px] p-6 high-depth-shadow animate-fade-in-up relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary-container rounded-full blur-[50px] opacity-50 z-0" />
          <div className="relative z-10 flex items-center gap-2 mb-6">
            <Sparkles size={22} className="text-primary" />
            <h3 className="text-lg font-semibold text-on-surface">AI Market Insights</h3>
          </div>
          <div className="relative z-10 flex flex-col gap-4">
            <InsightCard tag="Opportunity" tagColor="bg-primary-fixed text-primary" title="EV Demand Surge in Tier 2"
              desc="Predictive models indicate a 22% spike in compact EV demand across northern Tier 2 cities over the next 6 months." />
            <InsightCard tag="Risk Alert" tagColor="bg-error-container text-error" title="Supply Chain Constraint"
              desc="Potential semiconductor shortage projected for Q1 FY25, likely impacting high-end SUV production schedules." />
            <InsightCard tag="Forecast" tagColor="bg-success-container text-success" title="India Revenue Growth"
              desc={`FY25 forecast revenue: ${fmtINR(s.forecast_2025_revenue || 0)}. Strong EV and SUV segment growth expected.`} />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Markets */}
        <ChartCard title="Top Markets by Revenue">
          <div className="flex flex-col gap-4">
            {countryData.slice(0, 5).map((c, i) => {
              const max = countryData[0]?.revenue || 1;
              return (
                <div key={c.country} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-on-surface">{c.country}</span>
                    <span className="text-on-surface-variant font-medium">{fmtINR(c.revenue)}</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{
                      width: `${(c.revenue / max * 100).toFixed(0)}%`,
                      background: COLORS[i % COLORS.length],
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Market Distribution */}
        <ChartCard title="Market Distribution">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={countryData.map(c => ({ name: c.country, value: +(toINR(c.revenue) / 1e9).toFixed(1) }))}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                  paddingAngle={2} dataKey="value"
                >
                  {countryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => ['₹' + v + 'B']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function InsightCard({ tag, tagColor, title, desc }) {
  return (
    <div className="bg-surface border border-outline-variant/30 rounded-xl p-4 hover:border-primary/40 transition-colors cursor-pointer group">
      <div className="flex justify-between items-start mb-2">
        <span className={`${tagColor} px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide`}>{tag}</span>
        <ArrowRight size={14} className="text-on-surface-variant group-hover:text-primary transition-colors" />
      </div>
      <h4 className="text-sm font-semibold text-on-surface mb-1">{title}</h4>
      <p className="text-xs text-on-surface-variant line-clamp-2">{desc}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-10 w-64 bg-surface-container rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-surface-container-lowest rounded-[24px]" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-[380px] bg-surface-container-lowest rounded-[24px] lg:col-span-2" />
        <div className="h-[380px] bg-surface-container-lowest rounded-[24px]" />
      </div>
    </div>
  );
}
