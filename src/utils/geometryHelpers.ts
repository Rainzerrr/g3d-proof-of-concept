import * as THREE from "three";
import { TopologyData } from "../context/types";

type ComputeTopologyResult = TopologyData & { positionIndexMap: number[] };

/**
 * Fusionne les paires de triangles adjacents qui partagent une arête interne
 * (une arête qui n'est pas dans la liste des arêtes externes de la topologie)
 * pour former des quads logiques.
 */
function groupTrianglesIntoQuads(
  triangles: number[][],
  topologyEdges: [number, number][]
): number[][] {
  const edgeMap = new Map<string, number[][]>();
  const getEdgeKey = (a: number, b: number) =>
    a < b ? `${a}-${b}` : `${b}-${a}`;

  // Utilise un Set pour une recherche rapide des arêtes de la topologie
  const topologyEdgeSet = new Set<string>();
  topologyEdges.forEach(([a, b]) => topologyEdgeSet.add(getEdgeKey(a, b)));

  // 1. Identifier les arêtes internes (diagonales) partagées
  for (const triangle of triangles) {
    const [a, b, c] = triangle;
    const edges = [
      [a, b],
      [b, c],
      [c, a],
    ];

    for (const [u, v] of edges) {
      const edgeKey = getEdgeKey(u, v);

      // Si l'arête n'est PAS une arête externe de la topologie, c'est une diagonale interne
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

  // 2. Fusionner les paires qui partagent une diagonale
  for (const adjacentTriangles of edgeMap.values()) {
    if (adjacentTriangles.length === 2) {
      const [T1, T2] = adjacentTriangles;

      // S'assurer que les deux triangles n'ont pas déjà été fusionnés
      if (!processedTriangles.has(T1) && !processedTriangles.has(T2)) {
        const quad = Array.from(new Set([...T1, ...T2]));

        if (quad.length === 4) {
          quads.push(quad);
          processedTriangles.add(T1);
          processedTriangles.add(T2);
        }
      }
    }
  }

  // 3. Ajouter les triangles restants (faces non fusionnables)
  const finalFaces: number[][] = [...quads];
  for (const triangle of triangles) {
    if (!processedTriangles.has(triangle)) {
      finalFaces.push(triangle);
    }
  }

  return finalFaces;
}

/**
 * Triangule un polygone convexe (plus de 4 vertices) en utilisant la méthode du "fan".
 * Génère une liste d'indices de triangles à partir d'un ensemble ordonné de vertices.
 * @param faceIndices La liste ordonnée des indices de vertices de la face (N >= 3).
 * @returns Un tableau d'indices pour le BufferGeometry (e.g., [0, 1, 2, 0, 2, 3, ...])
 */
export function fanTriangulatePolygon(faceIndices: number[]): number[] {
  const indices: number[] = [];
  const N = faceIndices.length;

  if (N < 3) return indices;

  // Le premier sommet (indice 0) est le pivot de la triangulation en éventail.
  const pivotIndex = 0;

  // Pour chaque triangle dans l'éventail : (0, i, i+1)
  for (let i = 1; i < N - 1; i++) {
    // Triangle (Pivot, Vertex[i], Vertex[i+1])
    indices.push(faceIndices[pivotIndex]);
    indices.push(faceIndices[i]);
    indices.push(faceIndices[i + 1]);
  }

  return indices;
}

/**
 * Calcule la topologie d'une géométrie (vertices, edges, faces)
 * Les faces sont retournées comme des QUADS (4 indices) en fusionnant les triangles adjacents.
 * Retourne également la map d'index BufferGeometry -> Topologie
 */
export function computeTopology(
  geometry: THREE.BufferGeometry
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
      return `${Math.round(x / tolerance)},${Math.round(
        y / tolerance
      )},${Math.round(z / tolerance)}`;
    };

    // 1. Extraire les vertices uniques et créer la map
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

    // 2. Extraire les triangles (faces primitives de BufferGeometry)
    const index = geometry.index;
    const faceCount = index ? index.count / 3 : position.count / 3;

    for (let i = 0; i < faceCount; i++) {
      const faceIndices: number[] = [];

      for (let j = 0; j < 3; j++) {
        const idx = index ? index.getX(i * 3 + j) : i * 3 + j;
        const vertexIndex = positionIndexMap[idx];
        faceIndices.push(vertexIndex);
      }

      triangles.push(faceIndices);
    }

    // 3. Extraire les edges en utilisant EdgesGeometry
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

    // 4. Fusionner les triangles de la BufferGeometry en quads logiques
    const faces = groupTrianglesIntoQuads(triangles, edgeArray);

    return {
      vertices,
      edges: edgeArray,
      faces, // Contient maintenant les quads logiques (et tout triangle non fusionné)
      positionIndexMap,
    };
  } catch (error) {
    console.error("Error computing topology:", error);
    return {
      vertices: [],
      edges: [],
      faces: [],
      positionIndexMap: [],
    };
  }
}

