import React from 'react';
import { formatRelativeTime } from '@shared/utils/format';
import type { AgentActivity } from '@shared/types';

interface ActivityFeedProps {
  activities: AgentActivity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center text-white/30 py-12">
        No activity yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {activities.map((activity, i) => (
        <ActivityItem key={`${activity.timestamp}-${i}`} activity={activity} />
      ))}
    </div>
  );
}

function ActivityItem({ activity }: { activity: AgentActivity }) {
  const icon = getActivityIcon(activity.type);
  const color = getActivityColor(activity.type);

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${color}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-white/60 capitalize">
              {activity.type.replace('_', ' ')}
            </span>
            {activity.toolName && (
              <span className="text-xs text-white/40">
                {activity.toolName}
              </span>
            )}
            <span className="text-xs text-white/30 ml-auto">
              {formatRelativeTime(activity.timestamp)}
            </span>
          </div>
          {activity.content && (
            <p className="text-sm text-white/80 mt-1 whitespace-pre-wrap break-words line-clamp-4">
              {activity.content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function getActivityIcon(type: string): string {
  switch (type) {
    case 'assistant': return '🤖';
    case 'user': return '👤';
    case 'tool_use': return '🔧';
    case 'tool_result': return '📋';
    case 'error': return '❌';
    default: return '•';
  }
}

function getActivityColor(type: string): string {
  switch (type) {
    case 'error': return 'text-red-400';
    case 'tool_use': return 'text-blue-400';
    default: return 'text-white/60';
  }
}
