import * as THREE from "three";
import { ShapeType, GeometryCache, TopologyData } from "../context/types";
import { computeTopology } from "./geometryHelpers";

// ✅ Cache global pour éviter de recalculer les géométries
const geometryCache = new Map<ShapeType, GeometryCache>();

/**
 * Crée une géométrie selon le type de forme
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
 * Récupère les données de géométrie depuis le cache ou les calcule
 * ✅ Le retour est casté pour inclure `positionIndexMap`
 */
export function getGeometryData(type: ShapeType): GeometryCache {
  if (!geometryCache.has(type)) {
    try {
      const geometry = createGeometry(type);
      const edges = new THREE.EdgesGeometry(geometry);

      // computeTopology retourne maintenant positionIndexMap
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
        positionIndexMap, // ✅ Enregistrement du positionIndexMap
      });
    } catch (error) {
      console.error(`Failed to create geometry for type ${type}:`, error);

      // Fallback sur un cube en cas d'erreur
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

  // Le cache retourne un objet qui correspond à GeometryCache
  return geometryCache.get(type)!;
}

/**
 * Nettoie le cache (utile pour les tests ou le hot-reload)
 */
export function clearGeometryCache(): void {
  geometryCache.forEach((cache) => {
    cache.geometry.dispose();
    cache.edges.dispose();
  });
  geometryCache.clear();
}

/**
 * Vérifie si une forme est 2D
 */
export function is2DShape(type: ShapeType): boolean {
  return type === "square" || type === "circle";
}
