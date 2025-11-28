import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useWebSocket } from '../hooks/useWebSocket';

export function More() {
  const { logout } = useAuth();
  const { isConnected } = useWebSocket();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-primary text-content-primary pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-primary/90 backdrop-blur-lg border-b border-white/[0.06] px-4 py-3">
        <h1 className="text-page-title font-semibold">More</h1>
      </header>

      <main className="p-4 space-y-5">
        {/* Connection Status Card */}
        <section className="bg-surface-card border border-white/[0.06] rounded-card p-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              isConnected ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
            </div>
            <div>
              <p className="font-medium text-sm text-content-primary">
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
              <p className="text-[12px] text-content-secondary">
                {isConnected ? 'Live updates active' : 'Trying to reconnect...'}
              </p>
            </div>
          </div>
        </section>

        {/* Settings */}
        <section>
          <h2 className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-2 px-1">
            Settings
          </h2>
          <div className="bg-surface-card border border-white/[0.06] rounded-card overflow-hidden">
            <MenuItem
              icon={<BellIcon />}
              label="Notifications"
              description="Push alerts for agent status"
            />
            <MenuItem
              icon={<ServerIcon />}
              label="Server URL"
              description="Connection settings"
            />
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-2 px-1">
            About
          </h2>
          <div className="bg-surface-card border border-white/[0.06] rounded-card overflow-hidden">
            <MenuItem
              icon={<InfoIcon />}
              label="Version"
              value="1.0.0"
            />
            <MenuItem
              icon={<CodeIcon />}
              label="Maestro Desktop"
              description="Required for full functionality"
            />
          </div>
        </section>

        {/* Logout */}
        <section className="pt-2">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full h-10 bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-sm rounded-button
              active:bg-red-500/15 disabled:opacity-50 transition-colors"
          >
            {isLoggingOut ? 'Logging out...' : 'Disconnect Device'}
          </button>
          <p className="text-[11px] text-content-tertiary text-center mt-2">
            You'll need to re-pair with a new PIN
          </p>
        </section>
      </main>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  description,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="w-7 h-7 rounded-md bg-surface-hover flex items-center justify-center text-content-secondary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-content-primary">{label}</p>
        {description && (
          <p className="text-[11px] text-content-tertiary">{description}</p>
        )}
      </div>
      {value && (
        <span className="text-[12px] text-content-secondary">{value}</span>
      )}
      {!value && <ChevronRight className="w-4 h-4 text-content-tertiary" />}
    </div>
  );
}

// Icons
function BellIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
