import { FC } from "react";
import * as THREE from "three";

interface SphereProps {
  id: number;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  isSelected: boolean;
  onClick?: (id: number) => void;
}

const Sphere: FC<SphereProps> = ({
  position,
  scale,
  rotation,
  isSelected,
  onClick,
}) => {
  const edgeColor = "#00FFAA";
  const geometry = new THREE.SphereGeometry(0.5, 16, 16);
  const edges = new THREE.EdgesGeometry(geometry);

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={onClick}
    >
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
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

export default Sphere;
export type { SphereProps };
