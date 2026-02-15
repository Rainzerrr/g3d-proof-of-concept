import * as THREE from "three";
import { TopologyData } from "../context/types";

type ComputeTopologyResult = TopologyData & { positionIndexMap: number[] };

/**
 * Merges adjacent triangles sharing an internal edge to form logical quads.
 * It identifies "diagonal" edges that are not part of the visual topology and merges the triangles sharing them.
 *
 * @param triangles - List of triangle face indices.
 * @param topologyEdges - List of visual "hard" edges.
 */
function groupTrianglesIntoQuads(
  triangles: number[][],
  topologyEdges: [number, number][],
): number[][] {
  const edgeMap = new Map<string, number[][]>();
  const getEdgeKey = (a: number, b: number) =>
    a < b ? `${a}-${b}` : `${b}-${a}`;

  // Create a quick lookup set for visual topology edges
  const topologyEdgeSet = new Set<string>();
  topologyEdges.forEach(([a, b]) => topologyEdgeSet.add(getEdgeKey(a, b)));

  // 1. Identify shared internal edges (diagonals)
  // If an edge is NOT in topologyEdgeSet, it's a candidate for merging.
  for (const triangle of triangles) {
    const [a, b, c] = triangle;
    const edges = [
      [a, b],
      [b, c],
      [c, a],
    ];

    for (const [u, v] of edges) {
      const edgeKey = getEdgeKey(u, v);
      if (!topologyEdgeSet.has(edgeKey)) {
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, []);
        }
        edgeMap.get(edgeKey)!.push(triangle);
      }
    }
  }

  const processedTriangles = new Set<number[]>();
  const quads: number[][] = [];

  // 2. Merge pairs sharing a diagonal into Quads
  for (const adjacentTriangles of edgeMap.values()) {
    if (adjacentTriangles.length === 2) {
      const [T1, T2] = adjacentTriangles;

      if (!processedTriangles.has(T1) && !processedTriangles.has(T2)) {
        // Create a unique set of vertices from both triangles (should result in 4 vertices)
        const quad = Array.from(new Set([...T1, ...T2]));

        if (quad.length === 4) {
          quads.push(quad);
          processedTriangles.add(T1);
          processedTriangles.add(T2);
        }
      }
    }
  }

  // 3. Collect remaining unmerged triangles
  const finalFaces: number[][] = [...quads];
  for (const triangle of triangles) {
    if (!processedTriangles.has(triangle)) {
      finalFaces.push(triangle);
    }
  }

  return finalFaces;
}

/**
 * Triangulates a convex polygon (N >= 3) using the Triangle Fan method.
 * Useful for converting quads back to renderable triangles.
 *
 * @param faceIndices - Ordered list of vertex indices for the face.
 * @returns Flat array of indices for BufferGeometry.
 */
export function fanTriangulatePolygon(faceIndices: number[]): number[] {
  const indices: number[] = [];
  const N = faceIndices.length;

  if (N < 3) return indices;

  // Use the first vertex as a pivot for the fan
  const pivotIndex = 0;

  for (let i = 1; i < N - 1; i++) {
    indices.push(faceIndices[pivotIndex]);
    indices.push(faceIndices[i]);
    indices.push(faceIndices[i + 1]);
  }

  return indices;
}

/**
 * Computes the editable topology of a BufferGeometry.
 * Performs vertex welding, edge extraction, and quad reconstruction.
 *
 * @param geometry - Source Three.js geometry.
 * @returns Topology data (vertices, edges, faces) and a map from BufferGeometry indices to topology indices.
 */
