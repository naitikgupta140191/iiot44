import { useEffect, useState } from 'react';
import { api, fmtINR, toINR } from '../services/api';
import ChartCard from '../components/cards/ChartCard';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#003c75','#0d9488','#d97706','#7c3aed','#dc2626','#505f76','#a7c8ff'];

export default function Market() {
  const [countryData, setCountryData] = useState([]);

  useEffect(() => {
    api.historical('country', 10).then(res => {
      const latest = {};
      (res?.data || []).forEach(r => {
        if (!latest[r.country] || r.year > latest[r.country].year) latest[r.country] = r;
      });
      setCountryData(Object.values(latest).sort((a,b) => b.revenue - a.revenue));
    }).catch(() => {});
  }, []);

  const chartData = countryData.map(c => ({
    country: c.country, revenue: +(toINR(c.revenue)/1e9).toFixed(1),
    profit: +(toINR(c.profit)/1e9).toFixed(1), units: c.units, margin: c.margin,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Market Intelligence</h1>
        <p className="text-base text-on-surface-variant mt-2">Geographic revenue distribution across 7 global markets.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue by Country">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef0" />
                <XAxis type="number" tick={{fontSize:12,fill:'#727782'}} tickFormatter={v=>'₹'+v+'B'} />
                <YAxis dataKey="country" type="category" tick={{fontSize:12,fill:'#727782'}} width={80} />
                <Tooltip contentStyle={{borderRadius:12,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.08)'}} formatter={v=>['₹'+v+'B']} />
                <Bar dataKey="revenue" radius={[0,6,6,0]} name="Revenue">
                  {chartData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Market Share">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2} dataKey="revenue" nameKey="country">
                {chartData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie><Tooltip formatter={v=>['₹'+v+'B']}/><Legend iconType="circle" iconSize={8}/></PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
      <div className="bg-surface-container-lowest rounded-[24px] p-6 high-depth-shadow animate-fade-in-up">
        <h3 className="text-lg font-semibold text-on-surface mb-4">Performance Summary</h3>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant border-b border-outline-variant/20">
            <th className="text-left py-3 px-2">Country</th><th className="text-right py-3 px-2">Revenue</th>
            <th className="text-right py-3 px-2">Profit</th><th className="text-right py-3 px-2">Units</th><th className="text-right py-3 px-2">Margin</th>
          </tr></thead>
          <tbody>{countryData.map((c,i)=>(
            <tr key={c.country} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
              <td className="py-3 px-2 flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{background:COLORS[i%COLORS.length]}}/><span className="font-medium">{c.country}</span></td>
              <td className="text-right py-3 px-2 font-semibold">{fmtINR(c.revenue)}</td>
              <td className="text-right py-3 px-2">{fmtINR(c.profit)}</td>
              <td className="text-right py-3 px-2">{(c.units/1e6).toFixed(1)}M</td>
              <td className="text-right py-3 px-2">{c.margin?.toFixed(1)||'—'}%</td>
            </tr>))}</tbody>
        </table></div>
      </div>
    </div>
  );
}
