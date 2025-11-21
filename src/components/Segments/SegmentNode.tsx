import { memo } from 'react';
import { Position } from '@xyflow/react';
import { useSnapshot } from 'valtio';
import type { SegmentType, SegmentStatus } from '@/types';
import { Terminal, Globe, Bot, FileText, ExternalLink, Clock, X } from 'lucide-react';
import { BaseNode } from '@/components/base-node';
import { BaseHandle } from '@/components/base-handle';
import { cn } from '@/lib/utils';
import { segmentsActions } from '@/stores/segments.store';
import { spacesActions } from '@/stores/spaces.store';
import { timelineStore } from '@/stores/timeline.store';
import { getSegmentWidth } from '@/lib/timeline-utils';
import { GlowEffect } from '@/components/motion-primitives/glow-effect';
import {
  Expandable,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandableContent,
  ExpandableTrigger,
} from '@/components/ui/expandable';

interface SegmentNodeData {
  segmentId: string;
  spaceId: string;
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

  // Subscribe to timeline updates for live width calculation
  const { now, zoomLevel } = useSnapshot(timelineStore);

  // Recalculate width in real-time for active segments
  const currentWidth = isActive
    ? getSegmentWidth(data.startTime, data.endTime, zoomLevel, data.startTime, now)
    : data.width;

  const handleEndSegment = (e: React.MouseEvent) => {
    e.stopPropagation();
    segmentsActions.endSegment(data.segmentId);
    spacesActions.updateSegment(data.spaceId, data.segmentId, {
      endTime: new Date(),
      status: 'completed',
    });
  };

  const duration = data.endTime
    ? Math.round((data.endTime.getTime() - data.startTime.getTime()) / 1000 / 60)
    : 'Active';

  return (
    <Expandable expandDirection="both" expandBehavior="replace">
      {({ isExpanded }) => (
        <ExpandableTrigger>
          <ExpandableCard
            collapsedSize={{ width: currentWidth, height: 64 }}
            expandedSize={{ width: 600, height: 320 }}
            className="!max-w-none"
          >
            <div className="!max-w-none w-full">
              <BaseNode
                className={cn(
                  'h-full w-full flex flex-col overflow-visible !p-0 !border-0 !shadow-none',
                  isActive && 'border-primary',
                  isPlanted && 'border-dashed'
                )}
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

                <ExpandableCardHeader className="!p-3 !space-y-0">
                  <div className="flex items-center gap-2 w-full">
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
                  </div>
                </ExpandableCardHeader>

                <ExpandableCardContent className="!p-3 !pt-0">
                  <ExpandableContent preset="fade">
                    <div className="space-y-3">
                      {/* Type-specific content */}
                      {data.type === 'note' && (
                        <textarea
                          className="w-full h-32 p-2 text-xs bg-background border rounded resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Write your notes here..."
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      {data.type === 'terminal' && (
                        <div className="bg-black/90 rounded p-3 font-mono text-xs text-green-400">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-muted-foreground">$</span>
                            <span>Terminal output will appear here</span>
                          </div>
                          <div className="opacity-50">...</div>
                        </div>
                      )}

                      {data.type === 'browser' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            className="w-full p-2 text-xs bg-background border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="https://..."
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="h-24 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            Browser preview
                          </div>
                        </div>
                      )}

                      {data.type === 'agent' && (
                        <div className="space-y-2">
                          <div className="text-xs space-y-2">
                            <div className="flex gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-3 h-3" />
                              </div>
                              <div className="flex-1 p-2 bg-muted rounded">
                                Agent conversation will appear here
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Metadata footer */}
                      <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Status</span>
                          <span className="capitalize">{data.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duration</span>
                          <span>{duration}{typeof duration === 'number' ? ' min' : ''}</span>
                        </div>
                      </div>
                    </div>
                  </ExpandableContent>
                </ExpandableCardContent>
              </BaseNode>
            </div>
          </ExpandableCard>
        </ExpandableTrigger>
      )}
    </Expandable>
  );
}

export const SegmentNode = memo(SegmentNodeComponent);
