export function SelectField({ label, value, onChange, options, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-on-surface-variant mb-1.5">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
      >
        {options.map((opt) => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function InputField({ label, value, onChange, type = 'number', placeholder, min, max, step, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-on-surface-variant mb-1.5">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? +e.target.value : e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
      />
    </div>
  );
}

export function SliderField({ label, value, onChange, min = -50, max = 50, step = 1, unit = '%' }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
          {label}
        </label>
        <span className={`text-sm font-bold ${value > 0 ? 'text-success' : value < 0 ? 'text-error' : 'text-on-surface-variant'}`}>
          {value > 0 ? '+' : ''}{value}{unit}
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        min={min}
        max={max}
        step={step}
        className="w-full h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary"
      />
    </div>
  );
}

export function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg bg-surface-container p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            value === opt.value
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Button({ children, onClick, variant = 'primary', icon: Icon, className = '', disabled = false }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all';
  const styles = {
    primary: 'bg-primary text-on-primary hover:opacity-90 active:opacity-80',
    secondary: 'bg-transparent border border-outline-variant/40 text-primary hover:bg-surface-container-low',
    ghost: 'text-on-surface-variant hover:bg-surface-container-low',
    danger: 'bg-error text-on-error hover:opacity-90',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
