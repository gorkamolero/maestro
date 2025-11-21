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
import { ZoomControls } from './ZoomControls';
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
}

function TimelineCanvas({ onCenterOnNow }: { onCenterOnNow?: (fn: () => void) => void }) {
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

  const { centerOnNow } = useKeyboardNavigation({ containerRef, referenceTime });

  // Expose centerOnNow to parent
  if (onCenterOnNow) {
    onCenterOnNow(centerOnNow);
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
        <ZoomControls onBackToNow={centerOnNow} />
      </ReactFlow>
      <TimeRuler referenceTime={referenceTime} />
      <NowLine referenceTime={referenceTime} />
      <SegmentEditor segment={selectedSegment} onClose={() => setSelectedSegment(null)} />
    </div>
  );
}

export const Timeline = forwardRef<TimelineHandle>((props, ref) => {
  let centerOnNowFn: (() => void) | null = null;

  useImperativeHandle(ref, () => ({
    centerOnNow: () => {
      if (centerOnNowFn) {
        centerOnNowFn();
      }
    },
  }));

  return (
    <ReactFlowProvider>
      <TimelineCanvas
        onCenterOnNow={(fn) => {
          centerOnNowFn = fn;
        }}
      />
    </ReactFlowProvider>
  );
});
