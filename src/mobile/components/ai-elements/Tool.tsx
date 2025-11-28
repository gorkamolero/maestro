// Mobile Tool Component - Collapsible tool invocation display
import { useState } from 'react';
import { cn } from '@mobile/lib/utils';
import { ChevronDown, Wrench, CheckCircle, XCircle, Clock } from 'lucide-react';

type ToolState = 'running' | 'success' | 'error';

interface ToolProps {
  name: string;
  state: ToolState;
  input?: string;
  output?: string;
  error?: string;
  defaultOpen?: boolean;
  className?: string;
}

export function Tool({
  name,
  state,
  input,
  output,
  error,
  defaultOpen = false,
  className,
}: ToolProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const stateConfig = {
    running: {
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/20',
      label: 'Running',
    },
    success: {
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-400/20',
      label: 'Done',
    },
    error: {
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-400/20',
      label: 'Error',
    },
  };

  const config = stateConfig[state];
  const StateIcon = config.icon;

  return (
    <div className={cn('rounded-xl border border-white/10 bg-white/5 overflow-hidden', className)}>
      {/* Header - Tappable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-3 text-left active:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <div className={cn('rounded-lg p-1.5', config.bg)}>
            <Wrench className={cn('h-4 w-4', config.color)} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">{name}</span>
            <span className={cn('text-xs flex items-center gap-1', config.color)}>
              <StateIcon className="h-3 w-3" />
              {config.label}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-white/40 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Expandable Content */}
      {isOpen && (
        <div className="border-t border-white/10 p-3 space-y-3">
          {input && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Input
              </div>
              <pre className="text-xs text-white/70 bg-black/30 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-40">
                {input}
              </pre>
            </div>
          )}
          {output && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Output
              </div>
              <pre className="text-xs text-white/70 bg-black/30 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-40">
                {output}
              </pre>
            </div>
          )}
          {error && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-red-400/60 mb-1">
                Error
              </div>
              <pre className="text-xs text-red-400 bg-red-900/20 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-40">
                {error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simpler inline tool display for compact views
export function ToolInline({
  name,
  state,
  className,
}: {
  name: string;
  state: ToolState;
  className?: string;
}) {
  const stateConfig = {
    running: { icon: Clock, color: 'text-yellow-400' },
    success: { icon: CheckCircle, color: 'text-green-400' },
    error: { icon: XCircle, color: 'text-red-400' },
  };

  const config = stateConfig[state];
  const StateIcon = config.icon;

  return (
    <div className={cn('flex items-center gap-2 text-sm text-white/60', className)}>
      <Wrench className="h-3.5 w-3.5 text-blue-400" />
      <span>{name}</span>
      <StateIcon className={cn('h-3.5 w-3.5 ml-auto', config.color)} />
    </div>
  );
}
