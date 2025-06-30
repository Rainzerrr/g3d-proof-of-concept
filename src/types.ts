// types.ts
export type ShapeType = "cube" | "sphere" | "cylinder" | "circle" | "square";

export interface Vertex {
  id: number;
  position: [number, number, number];
}

export interface Edge {
  id: number;
  vertexIds: [number, number];
}

export interface Face {
  id: number;
  vertexIds: number[];
  edgeIds: number[];
}

export interface MeshData {
  id: number;
  type: ShapeType;
  vertices: Vertex[];
  edges: Edge[];
  faces: Face[];
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

export type SelectionMode = "object" | "vertex" | "edge" | "face";

export interface SelectionState {
  vertices: number[];
  edges: number[];
  faces: number[];
}
