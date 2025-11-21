import { memo } from 'react';
import { Position } from '@xyflow/react';
import type { SegmentType, SegmentStatus, Segment } from '@/types';
import { Terminal, Globe, Bot, FileText, ExternalLink, Clock, X } from 'lucide-react';
import { BaseNode } from '@/components/base-node';
import { BaseHandle } from '@/components/base-handle';
import { cn } from '@/lib/utils';
import { segmentsActions } from '@/stores/segments.store';
import { tracksActions } from '@/stores/tracks.store';
import { tabsActions } from '@/stores/tabs.store';
import { GlowEffect } from '@/components/motion-primitives/glow-effect';

interface SegmentNodeData {
  segmentId: string;
  trackId: string;
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

  const handleClick = () => {
    // Open segment in a tab
    const segment: Segment = {
      id: data.segmentId,
      trackId: data.trackId,
      title: data.title,
      startTime: data.startTime,
      endTime: data.endTime,
      type: data.type,
      status: data.status,
      config: {},
    };
    tabsActions.openTab(segment);
  };

  const handleEndSegment = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent segment click event
    segmentsActions.endSegment(data.segmentId);
    // Update the segment in the track as well
    tracksActions.updateSegment(data.trackId, data.segmentId, {
      endTime: new Date(),
      status: 'completed',
    });
  };

  return (
    <BaseNode
      onClick={handleClick}
      className={cn(
        'h-16 px-3 py-0 flex items-center gap-2 transition-all cursor-pointer group overflow-hidden',
        isActive && 'border-primary',
        isPlanted && 'border-dashed'
      )}
      style={{ width: `${data.width}px` }}
    >
      {/* Animated glow effect for active segments */}
      {isActive && (
        <GlowEffect
          colors={['hsl(var(--primary))', 'hsl(var(--primary) / 0.5)']}
          mode="breathe"
          blur="soft"
          duration={3}
          scale={1.2}
          className="opacity-30"
        />
      )}

      {/* Hide handles - we don't use edges in timeline */}
      <BaseHandle type="target" position={Position.Left} className="opacity-0" />
      <BaseHandle type="source" position={Position.Right} className="opacity-0" />

      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 relative z-10" />
      <div className="flex-1 min-w-0 relative z-10">
        <p className="text-sm font-medium truncate">{data.title}</p>
      </div>

      {/* Close button - only show for active segments */}
      {isActive && (
        <button
          onClick={handleEndSegment}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-sm hover:bg-destructive/20 hover:text-destructive relative z-10"
          title="End segment"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </BaseNode>
  );
}

export const SegmentNode = memo(SegmentNodeComponent);
