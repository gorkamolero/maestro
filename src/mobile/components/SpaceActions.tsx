import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { BottomSheet } from './BottomSheet';

interface SpaceActionsProps {
  open: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
}

export function SpaceActions({ open, onClose, spaceId, spaceName }: SpaceActionsProps) {
  const navigate = useNavigate();

  const handleNewTerminal = async () => {
    try {
      const { terminalId } = await api.post<{ terminalId: string }>(
        `/api/spaces/${spaceId}/terminals`,
        {}
      );
      onClose();
      navigate(`/terminal/${terminalId}`);
    } catch (err) {
      console.error('Failed to create terminal:', err);
    }
  };

  const handleLaunchAgent = async () => {
    // Could open a modal to configure agent, or just launch with defaults
    try {
      const { terminalId } = await api.post<{ sessionId: string; terminalId: string }>(
        '/api/agents/launch',
        { spaceId, mode: 'mobile' }
      );
      onClose();
      navigate(`/terminal/${terminalId}`);
    } catch (err) {
      console.error('Failed to launch agent:', err);
    }
  };

  const actions = [
    {
      icon: '⬛',
      label: 'New Terminal',
      description: 'Open a terminal in this space',
      action: handleNewTerminal,
    },
    {
      icon: '🤖',
      label: 'Launch Agent',
      description: 'Start Claude Code in this space',
      action: handleLaunchAgent,
    },
    {
      icon: '🌐',
      label: 'New Browser Tab',
      description: 'Opens on desktop',
      action: () => {
        api.post(`/api/spaces/${spaceId}/tabs`, { type: 'browser' });
        onClose();
      },
    },
    {
      icon: '📝',
      label: 'New Note',
      description: 'Create a note in this space',
      action: () => {
        api.post(`/api/spaces/${spaceId}/tabs`, { type: 'notes' });
        onClose();
      },
    },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title={spaceName}>
      <div className="space-y-1">
        {actions.map(action => (
          <button
            key={action.label}
            onClick={action.action}
            className="w-full flex items-center gap-4 p-4 rounded-xl active:bg-white/10 text-left"
          >
            <span className="text-2xl">{action.icon}</span>
            <div>
              <div className="font-medium">{action.label}</div>
              <div className="text-sm text-white/40">{action.description}</div>
            </div>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
