import * as THREE from "three";

export const createInfiniteAxisLine = (
  color: string,
  start: [number, number, number],
  end: [number, number, number]
) => {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ]);
  const material = new THREE.LineBasicMaterial({ color });
  return new THREE.Line(geometry, material);
};
