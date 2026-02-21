import * as THREE from "three";

export type ShapeType = "cube" | "sphere" | "cylinder" | "circle" | "square";

export interface MeshData {
  id: number;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  vertexModifications?: { [vertexIndex: number]: [number, number, number] };
  lockedBy?: string | null;
  lockedByName?: string | null;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface GridSettings {
  visible: boolean;
  size: number;
  divisions: number;
}

export interface LightData {
  id: number;
  type: "directional" | "point" | "ambient";
  color: string;
  intensity: number;
  position?: [number, number, number];
}

export interface SelectedElement {
  meshId: number;
  elementIndex: number;
}

export interface EditModeState {
  selectionType: "vertex" | "edge" | "face";
  selectedElements: SelectedElement[];
}

export interface UserInfo {
  clientId: string;
  name: string;
  color: string;
}

export interface SceneState {
  meshes: MeshData[];
  selectedIds: number[];
  camera: CameraState;
  mode: "object" | "edit";
  editMode: EditModeState;
  history: Action[];
  grid: GridSettings;
  lights: LightData[];
}

export interface UpdateVertexPositionPayload {
  meshId: number;
  vertexIndex: number;
  newPosition: [number, number, number];
}

export interface UpdateMultipleVerticesPayload {
  meshId: number;
  updates: { vertexIndex: number; newPosition: [number, number, number] }[];
}

export interface SelectEditElementPayload {
  meshId: number;
  elementIndex: number;
}

export interface UpdateMeshPayload {
  id: number;
  property: "position" | "rotation" | "scale" | "color";
  values: [number, number, number] | string;
}

export interface Action {
  type:
    | "ADD_MESH"
    | "REMOVE_MESH"
    | "DELETE_SELECTED_MESHES"
    | "SELECT_MESH"
    | "MULTI_SELECT"
    | "CLEAR_SELECTION"
    | "UPDATE_MESH"
    | "RESET_SCENE"
    | "SET_MODE"
    | "SELECT_EDIT_ELEMENT"
    | "UPDATE_VERTEX_POSITION"
    | "UPDATE_MULTIPLE_VERTICES"
    | "MULTI_SELECT_EDIT_ELEMENT"
    | "CLEAR_EDIT_ELEMENT_SELECTION"
    | "CLEAR_EDIT_SELECTION"
    | "SYNC_STATE"
    | "UPDATE_MESH_LOCK";
  payload?:
    | number
    | number[]
    | string
    | MeshData
    | UpdateVertexPositionPayload
    | UpdateMultipleVerticesPayload
    | SelectEditElementPayload
    | UpdateMeshPayload
    | SceneState
    | { meshId: number; lockedBy: string | null };
}

export type SelectionType = "vertex" | "edge" | "face";

export interface TopologyData {
  vertices: THREE.Vector3[];
  edges: [number, number][];
  faces: number[][];
}

export interface GeometryCache {
  geometry: THREE.BufferGeometry;
  edges: THREE.EdgesGeometry;
  topology: TopologyData;
  positionIndexMap: number[];
}

export const initialSceneState: SceneState = {
  meshes: [],
  selectedIds: [],
  camera: { position: [5, 5, 5], target: [0, 0, 0], fov: 60 },
  mode: "object",
  editMode: { selectionType: "vertex", selectedElements: [] },
  history: [],
  grid: { visible: true, size: 10, divisions: 10 },
  lights: [
    {
      id: 1,
      type: "directional",
      color: "#ffffff",
      intensity: 0.8,
      position: [2, 5, 3],
    },
  ],
};