export function computeTopology(
  geometry: THREE.BufferGeometry,
): ComputeTopologyResult {
  try {
    const position = geometry.attributes.position as THREE.BufferAttribute;
    if (!position) {
      throw new Error("Geometry has no position attribute");
    }

    const vertices: THREE.Vector3[] = [];
    const vertexMap = new Map<string, number>();
    const triangles: number[][] = [];
    const positionIndexMap: number[] = [];
    const tolerance = 0.000001;

    const getVertexKey = (x: number, y: number, z: number): string => {
      return `${Math.round(x / tolerance)},${Math.round(y / tolerance)},${Math.round(z / tolerance)}`;
    };

    // 1. Extract and weld unique vertices
    // Maps multiple geometric positions to a single topological vertex index
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const key = getVertexKey(x, y, z);

      let vertexIndex: number;

      if (!vertexMap.has(key)) {
        vertexIndex = vertices.length;
        vertexMap.set(key, vertexIndex);
        vertices.push(new THREE.Vector3(x, y, z));
      } else {
        vertexIndex = vertexMap.get(key)!;
      }

      positionIndexMap[i] = vertexIndex;
    }

    // 2. Extract primitive triangles using welded indices
    const index = geometry.index;
    const faceCount = index ? index.count / 3 : position.count / 3;

    for (let i = 0; i < faceCount; i++) {
      const faceIndices: number[] = [];
      for (let j = 0; j < 3; j++) {
        const idx = index ? index.getX(i * 3 + j) : i * 3 + j;
        faceIndices.push(positionIndexMap[idx]);
      }
      triangles.push(faceIndices);
    }

    // 3. Extract visual edges using EdgesGeometry
    // This filters out internal flat edges automatically
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesPosition = edgesGeometry.attributes
      .position as THREE.BufferAttribute;
    const edgesSet = new Set<string>();

    for (let i = 0; i < edgesPosition.count; i += 2) {
      const x1 = edgesPosition.getX(i);
      const y1 = edgesPosition.getY(i);
      const z1 = edgesPosition.getZ(i);
      const key1 = getVertexKey(x1, y1, z1);

      const x2 = edgesPosition.getX(i + 1);
      const y2 = edgesPosition.getY(i + 1);
      const z2 = edgesPosition.getZ(i + 1);
      const key2 = getVertexKey(x2, y2, z2);

      const idx1 = vertexMap.get(key1);
      const idx2 = vertexMap.get(key2);

      if (idx1 !== undefined && idx2 !== undefined) {
        const edgeKey = idx1 < idx2 ? `${idx1}-${idx2}` : `${idx2}-${idx1}`;
        edgesSet.add(edgeKey);
      }
    }
    edgesGeometry.dispose();

    const edgeArray: [number, number][] = Array.from(edgesSet).map((key) => {
      const [a, b] = key.split("-").map(Number);
      return [a, b] as [number, number];
    });

    // 4. Merge triangles into Quads based on topology
    const faces = groupTrianglesIntoQuads(triangles, edgeArray);

    return {
      vertices,
      edges: edgeArray,
      faces,
      positionIndexMap,
    };
  } catch (error) {
    console.error("Error computing topology:", error);
    return { vertices: [], edges: [], faces: [], positionIndexMap: [] };
  }
}

/**
 * Filters edges where both endpoints are in the selection.
 */
export function getSelectedEdges(
  allEdges: [number, number][],
  selectedVertexIndices: number[],
): [number, number][] {
  if (selectedVertexIndices.length < 2) return [];

  const selectedSet = new Set(selectedVertexIndices);
  const selectedEdges: [number, number][] = [];

  for (const [a, b] of allEdges) {
    if (selectedSet.has(a) && selectedSet.has(b)) {
      selectedEdges.push([a, b]);
    }
  }

  return selectedEdges;
}

/**
 * Filters faces where ALL vertices are in the selection.
 */
export function getSelectedFaces(
  faces: number[][],
  selectedVertexIndices: number[],
): number[][] {
  if (selectedVertexIndices.length < 3) return [];

  const selectedSet = new Set(selectedVertexIndices);
  const selectedFaces: number[][] = [];

  for (const face of faces) {
    const allVerticesSelected = face.every((vertexIndex) =>
      selectedSet.has(vertexIndex),
    );
    if (allVerticesSelected) selectedFaces.push(face);
  }

  return selectedFaces;
}

/**
 * Reorders quad vertices to ensure they follow a contiguous path (perimeter).
 * Prevents "bowtie" or crossed rendering artifacts.
 */
export function orderQuadVertices(
  face: number[],
  edges: [number, number][],
): number[] {
  if (face.length !== 4) return face;

  // Build local adjacency graph
  const adjacency = new Map<number, number[]>();
  face.forEach((v) => adjacency.set(v, []));

  edges.forEach(([a, b]) => {
    if (face.includes(a) && face.includes(b)) {
      adjacency.get(a)?.push(b);
      adjacency.get(b)?.push(a);
    }
  });

  // Traverse the graph to order vertices
  const ordered = [face[0]];
  let current = face[0];

  for (let i = 0; i < 3; i++) {
    const neighbors = adjacency.get(current) || [];
    const next = neighbors.find((n) => !ordered.includes(n));

    if (next !== undefined) {
      ordered.push(next);
      current = next;
    } else {
      return face; // Fallback if topology is broken
    }
  }

  return ordered;
}
