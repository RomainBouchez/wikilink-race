import { getUserGames } from './firestoreService';
import { GraphData, GraphNode, GraphLink, GameEntry } from '../types';

/**
 * Graph Data Service
 * Builds interactive graph visualization data from game paths
 */
class GraphDataService {

  /**
   * Process a single game path into nodes and edges
   * @param path - Array of page titles in order visited
   * @param nodes - Existing nodes map (will be mutated)
   * @param edges - Existing edges map (will be mutated)
   */
  private processGamePath(
    path: string[],
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphLink>
  ): void {
    // Process each page as a node
    for (const pageTitle of path) {
      const existing = nodes.get(pageTitle);

      if (existing) {
        // Increment visit count
        existing.visits++;
      } else {
        // Create new node
        nodes.set(pageTitle, {
          id: pageTitle,
          label: pageTitle,
          visits: 1
        });
      }
    }

    // Process consecutive pairs as edges
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const edgeKey = `${from}|${to}`;

      const existing = edges.get(edgeKey);

      if (existing) {
        // Increment transition count
        existing.value++;
      } else {
        // Create new edge
        edges.set(edgeKey, {
          source: from,
          target: to,
          value: 1
        });
      }
    }
  }

  /**
   * Aggregate multiple games into a single graph
   * @param games - Array of game entries
   * @returns Raw graph data (unfiltered)
   */
  private aggregateGraphData(games: GameEntry[]): GraphData {
    const nodesMap = new Map<string, GraphNode>();
    const edgesMap = new Map<string, GraphLink>();

    // Process each game's path
    for (const game of games) {
      if (game.path && Array.isArray(game.path) && game.path.length > 0) {
        this.processGamePath(game.path, nodesMap, edgesMap);
      }
    }

    return {
      nodes: Array.from(nodesMap.values()),
      links: Array.from(edgesMap.values())
    };
  }

  /**
   * Limit graph data to top N most visited nodes
   * Also filters edges to only include connections between remaining nodes
   * @param data - Raw graph data
   * @param maxNodes - Maximum number of nodes to keep
   * @param minEdgeValue - Minimum edge value to keep (default: 1)
   */
  private limitGraphData(
    data: GraphData,
    maxNodes: number = 100,
    minEdgeValue: number = 1
  ): GraphData {
    // If within limit, just filter edges and return
    if (data.nodes.length <= maxNodes) {
      const filteredLinks = data.links.filter(link => link.value >= minEdgeValue);
      return {
        nodes: data.nodes,
        links: filteredLinks
      };
    }

    // Sort nodes by visit count (descending)
    const sortedNodes = [...data.nodes].sort((a, b) => b.visits - a.visits);

    // Take top N nodes
    const topNodes = sortedNodes.slice(0, maxNodes);
    const topNodeIds = new Set(topNodes.map(node => node.id));

    // Filter edges to only include connections between top nodes
    const filteredLinks = data.links.filter(link => {
      return (
        topNodeIds.has(link.source) &&
        topNodeIds.has(link.target) &&
        link.value >= minEdgeValue
      );
    });

    return {
      nodes: topNodes,
      links: filteredLinks
    };
  }

  /**
   * Build complete graph for a user
   * @param userId - User ID
   * @param maxGames - Maximum number of recent games to process (default: 50)
   * @param maxNodes - Maximum nodes in final graph (default: 100)
   * @returns Graph data ready for visualization
   */
  async buildUserGraph(
    userId: string,
    maxGames: number = 50,
    maxNodes: number = 100
  ): Promise<GraphData> {
    // Fetch recent games
    const games = await getUserGames(userId, maxGames);

    // Check if user has any games
    if (games.length === 0) {
      return {
        nodes: [],
        links: []
      };
    }

    // Aggregate all games into graph
    const rawGraph = this.aggregateGraphData(games);

    // Limit to top nodes and filter weak edges
    // Use minEdgeValue = 2 to reduce noise (optional, can be 1)
    const limitedGraph = this.limitGraphData(rawGraph, maxNodes, 1);

    return limitedGraph;
  }

  /**
   * Build a simple graph from a single game (for preview)
   * @param path - Game path
   */
  buildGameGraph(path: string[]): GraphData {
    const nodesMap = new Map<string, GraphNode>();
    const edgesMap = new Map<string, GraphLink>();

    this.processGamePath(path, nodesMap, edgesMap);

    return {
      nodes: Array.from(nodesMap.values()),
      links: Array.from(edgesMap.values())
    };
  }

  /**
   * Get graph statistics
   * @param userId - User ID
   */
  async getGraphStats(userId: string): Promise<{
    totalNodes: number;
    totalEdges: number;
    totalGamesAnalyzed: number;
  }> {
    const games = await getUserGames(userId, 50);
    const graph = this.aggregateGraphData(games);

    return {
      totalNodes: graph.nodes.length,
      totalEdges: graph.links.length,
      totalGamesAnalyzed: games.length
    };
  }
}

export const graphDataService = new GraphDataService();
