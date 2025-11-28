// AgentConversation - Chat-like display of agent activity using AI Elements
// Transforms AgentActivity events into a conversational interface

import { AlertCircle, Play, Square } from 'lucide-react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from '@/components/ai-elements/reasoning';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import type {
  AgentActivity,
  UserPromptActivity,
  AssistantMessageActivity,
  AssistantThinkingActivity,
  ToolUseActivity,
  ToolResultActivity,
  ErrorActivity,
  SessionStartActivity,
  SessionEndActivity,
} from '@/types/agent-events';
import { cn } from '@/lib/utils';

interface AgentConversationProps {
  activities: AgentActivity[];
  className?: string;
  emptyMessage?: string;
}

export function AgentConversation({
  activities,
  className,
  emptyMessage = 'Waiting for activity...',
}: AgentConversationProps) {
  // Group consecutive tool_use and tool_result by toolName for paired display
  const groupedActivities = groupActivities(activities);

  return (
    <Conversation className={cn('h-full', className)}>
      <ConversationContent className="gap-4 p-3">
        {groupedActivities.length === 0 ? (
          <ConversationEmptyState
            title="No activity yet"
            description={emptyMessage}
          />
        ) : (
          groupedActivities.map((item, index) => (
            <ActivityItem key={`${item.id}-${index}`} item={item} />
          ))
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

// Grouped activity item - can be a single activity or a tool use+result pair
type GroupedActivity =
  | AgentActivity
  | { type: 'tool_pair'; use: ToolUseActivity; result?: ToolResultActivity; id: string };

function groupActivities(activities: AgentActivity[]): GroupedActivity[] {
  const result: GroupedActivity[] = [];
  const pendingToolUses = new Map<string, ToolUseActivity>();

  for (const activity of activities) {
    if (activity.type === 'tool_use') {
      const toolUse = activity as ToolUseActivity;
      pendingToolUses.set(toolUse.toolName + '-' + toolUse.id, toolUse);
      result.push({
        type: 'tool_pair',
        use: toolUse,
        result: undefined,
        id: toolUse.id,
      });
    } else if (activity.type === 'tool_result') {
      const toolResult = activity as ToolResultActivity;
      // Find matching tool_pair in result and add the result
      const pairIndex = result.findLastIndex(
        (item) =>
          item.type === 'tool_pair' &&
          (item as { use: ToolUseActivity }).use.toolName === toolResult.toolName &&
          !(item as { result?: ToolResultActivity }).result
      );
      if (pairIndex >= 0) {
        (result[pairIndex] as { result?: ToolResultActivity }).result = toolResult;
      } else {
        // No matching use found, add as standalone
        result.push(activity);
      }
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
    case 'user_prompt':
      return <UserPromptItem activity={item as UserPromptActivity} />;
    case 'assistant_message':
      return <AssistantMessageItem activity={item as AssistantMessageActivity} />;
    case 'assistant_thinking':
      return <ThinkingItem activity={item as AssistantThinkingActivity} />;
    case 'tool_result':
      // Standalone tool result (no matching use)
      return <StandaloneToolResultItem activity={item as ToolResultActivity} />;
    case 'error':
      return <ErrorItem activity={item as ErrorActivity} />;
    case 'session_start':
      return <SessionStartItem activity={item as SessionStartActivity} />;
    case 'session_end':
      return <SessionEndItem activity={item as SessionEndActivity} />;
    default:
      return null;
  }
}

// User prompt - right-aligned bubble
function UserPromptItem({ activity }: { activity: UserPromptActivity }) {
  return (
    <Message from="user">
      <MessageContent>
        <div className="whitespace-pre-wrap">{activity.content}</div>
      </MessageContent>
    </Message>
  );
}

// Assistant message - left-aligned with markdown
function AssistantMessageItem({ activity }: { activity: AssistantMessageActivity }) {
  return (
    <Message from="assistant">
      <MessageContent>
        <MessageResponse>{activity.content}</MessageResponse>
      </MessageContent>
    </Message>
  );
}

// Thinking - collapsible with shimmer while active
function ThinkingItem({ activity }: { activity: AssistantThinkingActivity }) {
  return (
    <Reasoning isStreaming={false} defaultOpen={false}>
      <ReasoningTrigger />
      <ReasoningContent>{activity.content}</ReasoningContent>
    </Reasoning>
  );
}

// Tool use + result pair - collapsible
function ToolPairItem({
  use,
  result,
}: {
  use: ToolUseActivity;
  result?: ToolResultActivity;
}) {
  // Map our state to AI Elements state
  const getState = (): 'input-available' | 'output-available' | 'output-error' => {
    if (!result) return 'input-available';
    return result.success ? 'output-available' : 'output-error';
  };

  return (
    <Tool defaultOpen={false}>
      <ToolHeader
        title={use.summary || use.toolName}
        type="tool-invocation"
        state={getState()}
      />
      <ToolContent>
        <ToolInput input={use.toolInput} />
        {result && (
          <ToolOutput
            output={result.output}
            errorText={result.error}
          />
        )}
      </ToolContent>
    </Tool>
  );
}

// Standalone tool result (when no matching use found)
function StandaloneToolResultItem({ activity }: { activity: ToolResultActivity }) {
  return (
    <Tool defaultOpen={false}>
      <ToolHeader
        title={activity.toolName}
        type="tool-invocation"
        state={activity.success ? 'output-available' : 'output-error'}
      />
      <ToolContent>
        <ToolOutput output={activity.output} errorText={activity.error} />
      </ToolContent>
    </Tool>
  );
}

// Error display
function ErrorItem({ activity }: { activity: ErrorActivity }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
      <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
      <div>
        <div className="font-medium text-destructive">{activity.errorType}</div>
        <div className="text-destructive/80">{activity.message}</div>
      </div>
    </div>
  );
}

// Session start marker
function SessionStartItem({ activity }: { activity: SessionStartActivity }) {
  const projectName = activity.projectPath.split('/').pop() || 'project';
  const time = new Date(activity.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <Play className="h-3 w-3" />
      <span>Session started in {projectName}</span>
      <span className="text-muted-foreground/60">{time}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// Session end marker
function SessionEndItem({ activity }: { activity: SessionEndActivity }) {
  const time = new Date(activity.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const duration = Math.round(activity.duration / 1000 / 60);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <Square className="h-3 w-3" />
      <span>Session ended ({activity.reason || 'unknown'})</span>
      <span className="text-muted-foreground/60">{duration}m</span>
      <span className="text-muted-foreground/60">{time}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export default AgentConversation;
