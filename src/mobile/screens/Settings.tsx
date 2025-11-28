import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Settings() {
  const navigate = useNavigate();
  const { logout, deviceId } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Device Info */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            Device
          </h2>
          <p className="text-sm text-white/60 font-mono break-all">
            {deviceId}
          </p>
        </section>

        {/* Notifications */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            Notifications
          </h2>
          <p className="text-sm text-white/60">
            Push notifications are handled via ntfy. Configure your topic in Maestro desktop settings.
          </p>
        </section>

        {/* Actions */}
        <section>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500/10 text-red-400 font-medium py-3 rounded-xl"
          >
            Disconnect Device
          </button>
        </section>
      </main>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
