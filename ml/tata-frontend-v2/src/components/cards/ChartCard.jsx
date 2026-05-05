export default function ChartCard({ title, legend, children, className = '', actions }) {
  return (
    <div className={`bg-surface-container-lowest rounded-[24px] p-6 high-depth-shadow animate-fade-in-up flex flex-col ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-on-surface">{title}</h3>
        <div className="flex items-center gap-4">
          {legend}
          {actions}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

export function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
      <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
      {label}
    </span>
  );
}
