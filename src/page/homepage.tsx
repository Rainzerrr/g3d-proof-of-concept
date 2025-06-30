import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Toolbar from "../components/toolbar/toolbar";
import Properties from "../components/properties/properties";
import { ShapeType } from "../components/toolbar/mesh-dropdown/mesh-dropdown";
import CustomMesh from "../components/meshs/custom-mesh";
import "./homepage.scss";

export interface MeshData {
  id: number;
  type: ShapeType;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: string;
}

const HomePage = () => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [meshes, setMeshes] = useState<MeshData[]>([]);

  const createInfiniteAxisLine = (
    color: string,
    start: [number, number, number],
    end: [number, number, number]
  ) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...start),
      new THREE.Vector3(...end),
    ]);
    const material = new THREE.LineBasicMaterial({ color });
    return new THREE.Line(geometry, material);
  };

  const handlePointerMissed = () => {
    setSelectedIds([]);
  };

  const handleSelect = (id: number, event: MouseEvent) => {
    const isCtrlPressed = event.ctrlKey || event.metaKey;

    console.log(id);

    setSelectedIds((prev) => {
      if (isCtrlPressed) {
        return prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      } else {
        return [id];
      }
    });
  };

  const addMesh = (type: ShapeType) => {
    setMeshes((prev) => [
      ...prev,
      {
        id: Date.now(),
        type,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: "#ffffff",
      },
    ]);
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
      color={mesh.color}
    />
  );

  const resetBoard = () => setMeshes([]);
  const resetEdit = () => setSelectedIds([]);

  return (
    <div className="homepage">
      <Toolbar
        isEditing={selectedIds.length > 0}
        onSelectDropdown={addMesh}
        resetBoard={resetBoard}
        resetEdit={resetEdit}
      />
      <Properties
        selectedId={selectedIds[0]}
        meshes={meshes}
        setMeshes={setMeshes}
      />
      <Canvas
        className="homepage__canvas"
        camera={{ position: [5, 5, 5], fov: 60, near: 0.1, far: 1000 }}
        onPointerMissed={handlePointerMissed}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 3]} intensity={0.8} />
        <OrbitControls />

        {/* Axes et grille */}
        <group>
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

        {meshes.map((mesh) => renderMesh(mesh))}
      </Canvas>
    </div>
  );
};

export default HomePage;
