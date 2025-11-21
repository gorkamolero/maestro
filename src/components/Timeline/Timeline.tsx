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
import { tracksStore } from '@/stores/tracks.store';
import { SegmentNode } from '@/components/Segments/SegmentNode';
import { TrackLabelNode } from '@/components/Tracks/TrackLabelNode';
import { NowLine } from './NowLine';
import { timeToPixels, getSegmentWidth, TRACK_HEIGHT } from '@/lib/timeline-utils';

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

  // Reference time for the timeline (start of today)
  const referenceTime = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

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

  // Update track label offset to keep them at left edge
  const onMove = useCallback((event: any, viewport: any) => {
    setTrackLabelOffset(-viewport.x / viewport.zoom);
  }, []);

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
        <NowLine referenceTime={referenceTime} />
      </ReactFlow>
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
