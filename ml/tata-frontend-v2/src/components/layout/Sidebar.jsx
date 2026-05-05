import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, SlidersHorizontal, Users, Car, TrendingUp,
  Globe, FlaskConical, ShieldAlert, X, Menu,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/',          label: 'Dashboard',  icon: LayoutDashboard },
  { path: '/forecast',  label: 'Forecast',   icon: TrendingUp },
  { path: '/market',    label: 'Market',      icon: Globe },
  { path: '/simulator', label: 'Simulator',   icon: FlaskConical },
  { path: '/models',    label: 'Models',      icon: Car },
  { path: '/segments',  label: 'Customer',    icon: Users },
  { path: '/filters',   label: 'Filter',      icon: SlidersHorizontal },
  { path: '/risk',      label: 'Risk',        icon: ShieldAlert },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navContent = (
    <>
      {/* Brand Block — Tata Motors Logo */}
      <div className="px-4 mb-6 flex flex-col items-center gap-2">
        <img
          src="/tata.svg"
          alt="Tata Motors"
          className="w-28 h-auto object-contain"
        />
        <div className="text-center">
          <h2 className="text-sm font-bold text-primary leading-tight">
            Sales Intelligence
          </h2>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Data Analytics Division
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 mb-1 rounded-r-lg transition-all duration-200 text-[15px] font-medium ${
                isActive
                  ? 'bg-[#d5e3ff]/50 text-primary border-l-4 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary border-l-4 border-transparent'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Status */}
      <div className="px-6 py-4 border-t border-outline-variant/30">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span>API Connected</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-[60] p-2 rounded-lg bg-surface-container-lowest high-depth-shadow"
        aria-label="Open menu"
      >
        <Menu size={22} className="text-on-surface" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-[70] animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — Desktop */}
      <aside className="hidden md:flex fixed left-0 top-[64px] bottom-0 w-[280px] bg-surface-container-lowest border-r border-outline-variant/20 flex-col py-4 z-40">
        {navContent}
      </aside>

      {/* Sidebar — Mobile */}
      <aside
        className={`md:hidden fixed left-0 top-0 bottom-0 w-[280px] bg-surface-container-lowest flex-col py-4 z-[80] transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-surface-container"
          aria-label="Close menu"
        >
          <X size={20} className="text-on-surface-variant" />
        </button>
        <div className="pt-10">{navContent}</div>
      </aside>
    </>
  );
}
