"use client";

import { Canvas, ThreeEvent } from "@react-three/fiber"; // Import de useThree pour accéder aux contrôles
import { Grid, OrbitControls } from "@react-three/drei";
import Toolbar from "../components/toolbar/toolbar";
import Properties from "../components/properties/properties";
import CustomMesh from "../components/meshs/custom-mesh";
import { ShapeType } from "../components/toolbar/mesh-dropdown/mesh-dropdown";
import { createInfiniteAxisLine } from "../utils/threeUtils";
import { useScene } from "../context/sceneContext";
import { MeshData } from "../context/types";
import { useState, useRef, useEffect } from "react"; // Import de useRef et useEffect
import DeleteModal from "../components/delete-modal/delete-modal";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib"; // Import du type OrbitControls pour le Ref
import "./homepage.scss";

// --- NOUVEAU COMPOSANT DE CONTRÔLE DE CLAVIER ---
const CameraControlByKey = ({
  controlsRef,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Bloquer la caméra si la touche Shift est pressée
      if (event.key === "Shift") {
        const controls = controlsRef.current;
        if (controls) {
          // Désactiver les contrôles pour empêcher le mouvement
          controls.enabled = false;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Réactiver la caméra si la touche Shift est relâchée
      if (event.key === "Shift") {
        const controls = controlsRef.current;
        if (controls) {
          // Réactiver les contrôles
          controls.enabled = true;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [controlsRef]);

  // Retourne null car ce composant est seulement pour la logique
  return null;
};
// --------------------------------------------------

const HomePage: React.FC = () => {
  const { state, dispatch } = useScene();
  const { meshes, selectedIds, mode } = state;

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });

  // ✅ NOUVEAU: Référence pour stocker l'instance des OrbitControls
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const isEditing = mode === "edit";

  const handlePointerMissed = () => {
    if (mode === "object") {
      dispatch({ type: "CLEAR_SELECTION" });
      dispatch({ type: "SET_MODE", payload: "object" });
    }
  };

  const handleSelect = (id: number, event: MouseEvent) => {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    setDeleteModalVisible(false);

    dispatch({
      type: isCtrlPressed ? "MULTI_SELECT" : "SELECT_MESH",
      payload: id,
    });

    if (mode !== "edit") {
      dispatch({ type: "SET_MODE", payload: "object" });
    }
  };

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

  const addMesh = (type: ShapeType) => {
    const newMesh: MeshData = {
      id: Date.now(),
      type,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#ffffff",
    };
    dispatch({ type: "ADD_MESH", payload: newMesh });
  };

  const resetBoard = () => {
    dispatch({ type: "RESET_SCENE" });
    dispatch({ type: "SET_MODE", payload: "object" });
  };

  const resetEdit = () => {
    dispatch({ type: "CLEAR_SELECTION" });
    dispatch({ type: "SET_MODE", payload: "object" });
  };

  const handleToggleEdit = () => {
    if (selectedIds.length === 0) return;
    dispatch({
      type: "SET_MODE",
      payload: mode === "edit" ? "object" : "edit",
    });
  };

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
      color={mesh.color}
    />
  );

  return (
    <div className="homepage">
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

        {/* ✅ NOUVEAU: On attache la référence aux OrbitControls
          lorsque les contrôles sont montés.
        */}
        <OrbitControls
          enableDamping={true}
          ref={controlsRef as any} // on doit utiliser 'any' pour le ref ici pour éviter les conflits de type générique
        />

        {/* ✅ NOUVEAU: Ajout du composant qui gère le clavier (Shift) */}
        <CameraControlByKey controlsRef={controlsRef} />

        <group>
          {/* Lignes infinies des axes */}
          <primitive
            object={createInfiniteAxisLine(
              "#f87171",
              [-1000, 0, 0],
              [1000, 0, 0]
            )}
          />
          <primitive
            object={createInfiniteAxisLine(
              "#34d399",
              [0, 0, -1000],
              [0, 0, 1000]
            )}
          />
          <Grid args={[1000, 1000]} cellColor={"#444"} sectionColor={"#888"} />
        </group>

        {meshes.map(renderMesh)}

        {/* <ClickLogger /> */}
      </Canvas>

      {deleteModalVisible && selectedIds.length > 0 && (
        <DeleteModal
          position={modalPosition}
          onDelete={() => {
            dispatch({ type: "DELETE_SELECTED_MESHES" });
            setDeleteModalVisible(false);
            dispatch({ type: "SET_MODE", payload: "object" });
          }}
          onClose={() => setDeleteModalVisible(false)}
        />
      )}
    </div>
  );
};

export default HomePage;
