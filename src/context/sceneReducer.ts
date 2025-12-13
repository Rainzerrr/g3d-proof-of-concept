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

export function sceneReducer(state: SceneState, action: Action): SceneState {
  switch (action.type) {
    case "ADD_MESH": {
      const newMesh = action.payload as MeshData;
      return {
        ...state,
        meshes: [...state.meshes, { ...newMesh, vertexModifications: {} }],
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
            (el) => el.meshId !== idToRemove
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
            (el) => !state.selectedIds.includes(el.meshId)
          ),
        },
        history: [...state.history, action],
      };

    case "SELECT_MESH":
      return {
        ...state,
        selectedIds: [action.payload as number],
        editMode: {
          ...state.editMode,
          selectedElements: [],
        },
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
            selected.includes(el.meshId)
          ),
        },
      };
    }

    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedIds: [],
        editMode: {
          ...state.editMode,
          selectedElements: [],
        },
      };

    case "UPDATE_MESH": {
      const { id, property, values } = action.payload as UpdateMeshPayload;
      return {
        ...state,
        meshes: state.meshes.map((m) =>
          m.id === id ? { ...m, [property]: values } : m
        ),
        history: [...state.history, action],
      };
    }

    case "RESET_SCENE":
      return { ...initialSceneState };

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

    case "MULTI_SELECT_EDIT_ELEMENT": {
      const { meshId, elementIndex } =
        action.payload as SelectEditElementPayload;

      const alreadySelected = state.editMode.selectedElements.some(
        (el) => el.meshId === meshId && el.elementIndex === elementIndex
      );

      const selectedElements = alreadySelected
        ? state.editMode.selectedElements.filter(
            (el) => !(el.meshId === meshId && el.elementIndex === elementIndex)
          )
        : [...state.editMode.selectedElements, { meshId, elementIndex }];

      return {
        ...state,
        editMode: {
          ...state.editMode,
          selectedElements,
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
      // ✅ Logique de mise à jour pour plusieurs vertices (correcte)
      console.log("test ici");
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

          return {
            ...mesh,
            vertexModifications: newModifications,
          };
        }),
        history: [...state.history, action],
      };
    }

    case "CLEAR_EDIT_ELEMENT_SELECTION":
      return {
        ...state,
        editMode: {
          ...state.editMode,
          selectedElements: [],
        },
      };

    case "CLEAR_EDIT_SELECTION":
      return {
        ...state,
        editMode: {
          ...state.editMode,
          selectedElements: [],
        },
      };

    default:
      return state;
  }
}
