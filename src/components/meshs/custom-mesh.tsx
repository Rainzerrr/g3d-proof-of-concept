import { FC, useMemo } from "react";
import * as THREE from "three";
import { ShapeType } from "../toolbar/mesh-dropdown/mesh-dropdown";

interface CustomMeshProps {
  id: number;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  isSelected: boolean;
  onClick: (event: MouseEvent, id: number) => void;
}

const CustomMesh: FC<CustomMeshProps> = ({
  id,
  type,
  position,
  rotation,
  scale,
  color,
  isSelected,
  onClick,
}) => {
  const geometry = useMemo(() => {
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
  }, [type]);

  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  const vertices = useMemo(() => {
    const positions = geometry.getAttribute("position");
    const verts: [number, number, number][] = [];
    for (let i = 0; i < positions.count; i++) {
      verts.push([positions.getX(i), positions.getY(i), positions.getZ(i)]);
    }
    return verts;
  }, [geometry]);

  const pointSize = 0.0;
  const edgeColor = "#48B5FF";
  const pointColor = "#48B5FF";

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation(); // Empêche la désélection globale
        onClick(e.nativeEvent, id);
      }}
    >
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} />
      </mesh>

      {isSelected && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={edgeColor} />
        </lineSegments>
      )}

      {isSelected &&
        vertices.map((vertex, i) => (
          <mesh key={i} position={vertex} scale={[1, 1, 1]}>
            <sphereGeometry args={[pointSize, 8, 8]} />
            <meshBasicMaterial color={pointColor} />
          </mesh>
        ))}
    </group>
  );
};

export default CustomMesh;
export type { CustomMeshProps };
