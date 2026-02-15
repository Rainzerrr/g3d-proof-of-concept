import * as THREE from "three";
import { ShapeType, GeometryCache, TopologyData } from "../context/types";
import { computeTopology } from "./geometryHelpers";

// Global cache to prevent re-computing topology on every render
const geometryCache = new Map<ShapeType, GeometryCache>();

/**
 * Factory for creating raw Three.js BufferGeometries based on shape type.
 */
function createGeometry(type: ShapeType): THREE.BufferGeometry {
  switch (type) {
    case "cube":
      return new THREE.BoxGeometry(1, 1, 1);
    case "sphere":
      return new THREE.SphereGeometry(0.5, 32, 32);
    case "cylinder":
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    case "circle":
      return new THREE.CircleGeometry(0.5, 32);
    case "square":
      return new THREE.PlaneGeometry(1, 1);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

/**
 * Retrieves geometry and topology data for a specific shape type.
 * Implements a Singleton/Cache pattern to optimize performance.
 *
 * @param type - The primitive shape type to retrieve.
 * @returns Cached geometry, visual edges, and computed topology data.
 */
export function getGeometryData(type: ShapeType): GeometryCache {
  if (!geometryCache.has(type)) {
    try {
      const geometry = createGeometry(type);
      const edges = new THREE.EdgesGeometry(geometry);

      // Compute heavy topology data (welding, quads, etc.)
      const {
        vertices,
        edges: topologyEdges,
        faces,
        positionIndexMap,
      } = computeTopology(geometry);

      const topology: TopologyData = { vertices, edges: topologyEdges, faces };

      geometryCache.set(type, {
        geometry,
        edges,
        topology,
        positionIndexMap,
      });
    } catch (error) {
      console.error(`Failed to create geometry for type ${type}:`, error);

      // Fallback mechanism to prevent app crash
      const fallbackGeometry = new THREE.BoxGeometry(1, 1, 1);
      const fallbackEdges = new THREE.EdgesGeometry(fallbackGeometry);
      const fallbackTopologyData = computeTopology(fallbackGeometry);

      geometryCache.set(type, {
        geometry: fallbackGeometry,
        edges: fallbackEdges,
        topology: fallbackTopologyData as TopologyData,
        positionIndexMap: fallbackTopologyData.positionIndexMap,
      });
    }
  }

  return geometryCache.get(type)!;
}

/**
 * Clears the geometry cache and disposes of GPU resources.
 * Call this when unmounting the editor or reloading contexts.
 */
export function clearGeometryCache(): void {
  geometryCache.forEach((cache) => {
    cache.geometry.dispose();
    cache.edges.dispose();
  });
  geometryCache.clear();
}

/**
 * Helper to determine if a shape type is 2D (planar).
 */
export function is2DShape(type: ShapeType): boolean {
  return type === "square" || type === "circle";
}
