import { FC } from "react";
import * as THREE from "three";

interface CylinderProps {
  id: number;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  isSelected: boolean;
  onClick?: (id: number) => void;
}

const Cylinder: FC<CylinderProps> = ({
  position,
  scale,
  rotation,
  isSelected,
  onClick,
}) => {
  const edgeColor = "#FFAA00";
  const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
  const edges = new THREE.EdgesGeometry(geometry);

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={onClick}
    >
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
        <meshStandardMaterial color={"var(--color-mesh)"} />
      </mesh>
      {isSelected && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={edgeColor} />
        </lineSegments>
      )}
    </group>
  );
};

export default Cylinder;
export type { CylinderProps };
