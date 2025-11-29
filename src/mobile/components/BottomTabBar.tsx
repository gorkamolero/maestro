import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Agents', icon: BotIcon },
  { path: '/spaces', label: 'Spaces', icon: GridIcon },
  { path: '/more', label: 'More', icon: MoreIcon },
];

export function BottomTabBar() {
  const location = useLocation();

  // Hide on detail screens
  const hideOn = ['/terminal/', '/agent/', '/space/'];
  const shouldHide = hideOn.some(path => location.pathname.startsWith(path));

  if (shouldHide) return null;

  return (
    <nav className="flex-shrink-0 z-30 bg-surface-primary/95 backdrop-blur-md border-t border-white/[0.04]">
      <div className="flex justify-center items-center gap-1 h-9 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                isActive ? 'text-content-primary bg-white/[0.06]' : 'text-content-tertiary'
              }`
            }
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// Icons
function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <circle cx="9" cy="14" r="1.5" fill="currentColor" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" />
      <path d="M12 2v4M8 6h8" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}
