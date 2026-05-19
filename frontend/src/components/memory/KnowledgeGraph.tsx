import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type GraphData, type LinkObject, type NodeObject } from 'react-force-graph-2d';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

import { getEntityTypeColor } from '../../lib/utils';
import { useMemoryStore } from '../../stores/memoryStore';
import Button from '../ui/Button';

type GraphNode = NodeObject<{ id: string; name: string; type: string; val: number }>;

type GraphLink = LinkObject<GraphNode, { label: string; confidence: number }>;

const KnowledgeGraph = () => {
  const { triples, entities } = useMemoryStore();
  const graphRef = useRef<ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLink>> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 500 });

  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) {
        return;
      }
      setDimensions({
        width: containerRef.current.clientWidth || 400,
        height: containerRef.current.clientHeight || 500,
      });
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const graphData = useMemo(() => {
    const nodes = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    triples.forEach((triple) => {
      const objectName = triple.object_ || (triple as { object?: string }).object || '';
      if (!objectName) {
        return;
      }

      if (!nodes.has(triple.subject)) {
        const entity = entities.find((item) => item.name === triple.subject);
        nodes.set(triple.subject, {
          id: triple.subject,
          name: triple.subject,
          type: entity?.entity_type || 'other',
          val: 10,
        });
      }

      if (!nodes.has(objectName)) {
        const entity = entities.find((item) => item.name === objectName);
        nodes.set(objectName, {
          id: objectName,
          name: objectName,
          type: entity?.entity_type || 'other',
          val: 8,
        });
      }

      links.push({
        source: triple.subject,
        target: objectName,
        label: triple.predicate,
        confidence: triple.confidence,
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      links,
    };
  }, [entities, triples]) as GraphData<GraphNode, GraphLink>;

  const handleReset = () => {
    graphRef.current?.zoomToFit(400);
  };

  return (
    <div ref={containerRef} className="h-full relative bg-bg-primary/20 rounded-2xl border border-border/20 overflow-hidden">
      {graphData.nodes.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-center p-6">
          <p className="text-sm text-text-muted italic max-w-[200px]">
            Start a conversation with relationship-rich details to populate the graph.
          </p>
        </div>
      ) : (
        <>
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            nodeLabel="name"
            nodeColor={(node: GraphNode) => getEntityTypeColor(node.type)}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            linkColor={() => 'rgba(148, 163, 184, 0.2)'}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            nodeCanvasObject={(node: GraphNode, ctx, globalScale) => {
              if (typeof node.x !== 'number' || typeof node.y !== 'number') return;
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Inter`;
              const textWidth = ctx.measureText(label).width;
              const backgroundWidth = textWidth + fontSize * 0.8;
              const backgroundHeight = fontSize + fontSize * 0.4;

              ctx.fillStyle = 'rgba(10, 14, 26, 0.82)';
              ctx.fillRect(
                node.x - backgroundWidth / 2,
                node.y - backgroundHeight / 2,
                backgroundWidth,
                backgroundHeight,
              );

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = getEntityTypeColor(node.type);
              ctx.fillText(label, node.x, node.y);

              ctx.beginPath();
              ctx.arc(node.x, node.y - fontSize, 2 / globalScale, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={(link: GraphLink, ctx, globalScale) => {
              const source = link.source;
              const target = link.target;
              if (typeof source !== 'object' || typeof target !== 'object') {
                return;
              }
              if (typeof source.x !== 'number' || typeof source.y !== 'number' || typeof target.x !== 'number' || typeof target.y !== 'number') {
                return;
              }

              const label = link.label;
              const maxFontSize = 4;
              const labelMargin = 6;
              const relX = target.x - source.x;
              const relY = target.y - source.y;
              const maxTextLength = Math.sqrt(relX ** 2 + relY ** 2) - labelMargin * 2;
              let fontSize = Math.min(maxFontSize, maxTextLength / Math.max(label.length, 1));
              fontSize /= globalScale;

              const textPos = {
                x: source.x + relX / 2,
                y: source.y + relY / 2,
              };

              ctx.font = `${fontSize}px Inter`;
              const textWidth = ctx.measureText(label).width;
              const backgroundWidth = textWidth + fontSize * 0.4;
              const backgroundHeight = fontSize + fontSize * 0.4;

              ctx.fillStyle = 'rgba(10, 14, 26, 0.4)';
              ctx.fillRect(
                textPos.x - backgroundWidth / 2,
                textPos.y - backgroundHeight / 2,
                backgroundWidth,
                backgroundHeight,
              );

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
              ctx.fillText(label, textPos.x, textPos.y);
            }}
          />

          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="p-2 h-auto rounded-lg bg-bg-elevated/80 border-border/50"
              onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 1.2, 400)}
              icon={<ZoomIn className="w-4 h-4" />}
            />
            <Button
              variant="secondary"
              size="sm"
              className="p-2 h-auto rounded-lg bg-bg-elevated/80 border-border/50"
              onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 0.8, 400)}
              icon={<ZoomOut className="w-4 h-4" />}
            />
            <Button
              variant="secondary"
              size="sm"
              className="p-2 h-auto rounded-lg bg-bg-elevated/80 border-border/50"
              onClick={handleReset}
              icon={<RotateCcw className="w-4 h-4" />}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default KnowledgeGraph;
