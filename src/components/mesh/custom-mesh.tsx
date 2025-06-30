import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { ShapeType } from "../toolbar/mesh-dropdown/mesh-dropdown";

interface CustomMeshProps {
  id: number;
  type: ShapeType;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
  color: string;
}

const CustomMesh: React.FC<CustomMeshProps> = ({
  id,
  type,
  position,
  scale,
  rotation,
  isSelected,
  onClick,
  color,
  ...props
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Marque le mesh comme "sélectionnable"
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.userData.isMesh = true;
    }
  }, []);

  const geometry = useMemo(() => {
    if (type === "cube") {
      const vertices = [
        [-0.5, -0.5, 0.5],
        [0.5, -0.5, 0.5],
        [0.5, 0.5, 0.5],
        [-0.5, 0.5, 0.5],
        [-0.5, -0.5, -0.5],
        [0.5, -0.5, -0.5],
        [0.5, 0.5, -0.5],
        [-0.5, 0.5, -0.5],
      ];

      const indices = [
        0, 1, 2, 2, 3, 0, 5, 4, 7, 7, 6, 5, 1, 5, 6, 6, 2, 1, 4, 0, 3, 3, 7, 4,
        3, 2, 6, 6, 7, 3, 4, 5, 1, 1, 0, 4,
      ];

      const positionArray = new Float32Array(indices.length * 3);
      for (let i = 0; i < indices.length; i++) {
        const v = vertices[indices[i]];
        positionArray.set(v, i * 3);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));
      geo.computeVertexNormals();
      return geo;
    }

    // fallback: default cube
    return new THREE.BoxGeometry(1, 1, 1);
  }, [type]);

  return (
    <mesh
      ref={meshRef}
      {...props}
      name={`Mesh_${id}`}
      position={position}
      scale={scale}
      rotation={rotation}
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation(); // Empêche le clic de se propager jusqu'au canvas
        onClick();
      }}
    >
      <meshStandardMaterial
        color={color}
        wireframe={isSelected}
        opacity={1}
        transparent={false}
      />
    </mesh>
  );
};

export default CustomMesh;
