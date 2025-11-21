import {
  ReactFlow,
  Background,
  ReactFlowProvider,
  Panel,
  MiniMap,
} from '@xyflow/react';

import { SegmentNode } from '@/components/Segments/SegmentNode';
import { SegmentEditor } from '@/components/Segments/SegmentEditor';
import { TrackLabelNode } from '@/components/Tracks/TrackLabelNode';
import { NowLine } from './NowLine';
import { TimeRuler } from './TimeRuler';
import { ZoomControls } from './ZoomControls';
import { TRACK_HEIGHT } from '@/lib/timeline-utils';
import { useTimelineViewport } from '@/hooks/useTimelineViewport';
import { useTimelineNodes } from '@/hooks/useTimelineNodes';
import { useTimelineHandlers } from '@/hooks/useTimelineHandlers';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

const nodeTypes = {
  segment: SegmentNode,
  trackLabel: TrackLabelNode,
  nowLine: NowLine,
};

function TimelineCanvas() {
  const { containerRef, referenceTime } = useTimelineViewport();

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
        <Background variant="lines" gap={TRACK_HEIGHT} className="opacity-10" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <TimeRuler referenceTime={referenceTime} />
        <ZoomControls onBackToNow={centerOnNow} />
      </ReactFlow>
      <SegmentEditor segment={selectedSegment} onClose={() => setSelectedSegment(null)} />
    </div>
  );
}

export function Timeline() {
  return (
    <ReactFlowProvider>
      <TimelineCanvas />
    </ReactFlowProvider>
  );
}
