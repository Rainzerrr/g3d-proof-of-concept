import { useRef } from "react";
import * as THREE from "three";
import { Sphere } from "@react-three/drei";

interface VertexProps {
  index: number;
  position: THREE.Vector3;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onMove: (newPosition: THREE.Vector3) => void;
}

export default function Vertex({
  position,
  isSelected,
  onSelect,
  onMove,
}: VertexProps) {
  const ref = useRef<THREE.Mesh>(null);
  const startPosition = useRef<THREE.Vector3>(new THREE.Vector3());

  return (
    <Sphere
      ref={ref}
      position={position}
      args={[0.1, 16, 16]}
      onPointerDown={(e) => {
        e.stopPropagation();
        startPosition.current.copy(ref.current!.position);
        onSelect(!isSelected);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (!startPosition.current.equals(ref.current!.position)) {
          onMove(ref.current!.position.clone());
        }
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <meshStandardMaterial
        color={isSelected ? "#ff0000" : "#00ff00"}
        emissive={isSelected ? "#ff0000" : "#00ff00"}
        emissiveIntensity={0.5}
      />
    </Sphere>
  );
}
