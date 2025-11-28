import React from 'react';
import { Link } from 'react-router-dom';
import type { SpaceInfo } from '@shared/types';

interface SpaceCardProps {
  space: SpaceInfo;
  variant: 'grid' | 'list';
}

export function SpaceCard({ space, variant }: SpaceCardProps) {
  const hasActivity = space.agentCount > 0;
  
  if (variant === 'list') {
    return (
      <Link
        to={`/space/${space.id}`}
        className="flex items-center gap-3 p-3 bg-white/5 rounded-xl active:bg-white/10"
      >
        <SpaceIcon space={space} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{space.name}</h3>
          <p className="text-sm text-white/40">
            {space.tabCount} tabs {space.agentCount > 0 && `• ${space.agentCount} agents`}
          </p>
        </div>
        {hasActivity && <ActivityPulse />}
        <ChevronRight className="w-4 h-4 text-white/30" />
      </Link>
    );
  }

  // Grid variant
  return (
    <Link
      to={`/space/${space.id}`}
      className="block aspect-[4/3] relative overflow-hidden rounded-xl bg-white/5 active:bg-white/10"
    >
      {/* Color accent bar */}
      {space.color && (
        <div 
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: space.color }}
        />
      )}
      
      {/* Content */}
      <div className="absolute inset-0 p-3 flex flex-col">
        <div className="flex items-start justify-between">
          <SpaceIcon space={space} size="lg" />
          {hasActivity && <ActivityPulse />}
        </div>
        
        <div className="mt-auto">
          <h3 className="font-medium truncate">{space.name}</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {space.tabCount} tabs
          </p>
        </div>
      </div>

      {/* Agent count badge */}
      {space.agentCount > 0 && (
        <div className="absolute top-2 right-2 bg-amber-500/20 text-amber-400 text-xs font-medium px-1.5 py-0.5 rounded-full">
          {space.agentCount} 🤖
        </div>
      )}
    </Link>
  );
}

function SpaceIcon({ space, size }: { space: SpaceInfo; size: 'md' | 'lg' }) {
  const sizeClasses = size === 'lg' ? 'w-10 h-10 text-xl' : 'w-8 h-8 text-base';
  
  return (
    <div 
      className={`${sizeClasses} rounded-lg flex items-center justify-center`}
      style={{ backgroundColor: space.color ? `${space.color}20` : 'rgba(255,255,255,0.1)' }}
    >
      {space.icon || '📁'}
    </div>
  );
}

function ActivityPulse() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
