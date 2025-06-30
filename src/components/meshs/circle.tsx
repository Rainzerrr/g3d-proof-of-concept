import { FC } from "react";
import * as THREE from "three";

interface CircleProps {
  id: number;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  isSelected: boolean;
  onClick?: (id: number) => void;
}

const Circle: FC<CircleProps> = ({
  position,
  scale,
  rotation,
  isSelected,
  onClick,
}) => {
  const edgeColor = "#00DDFF";
  const geometry = new THREE.CircleGeometry(0.5, 64);
  const edges = new THREE.EdgesGeometry(geometry);

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={onClick}
    >
      {/* Face du cercle */}
      <mesh>
        <circleGeometry args={[0.5, 64]} />
        <meshStandardMaterial
          color={"var(--color-mesh)"}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Arêtes du cercle */}
      {isSelected && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={edgeColor} />
        </lineSegments>
      )}
    </group>
  );
};

export default Circle;
export type { CircleProps };
