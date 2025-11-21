import { Terminal, Globe, Bot, FileText } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { SegmentType } from '@/types';

interface CreateSegmentMenuProps {
  children: React.ReactNode;
  onCreateSegment: (type: SegmentType) => void;
}

const SEGMENT_TYPES: { type: SegmentType; label: string; icon: any }[] = [
  { type: 'browser', label: 'Browser', icon: Globe },
  { type: 'terminal', label: 'Terminal', icon: Terminal },
  { type: 'agent', label: 'AI Agent', icon: Bot },
  { type: 'note', label: 'Note', icon: FileText },
];

export function CreateSegmentMenu({ children, onCreateSegment }: CreateSegmentMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {SEGMENT_TYPES.map(({ type, label, icon: Icon }) => (
          <ContextMenuItem
            key={type}
            onClick={() => onCreateSegment(type)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