/**
 * Récupère les edges sélectionnées en fonction des vertices sélectionnés
 */
export function getSelectedEdges(
  edgesGeometry: THREE.EdgesGeometry,
  vertices: [number, number, number][],
  selectedVertexIndices: number[]
): [number, number][] {
  try {
    if (selectedVertexIndices.length < 2) {
      return [];
    }

    const selectedSet = new Set(selectedVertexIndices);
    const selectedEdges: [number, number][] = [];
    const position = edgesGeometry.attributes.position as THREE.BufferAttribute;

    if (!position) {
      return [];
    }

    const tolerance = 0.000001;

    const findVertexIndex = (x: number, y: number, z: number): number => {
      for (let i = 0; i < vertices.length; i++) {
        const [vx, vy, vz] = vertices[i];
        if (
          Math.abs(vx - x) < tolerance &&
          Math.abs(vy - y) < tolerance &&
          Math.abs(vz - z) < tolerance
        ) {
          return i;
        }
      }
      return -1;
    };

    for (let i = 0; i < position.count; i += 2) {
      const x1 = position.getX(i);
      const y1 = position.getY(i);
      const z1 = position.getZ(i);

      const x2 = position.getX(i + 1);
      const y2 = position.getY(i + 1);
      const z2 = position.getZ(i + 1);

      const idx1 = findVertexIndex(x1, y1, z1);
      const idx2 = findVertexIndex(x2, y2, z2);

      if (
        idx1 !== -1 &&
        idx2 !== -1 &&
        selectedSet.has(idx1) &&
        selectedSet.has(idx2)
      ) {
        selectedEdges.push([idx1, idx2]);
      }
    }

    return selectedEdges;
  } catch (error) {
    console.error("Error getting selected edges:", error);
    return [];
  }
}

/**
 * Récupère les faces sélectionnées en fonction des vertices sélectionnés.
 * Une face (quad ou triangle) n'est sélectionnée que si TOUS ses vertices sont sélectionnés.
 */
export function getSelectedFaces(
  faces: number[][],
  selectedVertexIndices: number[]
): number[][] {
  try {
    if (selectedVertexIndices.length < 3) {
      return [];
    }

    const selectedSet = new Set(selectedVertexIndices);
    const selectedFaces: number[][] = [];

    for (const face of faces) {
      // Une face est sélectionnée si TOUS ses sommets sont sélectionnés
      const allVerticesSelected = face.every((vertexIndex) =>
        selectedSet.has(vertexIndex)
      );

      // Si c'est un quad (4 indices) ET que les 4 sont sélectionnés, on le garde.
      // Si c'est un triangle (3 indices) ET que les 3 sont sélectionnés, on le garde.
      if (allVerticesSelected) {
        // En forçant le maillage logique à être composé de quads (dans computeTopology),
        // nous garantissons ici qu'un quad nécessite bien 4 sélections.
        selectedFaces.push(face);
      }
    }

    return selectedFaces;
  } catch (error) {
    console.error("Error getting selected faces:", error);
    return [];
  }
}

/**
 * Ordonne les vertices d'un quad dans le bon ordre pour éviter les faces tordues
 */
export function orderQuadVertices(
  face: number[],
  edges: [number, number][]
): number[] {
  try {
    if (face.length !== 4) {
      return face;
    }

    const adjacency = new Map<number, number[]>();
    face.forEach((v) => adjacency.set(v, []));

    edges.forEach(([a, b]) => {
      if (face.includes(a) && face.includes(b)) {
        adjacency.get(a)?.push(b);
        adjacency.get(b)?.push(a);
      }
    });

    const ordered = [face[0]];
    let current = face[0];

    for (let i = 0; i < 3; i++) {
      const neighbors = adjacency.get(current) || [];
      const next = neighbors.find((n) => !ordered.includes(n));

      if (next !== undefined) {
        ordered.push(next);
        current = next;
      } else {
        // Fallback: retourne la face non ordonnée si le chemin n'est pas trouvé
        return face;
      }
    }

    return ordered;
  } catch (error) {
    console.error("Error ordering quad vertices:", error);
    return face;
  }
}
