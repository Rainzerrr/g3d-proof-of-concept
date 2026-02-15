"use client";

import { Canvas, ThreeEvent } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import Toolbar from "../components/toolbar/toolbar";
import Properties from "../components/properties/properties";
import CustomMesh from "../components/meshs/custom-mesh";
import { ShapeType } from "../components/toolbar/mesh-dropdown/mesh-dropdown";
import { createInfiniteAxisLine } from "../utils/threeUtils";
import { useScene } from "../context/sceneContext";
import { MeshData } from "../context/types";
import { useState, useRef, useEffect } from "react";
import DeleteModal from "../components/delete-modal/delete-modal";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import "./homepage.scss";
import Snackbar from "../components/snakebar/snakebar";
import ActiveUsers from "../components/active-users/active-users";

/**
 * Manages 3D camera behavior via keyboard modifiers.
 * Enables rotation only when Alt is held, and panning when Ctrl is held.
 */
const CameraControlByKey = ({
  controlsRef,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) => {
  useEffect(() => {
    const controls = controlsRef.current;
    if (controls) {
      controls.enableRotate = false;
      controls.enablePan = false;
      controls.enableZoom = true;
    }

    const pressedKeys = new Set<string>();

    // Update control permissions based on active key combinations
    const handleKeyDown = (event: KeyboardEvent) => {
      const ctrl = controlsRef.current;
      if (!ctrl) return;
      pressedKeys.add(event.code);

      if (pressedKeys.has("AltLeft")) ctrl.enableRotate = true;
      if (pressedKeys.has("ControlLeft") || pressedKeys.has("ControlRight"))
        ctrl.enablePan = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const ctrl = controlsRef.current;
      if (!ctrl) return;
      pressedKeys.delete(event.code);

      if (!pressedKeys.has("AltLeft")) ctrl.enableRotate = false;
      if (!pressedKeys.has("ControlLeft") && !pressedKeys.has("ControlRight"))
        ctrl.enablePan = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [controlsRef]);

  return null;
};

/**
 * Primary layout component for the 3D Editor.
 * Orchestrates the Canvas, Sidebar properties, and collaborative UI elements.
 */
const HomePage: React.FC = () => {
  const { state, dispatch, commitAction, clientId, connectedUsers } =
    useScene();
  const { meshes, selectedIds, mode } = state;

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const isEditing = mode === "edit";

  /**
   * Clears selection and reverts to object mode when clicking empty space.
   */
  const handlePointerMissed = () => {
    if (mode === "object") {
      dispatch({ type: "CLEAR_SELECTION" });
      commitAction({ type: "CLEAR_SELECTION" });
      dispatch({ type: "SET_MODE", payload: "object" });
    }
  };

  /**
   * Handles mesh selection logic, supporting multi-select via Ctrl/Meta keys.
   */
  const handleSelect = (id: number, event: MouseEvent) => {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    setDeleteModalVisible(false);

    const action = {
      type: isCtrlPressed ? "MULTI_SELECT" : "SELECT_MESH",
      payload: id,
    } as const;

    dispatch(action);
    commitAction(action);

    if (mode !== "edit") {
      dispatch({ type: "SET_MODE", payload: "object" });
    }
  };

  /**
   * Displays a warning notification when a user attempts to interact with a locked mesh.
   */
  const handleLockedClick = (meshId: number) => {
    const mesh = meshes.find((m) => m.id === meshId);
    setSnackbarMessage(
      `This mesh is currently being edited by ${mesh?.lockedByName || "another user"}`,
    );
    setSnackbarVisible(true);
  };

  /**
   * Triggers the deletion context menu at the mouse coordinates.
   */
  const handleRightClick = (event: ThreeEvent<MouseEvent>, meshId: number) => {
    event.stopPropagation();
    event.nativeEvent.preventDefault();

    if (selectedIds.includes(meshId)) {
      setModalPosition({
        x: event.nativeEvent.clientX,
        y: event.nativeEvent.clientY,
      });
      setDeleteModalVisible(true);
    }
  };

  /**
   * Instantiates a new primitive mesh into the global scene state.
   */
  const addMesh = (type: ShapeType) => {
    const newMesh: MeshData = {
      id: Date.now(),
      type,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#ffffff",
    };
    commitAction({ type: "ADD_MESH", payload: newMesh });
  };

  /**
   * Resets the entire scene for all connected users after confirmation.
   */
  const resetBoard = () => {
    if (confirm("Reset entire scene? This will affect all users.")) {
      commitAction({ type: "RESET_SCENE" });
      dispatch({ type: "SET_MODE", payload: "object" });
    }
  };

  /**
   * Clears current selection and exits edit mode.
   */
  const resetEdit = () => {
    dispatch({ type: "CLEAR_SELECTION" });
    commitAction({ type: "CLEAR_SELECTION" });
    dispatch({ type: "SET_MODE", payload: "object" });
  };

  /**
   * Toggles the interaction mode between global transformations and vertex editing.
   */
  const handleToggleEdit = () => {
    if (selectedIds.length === 0) return;
    dispatch({
      type: "SET_MODE",
      payload: mode === "edit" ? "object" : "edit",
    });
  };

  /**
   * Renders a CustomMesh instance with selection and context menu bindings.
   */
  const renderMesh = (mesh: MeshData) => (
    <CustomMesh
      key={mesh.id}
      id={mesh.id}
      type={mesh.type}
      position={mesh.position}
      scale={mesh.scale}
      rotation={mesh.rotation}
      isSelected={selectedIds.includes(mesh.id)}
      onClick={(event, id) => handleSelect(id, event)}
      onContextMenu={(event) => handleRightClick(event, mesh.id)}
      onLockedClick={handleLockedClick}
      color={mesh.color}
    />
  );

  return (
    <div className="homepage">
      <ActiveUsers users={connectedUsers} currentUserId={clientId} />

      <Toolbar
        isEditing={isEditing}
        onSelectDropdown={addMesh}
        resetBoard={resetBoard}
        resetEdit={resetEdit}
        onEditClick={handleToggleEdit}
      />

      <Properties selectedId={selectedIds.length > 0 ? selectedIds[0] : null} />

      <Canvas
        className="homepage__canvas"
        camera={{ position: [5, 5, 5], fov: 60, near: 0.1, far: 1000 }}
        onPointerMissed={handlePointerMissed}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 3]} intensity={0.8} />

        <OrbitControls enableDamping ref={controlsRef} />
        <CameraControlByKey controlsRef={controlsRef} />

        {/* Scene Environment: Infinite Axes and Grid */}
        <group>
          <primitive
            object={createInfiniteAxisLine(
              "#f87171",
              [-1000, 0, 0],
              [1000, 0, 0],
            )}
          />
          <primitive
            object={createInfiniteAxisLine(
              "#34d399",
              [0, 0, -1000],
              [0, 0, 1000],
            )}
          />
          <Grid args={[1000, 1000]} cellColor={"#444"} sectionColor={"#888"} />
        </group>

        {meshes.map(renderMesh)}
      </Canvas>

      {/* Global Modals and Notifications */}
      {deleteModalVisible && selectedIds.length > 0 && (
        <DeleteModal
          position={modalPosition}
          onDelete={() => {
            commitAction({ type: "DELETE_SELECTED_MESHES" });
            setDeleteModalVisible(false);
            dispatch({ type: "SET_MODE", payload: "object" });
          }}
          onClose={() => setDeleteModalVisible(false)}
        />
      )}

      <Snackbar
        message={snackbarMessage}
        isVisible={snackbarVisible}
        onClose={() => setSnackbarVisible(false)}
        type="warning"
        duration={3000}
      />
    </div>
  );
};

export default HomePage;
