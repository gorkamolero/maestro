// ActivityFeed - Now using AI Elements conversation display
import { AgentConversation } from './ai-elements';
import type { AgentActivity } from '@shared/types';

interface ActivityFeedProps {
  activities: AgentActivity[];
  className?: string;
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  return (
    <AgentConversation
      activities={activities}
      className={className}
      emptyMessage="No activity yet"
    />
  );
}
