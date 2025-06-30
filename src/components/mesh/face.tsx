import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";

interface FaceProps {
  index: number;
  vertices: THREE.Vector3[];
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
}

export default function Face({ vertices, isSelected, onSelect }: FaceProps) {
  // Crée un contour pour la face
  const points = useMemo(() => {
    const pts = [...vertices, vertices[0]]; // Ferme la boucle
    return pts;
  }, [vertices]);

  return (
    <group>
      <Line
        points={points}
        color={isSelected ? "#ff0000" : "#ffff00"}
        lineWidth={isSelected ? 4 : 2}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(!isSelected);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      />
    </group>
  );
}
