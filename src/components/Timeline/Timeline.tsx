import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { useSnapshot } from 'valtio';
import {
  ReactFlow,
  Background,
  Node,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  MiniMap,
} from '@xyflow/react';

import { timelineStore, timelineActions } from '@/stores/timeline.store';
import { tracksStore, tracksActions } from '@/stores/tracks.store';
import { segmentsActions } from '@/stores/segments.store';
import { SegmentNode } from '@/components/Segments/SegmentNode';
import { SegmentEditor } from '@/components/Segments/SegmentEditor';
import { TrackLabelNode } from '@/components/Tracks/TrackLabelNode';
import type { Segment } from '@/types';
import { NowLine } from './NowLine';
import { TimeRuler } from './TimeRuler';
import { ZoomControls } from './ZoomControls';
import { timeToPixels, pixelsToTime, getSegmentWidth, TRACK_HEIGHT } from '@/lib/timeline-utils';

const nodeTypes = {
  segment: SegmentNode,
  trackLabel: TrackLabelNode,
};

function TimelineCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { now, zoomLevel } = useSnapshot(timelineStore);
  const { tracks } = useSnapshot(tracksStore);
  const [trackLabelOffset, setTrackLabelOffset] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  // Reference time for the timeline (start of today)
  const referenceTime = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []); // 12am today

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      timelineActions.setViewportSize(width, height);
    }

    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        timelineActions.setViewportSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Center viewport on NOW when component mounts
  useEffect(() => {
    const nowX = timeToPixels(now, zoomLevel, referenceTime);
    const { width } = containerRef.current?.getBoundingClientRect() || { width: 1000 };

    // Position NOW line at center of viewport
    reactFlowInstance.setViewport({
      x: -nowX + width / 2,
      y: 0,
      zoom: 1,
    });
  }, []);

  // Convert tracks and segments to React Flow nodes
  const nodes: Node[] = useMemo(() => {
    const trackLabelNodes = tracks.map((track) => ({
      id: `track-label-${track.id}`,
      type: 'trackLabel',
      position: {
        x: trackLabelOffset + 20, // Stick to left edge with padding
        y: track.position * TRACK_HEIGHT,
      },
      data: {
        trackId: track.id,
        name: track.name,
        color: track.color,
        segmentCount: track.segments.length,
      },
      draggable: false,
    }));

    const segmentNodes = tracks.flatMap((track) =>
      track.segments.map((segment) => {
        const xPos = timeToPixels(segment.startTime, zoomLevel, referenceTime);
        const width = getSegmentWidth(
          segment.startTime,
          segment.endTime,
          zoomLevel,
          referenceTime,
          now
        );

        return {
          id: segment.id,
          type: 'segment',
          position: {
            x: xPos,
            y: track.position * TRACK_HEIGHT,
          },
          data: {
            title: segment.title,
            type: segment.type,
            status: segment.status,
            width,
            startTime: segment.startTime,
            endTime: segment.endTime,
          },
          draggable: false,
        };
      })
    );

    return [...trackLabelNodes, ...segmentNodes];
  }, [tracks, zoomLevel, referenceTime, now, trackLabelOffset]);

  // Empty handlers - we manage state externally via Valtio
  const onNodesChange = useCallback(() => {}, []);
  const onEdgesChange = useCallback(() => {}, []);

  // Handle node clicks to open segment editor
  const onNodeClick = useCallback((event: any, node: Node) => {
    // Only open editor for segment nodes, not track labels
    if (node.type === 'segment') {
      // Find the segment in the tracks
      for (const track of tracks) {
        const segment = track.segments.find(s => s.id === node.id);
        if (segment) {
          setSelectedSegment(segment);
          break;
        }
      }
    }
  }, [tracks]);

  // Update track label offset to keep them at left edge
  const onMove = useCallback((event: any, viewport: any) => {
    setTrackLabelOffset(-viewport.x / viewport.zoom);
  }, []);

  // Click on canvas to create segment
  const onPaneClick = useCallback((event: any) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    // Get click position in viewport coordinates
    const viewport = reactFlowInstance.getViewport();
    const clickX = (event.clientX - bounds.left - viewport.x) / viewport.zoom;
    const clickY = (event.clientY - bounds.top - viewport.y) / viewport.zoom;

    // Convert X to time
    const clickTime = pixelsToTime(clickX, zoomLevel, referenceTime);

    // Convert Y to track index
    const trackIndex = Math.floor(clickY / TRACK_HEIGHT);
    if (trackIndex < 0 || trackIndex >= tracks.length) return;

    const track = tracks[trackIndex];

    // Create new segment at clicked time
    const segment = segmentsActions.createSegment(
      track.id,
      'New segment',
      'note' // Default to note type
    );

    // Override start time to clicked time
    segment.startTime = clickTime;

    tracksActions.addSegment(track.id, segment);
  }, [zoomLevel, referenceTime, tracks]);

  // Space bar to center on NOW
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        const nowX = timeToPixels(now, zoomLevel, referenceTime);
        const { width } = containerRef.current?.getBoundingClientRect() || { width: 1000 };

        reactFlowInstance.setViewport({
          x: -nowX + width / 2,
          y: reactFlowInstance.getViewport().y,
          zoom: reactFlowInstance.getViewport().zoom,
        }, { duration: 300 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [now, zoomLevel, referenceTime, reactFlowInstance]);

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
        <ZoomControls />
        <NowLine referenceTime={referenceTime} />
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
