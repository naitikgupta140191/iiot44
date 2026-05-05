import { useEffect, useState } from 'react';
import { api, fmtINR, fmtNum } from '../services/api';
import { SelectField } from '../components/ui/FormControls';
import { Fuel, Zap, Droplets, Leaf, Star, Globe, TrendingUp, Car, BarChart3, IndianRupee, Percent } from 'lucide-react';

const FUEL_ICONS = { Electric: Zap, Petrol: Fuel, Diesel: Droplets, Hybrid: Leaf };
const FUEL_COLORS = {
  Electric: 'bg-emerald-100 text-emerald-700',
  Petrol: 'bg-blue-100 text-blue-700',
  Diesel: 'bg-amber-100 text-amber-700',
  Hybrid: 'bg-sky-100 text-sky-700',
};
const COUNTRIES = ['All','Australia','France','Germany','India','Japan','UK','USA'];
const SORT_OPTIONS = [
  { value: 'revenue_desc', label: 'Revenue: High → Low' },
  { value: 'revenue_asc',  label: 'Revenue: Low → High' },
  { value: 'units_desc',   label: 'Units: High → Low' },
  { value: 'units_asc',    label: 'Units: Low → High' },
  { value: 'profit_desc',  label: 'Profit: High → Low' },
  { value: 'profit_asc',   label: 'Profit: Low → High' },
];

export default function Models() {
  const [country, setCountry] = useState('All');
  const [sortKey, setSortKey] = useState('revenue_desc');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const [field, order] = sortKey.split('_');
    const sortMap = { revenue: 'total_revenue', units: 'units_sold', profit: 'profit' };
    const params = { sort_by: sortMap[field], sort_order: order };
    if (country !== 'All') params.country = country;
    api.modelSales(params)
      .then(r => { setData(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, [country, sortKey]);

  const cards = data?.cards || [];
  const countryTotals = data?.country_totals || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Car Models — Sales Data</h1>
        <p className="text-base text-on-surface-variant mt-2">
          Real sales performance from the Tata Motors finance dataset.
          {country !== 'All' && <span className="font-semibold text-primary"> Showing: {country}</span>}
        </p>
      </div>

      {/* KPI Summary */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
          <KpiMini icon={Car} label="Models" value={data.card_count} />
          <KpiMini icon={BarChart3} label="Total Units" value={fmtNum(cards.reduce((s, c) => s + c.units_sold, 0))} />
          <KpiMini icon={IndianRupee} label="Total Revenue" value={fmtINR(cards.reduce((s, c) => s + c.total_revenue, 0))} />
          <KpiMini icon={TrendingUp} label="Total Profit" value={fmtINR(cards.reduce((s, c) => s + c.profit, 0))} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 animate-fade-in-up">
        <SelectField label="Country" value={country} onChange={setCountry} options={COUNTRIES} className="w-44" />
        <SelectField label="Sort By" value={sortKey} onChange={setSortKey} options={SORT_OPTIONS} className="w-52" />
      </div>

      {/* Country Quick Stats (only when showing All) */}
      {country === 'All' && countryTotals.length > 0 && (
        <div className="bg-surface-container-lowest rounded-[24px] p-5 high-depth-shadow animate-fade-in-up">
          <h3 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
            <Globe size={16} className="text-primary" />Units Sold by Country
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {countryTotals.map((c, i) => (
              <button key={i} onClick={() => setCountry(c.country)}
                className="p-2 rounded-xl bg-surface border border-outline-variant/20 hover:border-primary/40 transition-colors text-left cursor-pointer">
                <span className="text-xs font-semibold text-on-surface block">{c.country}</span>
                <span className="text-[11px] font-bold text-primary">{fmtNum(c.total_units)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Model Cards */}
      {loading ? (
        <div className="text-center py-16 text-on-surface-variant animate-pulse">Loading sales data...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger-children">
          {cards.map((m, i) => {
            const FuelIcon = FUEL_ICONS[m.fuel_type] || Fuel;
            return (
              <div key={m.model_id} className="bg-surface-container-lowest rounded-[24px] p-5 high-depth-shadow card-hover animate-fade-in-up" style={{ animationDelay: `${i * 0.025}s` }}>
                {/* Header */}
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-base font-bold text-on-surface">{m.car_model}</h4>
                  <span className="text-[10px] font-mono text-on-surface-variant">#{m.model_id}</span>
                </div>
                <p className="text-xs text-on-surface-variant mb-3">{m.car_type} · {m.drivetrain} · {m.transmission}</p>

                {/* Tags */}
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${FUEL_COLORS[m.fuel_type] || 'bg-surface-container text-on-surface-variant'}`}>
                    <FuelIcon size={10} />{m.fuel_type}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container text-on-surface-variant">{m.car_type}</span>
                </div>

                {/* Specs */}
                <div className="text-xs text-on-surface-variant mb-3 flex items-center gap-3">
                  <span>{m.horsepower || '—'} HP</span>
                  <span>{m.engine_cc || '—'} CC</span>
                  <span className="flex items-center gap-0.5"><Star size={10} className="text-warning" />{m.safety_rating || '—'}</span>
                </div>

                {/* Sales Data */}
                <div className="border-t border-outline-variant/20 pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Units Sold</span>
                    <span className="font-bold text-on-surface">{fmtNum(m.units_sold)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Total Revenue</span>
                    <span className="font-bold text-primary">{fmtINR(m.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Profit</span>
                    <span className="font-bold text-success">{fmtINR(m.profit)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Profit Margin</span>
                    <span className="font-semibold text-on-surface">{m.avg_margin_pct?.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Price Range</span>
                    <span className="font-semibold text-on-surface">${fmtNum(m.min_price)} – ${fmtNum(m.max_price)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cards.length === 0 && !loading && (
        <div className="text-center py-12 text-on-surface-variant">No sales data found.</div>
      )}
    </div>
  );
}

function KpiMini({ icon: Icon, label, value }) {
  return (
    <div className="bg-surface-container-lowest rounded-[20px] p-4 high-depth-shadow">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className="text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">{label}</span>
      </div>
      <p className="text-lg font-bold text-on-surface">{value}</p>
    </div>
  );
}
