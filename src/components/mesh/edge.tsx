import * as THREE from "three";
import { Line } from "@react-three/drei";

interface EdgeProps {
  index: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
}

export default function Edge({ start, end, isSelected, onSelect }: EdgeProps) {
  return (
    <Line
      points={[start, end]}
      color={isSelected ? "#ff0000" : "#0000ff"}
      lineWidth={isSelected ? 4 : 2}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(!isSelected);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    />
  );
}
