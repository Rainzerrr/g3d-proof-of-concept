import { FC } from "react";
import * as THREE from "three";

interface SquareProps {
  id: number;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  isSelected: boolean;
  onClick?: (id: number) => void;
}

const Square: FC<SquareProps> = ({
  position,
  scale,
  rotation,
  isSelected,
  onClick,
}) => {
  const edgeColor = "#00AAFF";
  const geometry = new THREE.PlaneGeometry(1, 1);
  const edges = new THREE.EdgesGeometry(geometry);

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={onClick}
    >
      <mesh>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={"var(--color-mesh)"}
          side={THREE.DoubleSide}
        />
      </mesh>
      {isSelected && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={edgeColor} />
        </lineSegments>
      )}
    </group>
  );
};

export default Square;
export type { SquareProps };
