import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { SegmentType, SegmentStatus } from '@/types';
import { Terminal, Globe, Bot, FileText, ExternalLink, Clock } from 'lucide-react';
import { BaseNode } from '@/components/base-node';
import { BaseHandle } from '@/components/base-handle';
import { cn } from '@/lib/utils';

interface SegmentNodeData {
  title: string;
  type: SegmentType;
  status: SegmentStatus;
  width: number;
  startTime: Date;
  endTime?: Date;
}

interface SegmentNodeProps {
  data: SegmentNodeData;
}

const SEGMENT_ICONS: Record<SegmentType, any> = {
  terminal: Terminal,
  browser: Globe,
  agent: Bot,
  note: FileText,
  external: ExternalLink,
  planted: Clock,
};

function SegmentNodeComponent({ data }: SegmentNodeProps) {
  const Icon = SEGMENT_ICONS[data.type];
  const isActive = data.status === 'active';
  const isPlanted = data.status === 'scheduled';

  return (
    <BaseNode
      className={cn(
        'h-16 px-3 py-0 flex items-center gap-2 transition-all cursor-pointer',
        isActive && 'shadow-[0_0_20px_rgba(100,116,139,0.5)] border-primary',
        isPlanted && 'border-dashed'
      )}
      style={{ width: `${data.width}px` }}
    >
      {/* Hide handles - we don't use edges in timeline */}
      <BaseHandle type="target" position={Position.Left} className="opacity-0" />
      <BaseHandle type="source" position={Position.Right} className="opacity-0" />

      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{data.title}</p>
      </div>
    </BaseNode>
  );
}

export const SegmentNode = memo(SegmentNodeComponent);
