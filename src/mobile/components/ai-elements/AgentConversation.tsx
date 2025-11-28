// Mobile AgentConversation - Chat-like display of agent activity
import { useEffect, useRef } from 'react';
import { cn } from '@mobile/lib/utils';
import { Message, MessageContent, MessageTime } from './Message';
import { Tool } from './Tool';
import { formatRelativeTime } from '@shared/utils/format';
import type { AgentActivity } from '@shared/types';
import { AlertCircle } from 'lucide-react';

interface AgentConversationProps {
  activities: AgentActivity[];
  className?: string;
  emptyMessage?: string;
}

export function AgentConversation({
  activities,
  className,
  emptyMessage = 'No activity yet',
}: AgentConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new activities
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities.length]);

  // Group tool_use with following tool_result
  const groupedActivities = groupActivities(activities);

  if (groupedActivities.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="text-white/30 text-sm">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn('flex-1 overflow-y-auto px-4 py-3 space-y-3', className)}
    >
      {groupedActivities.map((item, index) => (
        <ActivityItem key={`${item.timestamp}-${index}`} item={item} />
      ))}
    </div>
  );
}

// Grouped activity types
type GroupedActivity =
  | AgentActivity
  | { type: 'tool_pair'; use: AgentActivity; result?: AgentActivity; timestamp: string };

function groupActivities(activities: AgentActivity[]): GroupedActivity[] {
  const result: GroupedActivity[] = [];

  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];

    if (activity.type === 'tool_use') {
      // Look for matching result
      const nextActivity = activities[i + 1];
      if (nextActivity?.type === 'tool_result' && nextActivity.toolName === activity.toolName) {
        result.push({
          type: 'tool_pair',
          use: activity,
          result: nextActivity,
          timestamp: activity.timestamp,
        });
        i++; // Skip the result since we've paired it
      } else {
        result.push({
          type: 'tool_pair',
          use: activity,
          result: undefined,
          timestamp: activity.timestamp,
        });
      }
    } else if (activity.type === 'tool_result') {
      // Standalone result (shouldn't happen often)
      result.push(activity);
    } else {
      result.push(activity);
    }
  }

  return result;
}

function ActivityItem({ item }: { item: GroupedActivity }) {
  if (item.type === 'tool_pair') {
    return <ToolPairItem use={item.use} result={item.result} />;
  }

  switch (item.type) {
    case 'user':
      return <UserMessage activity={item} />;
    case 'assistant':
      return <AssistantMessage activity={item} />;
    case 'tool_result':
      // Standalone tool result
      return (
        <Tool
          name={item.toolName || 'Tool'}
          state="success"
          output={item.content}
        />
      );
    case 'error':
      return <ErrorItem activity={item} />;
    default:
      return null;
  }
}

function UserMessage({ activity }: { activity: AgentActivity }) {
  return (
    <Message from="user">
      <MessageContent from="user">
        <div className="whitespace-pre-wrap">{activity.content}</div>
      </MessageContent>
      <MessageTime>{formatRelativeTime(activity.timestamp)}</MessageTime>
    </Message>
  );
}

function AssistantMessage({ activity }: { activity: AgentActivity }) {
  return (
    <Message from="assistant">
      <MessageContent from="assistant">
        <div className="whitespace-pre-wrap">{activity.content}</div>
      </MessageContent>
      <MessageTime>{formatRelativeTime(activity.timestamp)}</MessageTime>
    </Message>
  );
}

function ToolPairItem({
  use,
  result,
}: {
  use: AgentActivity;
  result?: AgentActivity;
}) {
  const getState = (): 'running' | 'success' | 'error' => {
    if (!result) return 'running';
    // Check if the result content contains error indicators
    if (result.content?.toLowerCase().includes('error')) return 'error';
    return 'success';
  };

  return (
    <Tool
      name={use.toolName || 'Tool'}
      state={getState()}
      input={use.content}
      output={result?.content}
    />
  );
}

function ErrorItem({ activity }: { activity: AgentActivity }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-red-900/20 border border-red-500/30 p-3">
      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-red-400 mb-0.5">Error</div>
        <div className="text-sm text-red-300 whitespace-pre-wrap break-words">
          {activity.content}
        </div>
      </div>
    </div>
  );
}

export default AgentConversation;
