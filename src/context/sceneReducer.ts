import {
  SceneState,
  Action,
  MeshData,
  UpdateVertexPositionPayload,
  UpdateMultipleVerticesPayload,
  SelectEditElementPayload,
  UpdateMeshPayload,
  initialSceneState,
} from "./types";

export { initialSceneState };

/**
 * Reducer function that handles all 3D scene modifications.
 * Logic is categorized into Mesh CRUD, Selection Management, and Edit Mode transformations.
 */
export function sceneReducer(state: SceneState, action: Action): SceneState {
  switch (action.type) {
    /* --- Mesh CRUD Operations --- */

    case "ADD_MESH": {
      const newMesh = action.payload as MeshData;
      return {
        ...state,
        meshes: [
          ...state.meshes,
          { ...newMesh, vertexModifications: {}, lockedBy: null },
        ],
        history: [...state.history, action],
      };
    }

    case "REMOVE_MESH": {
      const idToRemove = action.payload as number;
      return {
        ...state,
        meshes: state.meshes.filter((m) => m.id !== idToRemove),
        selectedIds: state.selectedIds.filter((id) => id !== idToRemove),
        editMode: {
          ...state.editMode,
          selectedElements: state.editMode.selectedElements.filter(
            (el) => el.meshId !== idToRemove,
          ),
        },
        history: [...state.history, action],
      };
    }

    case "DELETE_SELECTED_MESHES":
      return {
        ...state,
        meshes: state.meshes.filter((m) => !state.selectedIds.includes(m.id)),
        selectedIds: [],
        editMode: {
          ...state.editMode,
          selectedElements: state.editMode.selectedElements.filter(
            (el) => !state.selectedIds.includes(el.meshId),
          ),
        },
        history: [...state.history, action],
      };

    /* --- Selection Management --- */

    case "SELECT_MESH":
      return {
        ...state,
        selectedIds: [action.payload as number],
        editMode: { ...state.editMode, selectedElements: [] },
      };

    case "MULTI_SELECT": {
      const id = action.payload as number;
      const selected = state.selectedIds.includes(id)
        ? state.selectedIds.filter((i) => i !== id)
        : [...state.selectedIds, id];
      return {
        ...state,
        selectedIds: selected,
        editMode: {
          ...state.editMode,
          selectedElements: state.editMode.selectedElements.filter((el) =>
            selected.includes(el.meshId),
          ),
        },
      };
    }

    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedIds: [],
        editMode: { ...state.editMode, selectedElements: [] },
      };

    /* --- Transformation & Mode Logic --- */

    case "UPDATE_MESH": {
      const { id, property, values } = action.payload as UpdateMeshPayload;
      return {
        ...state,
        meshes: state.meshes.map((m) =>
          m.id === id ? { ...m, [property]: values } : m,
        ),
        history: [...state.history, action],
      };
    }

    case "SET_MODE": {
      const newMode = action.payload as "object" | "edit";
      return {
        ...state,
        mode: newMode,
        editMode:
          newMode === "edit"
            ? state.editMode
            : { ...state.editMode, selectedElements: [] },
      };
    }

    /* --- Vertex / Edit Mode Actions --- */

    case "SELECT_EDIT_ELEMENT": {
      const { meshId, elementIndex } =
        action.payload as SelectEditElementPayload;
      return {
        ...state,
        editMode: {
          ...state.editMode,
          selectedElements: [{ meshId, elementIndex }],
        },
      };
    }

    case "UPDATE_VERTEX_POSITION": {
      const { meshId, vertexIndex, newPosition } =
        action.payload as UpdateVertexPositionPayload;
      return {
        ...state,
        meshes: state.meshes.map((mesh) => {
          if (mesh.id !== meshId) return mesh;
          return {
            ...mesh,
            vertexModifications: {
              ...(mesh.vertexModifications || {}),
              [vertexIndex]: newPosition,
            },
          };
        }),
        history: [...state.history, action],
      };
    }

    case "UPDATE_MULTIPLE_VERTICES": {
      const { meshId, updates } =
        action.payload as UpdateMultipleVerticesPayload;
      return {
        ...state,
        meshes: state.meshes.map((mesh) => {
          if (mesh.id !== meshId) return mesh;
          const newModifications = { ...(mesh.vertexModifications || {}) };
          updates.forEach(({ vertexIndex, newPosition }) => {
            newModifications[vertexIndex] = newPosition;
          });
          return { ...mesh, vertexModifications: newModifications };
        }),
        history: [...state.history, action],
      };
    }

    /* --- Collaborative & System Actions --- */

    case "SYNC_STATE":
      return action.payload as SceneState;

    case "UPDATE_MESH_LOCK": {
      //@ts-expect-error set type after
      const { meshId, lockedBy, lockedByName } = action.payload;
      return {
        ...state,
        meshes: state.meshes.map((m) =>
          m.id === meshId ? { ...m, lockedBy, lockedByName } : m,
        ),
      };
    }

    case "RESET_SCENE":
      return { ...initialSceneState };

    default:
      return state;
  }
}
