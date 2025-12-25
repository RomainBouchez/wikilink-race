import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Network, RotateCcw } from 'lucide-react';
import { GraphData } from '../types';

interface PathGraphVisualizationProps {
  data: GraphData;
}

export const PathGraphVisualization: React.FC<PathGraphVisualizationProps> = ({ data }) => {
  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = Math.min(window.innerHeight - 300, 600);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleResetView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  };

  const handleNodeClick = (node: any) => {
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(node.id)}`;
    window.open(url, '_blank');
  };

  // Empty state
  if (!data || data.nodes.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        <Network className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-700 mb-2">No graph data yet!</h3>
        <p className="text-gray-500">Play more games to see your Wikipedia journey visualized.</p>
      </div>
    );
  }

  // Low data state
  if (data.nodes.length < 3) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        <Network className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-700 mb-2">Play more games!</h3>
        <p className="text-gray-500">
          You need more games to see meaningful connections in the graph.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Current pages: {data.nodes.length}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Wikipedia Journey</h2>
          <p className="text-sm text-gray-600">
            {data.nodes.length} pages • {data.links.length} connections
          </p>
          {data.nodes.length >= 100 && (
            <p className="text-xs text-purple-600 mt-1">
              Showing your top 100 most visited pages
            </p>
          )}
        </div>

        <button
          onClick={handleResetView}
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
        >
          <RotateCcw className="w-4 h-4" />
          Reset View
        </button>
      </div>

      <div
        ref={containerRef}
        className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node: any) => `${node.label} (${node.visits} visits)`}
          nodeAutoColorBy="visits"
          nodeVal={(node: any) => Math.sqrt(node.visits) * 3}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.label;
            const fontSize = 12 / globalScale;
            const nodeSize = Math.sqrt(node.visits) * 3;

            // Draw node circle
            ctx.fillStyle = node.color || '#6366f1';
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
            ctx.fill();

            // Draw label if zoomed in enough
            if (globalScale > 1.5) {
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#000';
              ctx.fillText(label, node.x, node.y + nodeSize + fontSize);
            }
          }}
          linkWidth={(link: any) => Math.sqrt(link.value)}
          linkDirectionalParticles={(link: any) => Math.min(link.value, 4)}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.005}
          onNodeClick={handleNodeClick}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          cooldownTicks={100}
          onEngineStop={() => {
            if (graphRef.current) {
              graphRef.current.zoomToFit(400);
            }
          }}
        />
      </div>

      <div className="mt-4 text-sm text-gray-600 text-center">
        <p>Click on a node to open its Wikipedia page • Drag to explore • Scroll to zoom</p>
      </div>
    </div>
  );
};
