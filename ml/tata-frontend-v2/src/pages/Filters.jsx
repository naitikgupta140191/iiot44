import { useEffect, useState } from 'react';
import { api, fmtINR, toINR, pct } from '../services/api';
import ChartCard from '../components/cards/ChartCard';
import { SelectField, Button } from '../components/ui/FormControls';
import { Filter } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BLUE = '#003c75';

export default function Filters() {
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState('all');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.historical('country', 10).then(res => {
      const cs = [...new Set((res?.data||[]).map(c=>c.country))].sort();
      setCountries(cs);
    }).catch(()=>{});
  }, []);

  const apply = async () => {
    setLoading(true);
    try {
      const view = country === 'all' ? 'global' : 'country';
      const r = await api.historical(view, 10, country === 'all' ? null : country);
      setData((r?.data||[]).map(d=>({...d,revINR:+(toINR(d.revenue)/1e9).toFixed(1),profINR:+(toINR(d.profit)/1e9).toFixed(1)})));
    } catch { setData([]); }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Data Filters</h1>
        <p className="text-base text-on-surface-variant mt-2">Explore historical data with custom filters.</p>
      </div>
      <div className="flex flex-wrap gap-4 items-end animate-fade-in-up">
        <SelectField label="Country" value={country} onChange={setCountry}
          options={[{value:'all',label:'All Markets'},...countries.map(c=>({value:c,label:c}))]} className="w-44" />
        <Button onClick={apply} icon={Filter} disabled={loading}>{loading ? 'Loading...' : 'Apply'}</Button>
      </div>
      {data.length > 0 && (
        <>
          <ChartCard title={`Revenue Trend — ${country === 'all' ? 'Global' : country}`}>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
                  <XAxis dataKey="year" tick={{fontSize:12,fill:'#727782'}} />
                  <YAxis tick={{fontSize:12,fill:'#727782'}} tickFormatter={v=>'₹'+v+'B'} />
                  <Tooltip contentStyle={{borderRadius:12,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.08)'}} formatter={v=>['₹'+v+'B']}/>
                  <Area type="monotone" dataKey="revINR" stroke={BLUE} fill={BLUE} fillOpacity={0.08} strokeWidth={2.5} name="Revenue" dot={{r:4}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <div className="bg-surface-container-lowest rounded-[24px] p-6 high-depth-shadow animate-fade-in-up">
            <h3 className="text-lg font-semibold text-on-surface mb-4">Filtered Data</h3>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant border-b border-outline-variant/20">
                <th className="text-left py-3 px-2">Year</th><th className="text-right py-3 px-2">Revenue</th>
                <th className="text-right py-3 px-2">Profit</th><th className="text-right py-3 px-2">Units</th><th className="text-right py-3 px-2">Margin</th>
              </tr></thead>
              <tbody>{data.map(d=>(
                <tr key={d.year} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                  <td className="py-3 px-2 font-medium">{d.year}</td>
                  <td className="text-right py-3 px-2 font-semibold">{fmtINR(d.revenue)}</td>
                  <td className="text-right py-3 px-2">{fmtINR(d.profit)}</td>
                  <td className="text-right py-3 px-2">{(d.units/1e6).toFixed(1)}M</td>
                  <td className="text-right py-3 px-2">{d.margin?.toFixed(1)||'—'}%</td>
                </tr>))}</tbody>
            </table></div>
          </div>
        </>
      )}
    </div>
  );
}
