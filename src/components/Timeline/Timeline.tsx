import { forwardRef, useImperativeHandle } from 'react';
import {
  ReactFlow,
  Background,
  ReactFlowProvider,
  Panel,
  MiniMap,
} from '@xyflow/react';
import { useSnapshot } from 'valtio';

import { SegmentNode } from '@/components/Segments/SegmentNode';
import { SegmentEditor } from '@/components/Segments/SegmentEditor';
import { TrackLabelNode } from '@/components/Tracks/TrackLabelNode';
import { NowLine } from './NowLine';
import { TimeRuler } from './TimeRuler';
import { TimelineControls } from './TimelineControls';
import { TRACK_HEIGHT } from '@/lib/timeline-utils';
import { timelineStore } from '@/stores/timeline.store';
import { useTimelineViewport } from '@/hooks/useTimelineViewport';
import { useTimelineNodes } from '@/hooks/useTimelineNodes';
import { useTimelineHandlers } from '@/hooks/useTimelineHandlers';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

const nodeTypes = {
  segment: SegmentNode,
  trackLabel: TrackLabelNode,
};

export interface TimelineHandle {
  centerOnNow: () => void;
  centerOnTrack: (trackPosition: number) => void;
}

interface TimelineCanvasProps {
  onCenterOnNow?: (fn: () => void) => void;
  onCenterOnTrack?: (fn: (trackPosition: number) => void) => void;
  onAddTrack?: () => void;
}

function TimelineCanvas({ onCenterOnNow, onCenterOnTrack, onAddTrack }: TimelineCanvasProps) {
  const { containerRef, referenceTime } = useTimelineViewport();
  const { backgroundVariant } = useSnapshot(timelineStore);

  const {
    trackLabelOffset,
    selectedSegment,
    setSelectedSegment,
    onNodesChange,
    onEdgesChange,
    onNodeClick,
    onMove,
    onPaneClick,
  } = useTimelineHandlers({ containerRef, referenceTime });

  const nodes = useTimelineNodes(referenceTime, trackLabelOffset);

  const { centerOnNow, centerOnTrack } = useKeyboardNavigation({ containerRef, referenceTime });

  // Expose methods to parent
  if (onCenterOnNow) {
    onCenterOnNow(centerOnNow);
  }
  if (onCenterOnTrack) {
    onCenterOnTrack(centerOnTrack);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-background overflow-hidden"
    >
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        edges={[]}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onMove={onMove}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        panOnDrag={true}
        panOnScroll={true}
        zoomOnScroll={false}
        zoomOnPinch={true}
        preventScrolling={false}
        minZoom={0.1}
        maxZoom={4}
        fitView={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background variant={backgroundVariant} gap={TRACK_HEIGHT} className="opacity-10" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <TimelineControls onBackToNow={centerOnNow} onAddTrack={onAddTrack} />
      </ReactFlow>
      <TimeRuler referenceTime={referenceTime} />
      <NowLine referenceTime={referenceTime} />
      <SegmentEditor segment={selectedSegment} onClose={() => setSelectedSegment(null)} />
    </div>
  );
}

interface TimelineProps {
  onAddTrack?: () => void;
}

export const Timeline = forwardRef<TimelineHandle, TimelineProps>(({ onAddTrack }, ref) => {
  let centerOnNowFn: (() => void) | null = null;
  let centerOnTrackFn: ((trackPosition: number) => void) | null = null;

  useImperativeHandle(ref, () => ({
    centerOnNow: () => {
      if (centerOnNowFn) {
        centerOnNowFn();
      }
    },
    centerOnTrack: (trackPosition: number) => {
      if (centerOnTrackFn) {
        centerOnTrackFn(trackPosition);
      }
    },
  }));

  return (
    <ReactFlowProvider>
      <TimelineCanvas
        onCenterOnNow={(fn) => {
          centerOnNowFn = fn;
        }}
        onCenterOnTrack={(fn) => {
          centerOnTrackFn = fn;
        }}
        onAddTrack={onAddTrack}
      />
    </ReactFlowProvider>
  );
});
