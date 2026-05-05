import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KpiCard({ label, value, change, icon: Icon, delay = 0 }) {
  const isUp = change > 0;
  const isFlat = change === 0 || change === undefined || change === null;

  return (
    <div
      className="bg-surface-container-lowest rounded-[24px] p-6 high-depth-shadow card-hover flex flex-col justify-between animate-fade-in-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
          {label}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center">
            <Icon size={16} className="text-primary" />
          </div>
        )}
      </div>
      <div>
        <h3 className="text-[28px] md:text-[32px] font-bold text-on-surface leading-tight">
          {value}
        </h3>
        {!isFlat && (
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              isUp ? 'bg-success-container text-success' : 'bg-error-container text-error'
            }`}>
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isUp ? '+' : ''}{parseFloat(change).toFixed(1)}%
            </span>
            <span className="text-xs text-on-surface-variant">vs last year</span>
          </div>
        )}
        {isFlat && change !== undefined && (
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container text-on-surface-variant">
              <Minus size={12} /> 0.0%
            </span>
            <span className="text-xs text-on-surface-variant">no change</span>
          </div>
        )}
      </div>
    </div>
  );
}
