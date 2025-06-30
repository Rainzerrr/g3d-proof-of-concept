import { FC } from "react";
import * as THREE from "three"; // Importer THREE pour utiliser EdgesGeometry et LineSegments

interface CubeProps {
  id: number;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  isSelected: boolean;
  onClick?: (id: number) => void;
}

const Cube: FC<CubeProps> = ({
  position,
  scale,
  rotation,
  isSelected,
  onClick,
}) => {
  const edgeColor = "#005CFF"; // Couleur des arêtes
  const pointColor = "#005CFF"; // Couleur des points
  const pointSize = 0.02; // Rayon des points (assez petit pour être visible)

  // Créer les arêtes du cube à partir de sa géométrie
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const edges = new THREE.EdgesGeometry(geometry);

  // Sommets du cube (les coins)
  const vertices = [
    [-0.5, -0.5, -0.5],
    [0.5, -0.5, -0.5],
    [0.5, 0.5, -0.5],
    [-0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5],
    [0.5, -0.5, 0.5],
    [0.5, 0.5, 0.5],
    [-0.5, 0.5, 0.5],
  ];

  // Fonction pour appliquer la position, la rotation et l'échelle au point
  const getRealPointPosition = (
    point: [number, number, number],
    position: [number, number, number],
    scale: [number, number, number],
    rotation: [number, number, number]
  ): [number, number, number] => {
    const pointVector = new THREE.Vector3(...point);

    // Appliquer la mise à l'échelle
    pointVector.x *= scale[0];
    pointVector.y *= scale[1];
    pointVector.z *= scale[2];

    // Appliquer la rotation
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationFromEuler(
      new THREE.Euler(rotation[0], rotation[1], rotation[2])
    );
    pointVector.applyMatrix4(rotationMatrix);

    // Appliquer la translation
    pointVector.add(new THREE.Vector3(...position));

    return [pointVector.x, pointVector.y, pointVector.z];
  };

  // Fonction pour gérer le clic sur un point
  const handlePointClick = (vertex: [number, number, number]) => {
    const realPosition = getRealPointPosition(
      vertex,
      position,
      scale,
      rotation
    );
    console.log(
      `Position réelle du point: X: ${realPosition[0]}, Y: ${realPosition[1]}, Z: ${realPosition[2]}`
    );
  };

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={onClick}
      scale={scale}
    >
      {/* Faces du cube */}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={"var(--color-mesh)"} />
      </mesh>

      {/* Arêtes du cube */}
      {isSelected && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={edgeColor} />
        </lineSegments>
      )}

      {/* Points aux sommets */}
      {isSelected &&
        vertices.map((vertex, index) => (
          <mesh
            key={index}
            position={vertex as [number, number, number]}
            onClick={() => handlePointClick(vertex as [number, number, number])} // Gérer le clic sur chaque point
          >
            <sphereGeometry args={[pointSize, 8, 8]} />
            <meshBasicMaterial color={pointColor} />
          </mesh>
        ))}
    </group>
  );
};

export default Cube;
export type { CubeProps };
