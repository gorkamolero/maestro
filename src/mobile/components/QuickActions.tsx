import React from 'react';

interface QuickActionsProps {
  onSend: (text: string) => void;
}

const QUICK_ACTIONS = [
  { label: 'Yes', value: 'y\n' },
  { label: 'No', value: 'n\n' },
  { label: 'Continue', value: '\n' },
  { label: 'Abort', value: '\x03' }, // Ctrl+C
];

export function QuickActions({ onSend }: QuickActionsProps) {
  return (
    <div className="flex gap-2 p-3 overflow-x-auto">
      {QUICK_ACTIONS.map(action => (
        <button
          key={action.label}
          onClick={() => onSend(action.value)}
          className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium whitespace-nowrap"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
