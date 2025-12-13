import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect } from "react";

const ClickLogger = () => {
  const { camera, gl, scene } = useThree();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / gl.domElement.clientWidth) * 2 - 1;
      mouse.y = -(event.clientY / gl.domElement.clientHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        console.log(
          `Coordonnées cliquées : x=${point.x.toFixed(2)}, y=${point.y.toFixed(
            2
          )}, z=${point.z.toFixed(2)}`
        );
      } else {
        // Rayon vers un plan horizontal fictif si rien n’est touché
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // plan horizontal y=0
        const ray = raycaster.ray;
        const point = new THREE.Vector3();
        ray.intersectPlane(plane, point);
        console.log(
          `Coordonnées (sur plan y=0) : x=${point.x.toFixed(
            2
          )}, y=${point.y.toFixed(2)}, z=${point.z.toFixed(2)}`
        );
      }
    };

    gl.domElement.addEventListener("pointerdown", handleClick);
    return () => gl.domElement.removeEventListener("pointerdown", handleClick);
  }, [camera, gl, scene]);

  return null;
};

export default ClickLogger;
