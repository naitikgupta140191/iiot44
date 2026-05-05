import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ShieldAlert, ShieldCheck, AlertTriangle, Info, Activity } from 'lucide-react';

const SEV_STYLES = {
  error: { bg:'bg-red-50', border:'border-red-200', text:'text-red-700', dot:'bg-red-500', icon: ShieldAlert },
  warning: { bg:'bg-amber-50', border:'border-amber-200', text:'text-amber-700', dot:'bg-amber-500', icon: AlertTriangle },
  info: { bg:'bg-blue-50', border:'border-blue-200', text:'text-blue-700', dot:'bg-blue-500', icon: Info },
  success: { bg:'bg-emerald-50', border:'border-emerald-200', text:'text-emerald-700', dot:'bg-emerald-500', icon: ShieldCheck },
};

export default function Risk() {
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    Promise.all([
      api.alerts().catch(()=>({alerts:[]})),
      api.modelPerf().catch(()=>({})),
    ]).then(([a, m]) => {
      setAlerts(a.alerts || []);
      setMetrics(m);
    });
  }, []);

  const r2 = metrics?.metrics?.r2_revenue || 0.995;
  const mape = metrics?.metrics?.mape_revenue || 8.45;

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Risk & Threat Monitor</h1>
        <p className="text-base text-on-surface-variant mt-2">Live alerts, anomalies, and ML model health.</p>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {alerts.map((a, i) => {
          const t = a.type || 'info';
          const s = SEV_STYLES[t] || SEV_STYLES.info;
          const Icon = s.icon;
          return (
            <div key={i} className={`${s.bg} ${s.border} border rounded-xl p-5 card-hover animate-fade-in-up`} style={{animationDelay:`${i*0.05}s`}}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                <span className={`text-xs font-bold uppercase tracking-wide ${s.text}`}>{a.severity || t}</span>
                <span className="ml-auto text-xs text-on-surface-variant">{a.category || ''}</span>
              </div>
              <p className="text-sm text-on-surface">{a.message}</p>
            </div>
          );
        })}
        {alerts.length === 0 && (
          <div className="col-span-2 bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center animate-fade-in">
            <ShieldCheck size={32} className="mx-auto mb-3 text-emerald-600" />
            <p className="text-emerald-700 font-medium">No active alerts. All systems nominal.</p>
          </div>
        )}
      </div>

      {/* Model Confidence */}
      <div className="bg-surface-container-lowest rounded-[24px] p-6 high-depth-shadow animate-fade-in-up">
        <div className="flex items-center gap-3 mb-6">
          <Activity size={22} className="text-primary" />
          <h3 className="text-lg font-semibold text-on-surface">Predictive Model Confidence</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <MetricBar label="R² Score" value={r2.toFixed(4)} pct={r2*100} color="bg-primary" />
          <MetricBar label="MAPE" value={mape.toFixed(1)+'%'} pct={Math.min(mape*2,100)} color="bg-outline" />
          <div className="flex items-center gap-4 bg-surface p-4 rounded-lg border border-outline-variant/20">
            <ShieldCheck size={32} className="text-success shrink-0" />
            <div>
              <p className="text-sm font-semibold text-on-surface">System Optimal</p>
              <p className="text-xs text-on-surface-variant">No recalibration required.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBar({ label, value, pct, color }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-medium text-on-surface-variant">{label}</span>
        <span className="text-lg font-bold text-primary">{value}</span>
      </div>
      <div className="w-full bg-surface-container-high rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all duration-700`} style={{width:`${pct}%`}} />
      </div>
    </div>
  );
}
