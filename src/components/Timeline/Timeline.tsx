import { forwardRef, useImperativeHandle } from 'react';
import {
  ReactFlow,
  Background,
  ReactFlowProvider,
  Panel,
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
import { useViewportControls } from '@/hooks/useViewportControls';

const nodeTypes = {
  segment: SegmentNode,
  trackLabel: TrackLabelNode,
};

export interface TimelineHandle {
  centerOnNow: () => void;
  centerOnSpace: (trackPosition: number) => void;
}

interface TimelineCanvasProps {
  onCenterOnNow?: (fn: () => void) => void;
  onCenterOnSpace?: (fn: (trackPosition: number) => void) => void;
  onAddSpace?: () => void;
}

function TimelineCanvas({ onCenterOnNow, onCenterOnSpace, onAddSpace }: TimelineCanvasProps) {
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

  const { centerOnNow, centerOnSpace, changeZoomLevelAndCenter } = useViewportControls({ containerRef, referenceTime });

  // Expose methods to parent
  if (onCenterOnNow) {
    onCenterOnNow(centerOnNow);
  }
  if (onCenterOnSpace) {
    onCenterOnSpace(centerOnSpace);
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
        <Background
          variant={backgroundVariant}
          gap={backgroundVariant === 'dots' ? 20 : TRACK_HEIGHT}
          size={backgroundVariant === 'dots' ? 2 : undefined}
          className={backgroundVariant === 'dots' ? 'opacity-30' : 'opacity-10'}
        />
        <TimelineControls onBackToNow={centerOnNow} onAddSpace={onAddSpace} onZoomChange={changeZoomLevelAndCenter} />
      </ReactFlow>
      <TimeRuler referenceTime={referenceTime} />
      <NowLine referenceTime={referenceTime} />
      <SegmentEditor segment={selectedSegment} onClose={() => setSelectedSegment(null)} />
    </div>
  );
}

interface TimelineProps {
  onAddSpace?: () => void;
}

export const Timeline = forwardRef<TimelineHandle, TimelineProps>(({ onAddSpace }, ref) => {
  let centerOnNowFn: (() => void) | null = null;
  let centerOnTrackFn: ((trackPosition: number) => void) | null = null;

  useImperativeHandle(ref, () => ({
    centerOnNow: () => {
      if (centerOnNowFn) {
        centerOnNowFn();
      }
    },
    centerOnSpace: (trackPosition: number) => {
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
        onCenterOnSpace={(fn) => {
          centerOnTrackFn = fn;
        }}
        onAddSpace={onAddSpace}
      />
    </ReactFlowProvider>
  );
});
