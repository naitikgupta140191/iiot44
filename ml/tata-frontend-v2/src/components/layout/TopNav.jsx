import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export default function TopNav() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    api.health()
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'));
  }, []);

  return (
    <nav className="fixed top-0 w-full z-50 h-16 bg-surface-container-lowest border-b border-outline-variant/20 high-depth-shadow flex justify-between items-center px-4 md:px-6">
      {/* Left — Brand */}
      <div className="flex items-center gap-3 ml-10 md:ml-0">
        <span className="text-xl font-bold tracking-tight text-primary uppercase hidden sm:inline">
          Tata Motors
        </span>
        <span className="text-xl font-bold tracking-tight text-primary uppercase sm:hidden">
          TATA
        </span>
      </div>

      {/* Center — Ducat Logo */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center">
        <img
          src="/ducat-logo.svg"
          alt="Ducat - The IT Training School"
          className="h-10 md:h-11 w-auto object-contain"
        />
      </div>

      {/* Right — Status */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-3 text-sm">
          <span className="font-medium text-on-surface-variant">Invertis</span>
        </div>

        <div className="h-5 w-px bg-outline-variant/40 hidden md:block" />

        {/* API Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low text-xs font-medium">
          <div className={`w-2 h-2 rounded-full ${
            status === 'online' ? 'bg-success animate-pulse' :
            status === 'offline' ? 'bg-warning' : 'bg-outline'
          }`} />
          <span className="text-on-surface-variant">
            {status === 'online' ? 'Live' : status === 'offline' ? 'Offline' : '...'}
          </span>
        </div>
      </div>
    </nav>
  );
}
