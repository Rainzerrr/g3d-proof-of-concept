import { FC, useMemo, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import { useScene } from "../../context/sceneContext";
import {
  ShapeType,
  SelectEditElementPayload,
  UpdateVertexPositionPayload,
  UpdateMultipleVerticesPayload,
  GeometryCache,
} from "../../context/types";
import {
  getSelectedEdges,
  getSelectedFaces,
  orderQuadVertices,
} from "../../utils/geometryHelpers";
import { getGeometryData, is2DShape } from "../../utils/geometryCache";
import { THEME } from "../../utils/theme";

interface CustomMeshProps {
  id: number;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  isSelected: boolean;
  onClick: (event: MouseEvent, id: number) => void;
  onContextMenu?: (event: ThreeEvent<MouseEvent>) => void;
}

const CustomMesh: FC<CustomMeshProps> = ({
  id,
  type,
  position,
  rotation,
  scale,
  color,
  isSelected,
  onClick,
  onContextMenu,
}) => {
  const { state, dispatch } = useScene();
  const { mode, editMode, meshes } = state;

  const meshRef = useRef<THREE.Group>(null);
  const transformControlsRef = useRef<any>(null);
  const helperRef = useRef<THREE.Object3D | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [controlsReady, setControlsReady] = useState(false); // Stocker les données de drag dans un ref pour éviter les closures stales

  const dragStartData = useRef<{
    initialPositions: Map<number, THREE.Vector3>;
    startCenter: THREE.Vector3;
  } | null>(null);

  const meshData = useMemo(() => meshes.find((m) => m.id === id), [meshes, id]);
  const vertexModifications = meshData?.vertexModifications || {};

  const {
    geometry: baseGeometry,
    topology,
    positionIndexMap,
  } = useMemo(() => getGeometryData(type), [type]) as GeometryCache;

  const is2D = is2DShape(type);

  const rotationInRadians = useMemo(() => {
    const [degX, degY, degZ] = rotation;
    return [
      THREE.MathUtils.degToRad(degX),
      THREE.MathUtils.degToRad(degY),
      THREE.MathUtils.degToRad(degZ),
    ] as [number, number, number];
  }, [rotation]);

  const appliedGeometry = useMemo(() => {
    const geo = baseGeometry.clone();
    const positionAttribute = geo.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < positionAttribute.count; i++) {
      const topologyIndex = positionIndexMap[i];
      const newPos = vertexModifications[topologyIndex];

      if (newPos) {
        positionAttribute.setXYZ(i, newPos[0], newPos[1], newPos[2]);
      }
    }

    positionAttribute.needsUpdate = true;
    geo.computeVertexNormals();

    return geo;
  }, [baseGeometry, vertexModifications, positionIndexMap]);

  const vertices: [number, number, number][] = useMemo(() => {
    return topology.vertices.map((v, i) => {
      const modifiedPos = vertexModifications[i];
      if (modifiedPos) {
        return modifiedPos;
      }
      return [v.x, v.y, v.z];
    });
  }, [topology.vertices, vertexModifications]);

  const normalEdgesGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];

    topology.edges.forEach(([vAIndex, vBIndex]) => {
      const vA = vertices[vAIndex];
      const vB = vertices[vBIndex];
      positions.push(vA[0], vA[1], vA[2]);
      positions.push(vB[0], vB[1], vB[2]);
    });

    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    return geo;
  }, [vertices, topology.edges]);

  const selectedVertexIndices = useMemo(() => {
    const indices = editMode.selectedElements
      .filter((el) => el.meshId === id && editMode.selectionType === "vertex")
      .map((el) => el.elementIndex); // LOG 1: Suivi de la sélection

    console.log(`[Mesh ${id}] 🧠 Selection changed: [${indices.join(", ")}]`);

    return indices;
  }, [editMode.selectedElements, id, editMode.selectionType]);

  const selectionData = useMemo(() => {
    const tempEdgesGeometry = new THREE.EdgesGeometry(baseGeometry);
    const selectedEdges = getSelectedEdges(
      tempEdgesGeometry,
      vertices,
      selectedVertexIndices
    );
    tempEdgesGeometry.dispose();

    return {
      selectedEdges,
      selectedFaces: getSelectedFaces(topology.faces, selectedVertexIndices),
    };
  }, [
    baseGeometry,
    vertices,
    topology.faces,
    selectedVertexIndices,
    topology.edges,
  ]);

  const selectedEdgesGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];

    selectionData.selectedEdges.forEach(([a, b]) => {
      const vA = vertices[a];
      const vB = vertices[b];
      positions.push(vA[0], vA[1], vA[2]);
      positions.push(vB[0], vB[1], vB[2]);
    });

    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    return geo;
  }, [selectionData.selectedEdges, vertices]);

  useEffect(() => {
    return () => {
      normalEdgesGeometry.dispose();
      selectedEdgesGeometry.dispose();
    };
  }, [normalEdgesGeometry, selectedEdgesGeometry]);

  const selectionCenter = useMemo(() => {
    if (selectedVertexIndices.length === 0) return null;

    const center = new THREE.Vector3();
    selectedVertexIndices.forEach((idx) => {
      const v = vertices[idx];
      center.add(new THREE.Vector3(v[0], v[1], v[2]));
    });
    center.divideScalar(selectedVertexIndices.length);

    return center;
  }, [selectedVertexIndices, vertices]);

  useEffect(() => {
    if (helperRef.current && selectionCenter && !isDragging) {
      helperRef.current.position.copy(selectionCenter);
    }
  }, [selectionCenter, isDragging]);
  /**
   * Gère les changements d'objet du gizmo (appelé à chaque frame pendant le drag).
   * Contient la logique pour Single-Vertex et Multi-Vertex (avec anti-race condition).
   */

  const handleGizmoObjectChange = () => {
    if (!meshRef.current) return; // CAS 1: UN SEUL VERTEX SÉLECTIONNÉ

    if (selectedVertexIndices.length === 1) {
      // LOG 4: Suivi pendant le drag (Single Vertex)
      console.log(`[Mesh ${id}] 🔄 onObjectChange: SINGLE-VERTEX drag active.`);

      const vertexIndex = selectedVertexIndices[0];
      const vertexMesh = meshRef.current.children.find(
        (child) =>
          (child as THREE.Mesh).isMesh &&
          child.userData.isVertexMesh &&
          child.userData.vertexIndex === vertexIndex
      ) as THREE.Mesh | undefined;

      if (vertexMesh) {
        // La position de l'objet gizmo (vertexMesh) a déjà été mise à jour par TransformControls.
        const newLocalPosition = vertexMesh.position;
        dispatch({
          type: "UPDATE_VERTEX_POSITION",
          payload: {
            meshId: id,
            vertexIndex: vertexIndex,
            newPosition: [
              newLocalPosition.x,
              newLocalPosition.y,
              newLocalPosition.z,
            ],
          } as UpdateVertexPositionPayload,
        });
      }
    } // CAS 2: MULTI-SÉLECTION
    else if (selectedVertexIndices.length > 1 && helperRef.current) {
      // VÉRIFICATION/CRÉATION (Anti-Race Condition): Si le drag a commencé mais que dragStartData est null, on le crée.
      if (!dragStartData.current) {
        console.log(
          `[Mesh ${id}] ⚡️ ON_OBJECT_CHANGE: Instant creation of dragStartData.`
        );
        const positions = new Map<number, THREE.Vector3>();
        selectedVertexIndices.forEach((idx) => {
          const v = vertices[idx];
          positions.set(idx, new THREE.Vector3(v[0], v[1], v[2]));
        });

        dragStartData.current = {
          initialPositions: positions,
          startCenter: helperRef.current.position.clone(),
        };
      } // MISE À JOUR : Mouvement actif

      if (dragStartData.current) {
        // LOG 4: Suivi pendant le drag (Multi-Vertex)
        console.log(
          `[Mesh ${id}] 🔄 onObjectChange: MULTI-VERTEX drag active. Delta check.`
        );

        const delta = helperRef.current.position
          .clone()
          .sub(dragStartData.current.startCenter);

        const currentSelectedIndices = Array.from(
          dragStartData.current.initialPositions.keys()
        );

        const updates = currentSelectedIndices
          .map((vertexIndex) => {
            const initialPos =
              dragStartData.current!.initialPositions.get(vertexIndex);
            if (initialPos) {
              const newPosition = initialPos.clone().add(delta);
              return {
                vertexIndex,
                newPosition: [newPosition.x, newPosition.y, newPosition.z] as [
                  number,
                  number,
                  number
                ],
              };
            }
            return null;
          })
          .filter((update) => update !== null) as {
          vertexIndex: number;
          newPosition: [number, number, number];
        }[];

        if (updates.length > 0) {
          dispatch({
            type: "UPDATE_MULTIPLE_VERTICES",
            payload: { meshId: id, updates } as UpdateMultipleVerticesPayload,
          });
        }
      }
    } // CAS 3: Erreur ou pas de sélection/drag
    else {
      // LOG 4: Suivi pendant le drag (Erreur/Idle)
      console.log(
        `[Mesh ${id}] ❓ onObjectChange: No valid target for update (${selectedVertexIndices.length} selected).`
      );
    }
  };

  const gizmoTarget = useMemo<THREE.Object3D | null>(() => {
    if (!meshRef.current) return null;

    if (selectedVertexIndices.length === 1) {
      // LOG 2: Cible Gizmo (Single)
      console.log(
        `[Mesh ${id}] 🎯 Gizmo Target: Single Vertex ${selectedVertexIndices[0]}`
      );

      return (
        meshRef.current.children.find(
          (child) =>
            (child as THREE.Mesh).isMesh &&
            child.userData.isVertexMesh &&
            child.userData.vertexIndex === selectedVertexIndices[0]
        ) || null
      );
    } else if (selectedVertexIndices.length > 1 && selectionCenter) {
      if (!helperRef.current) {
        const helper = new THREE.Object3D();
        meshRef.current.add(helper);
        helperRef.current = helper;
      }

      helperRef.current.position.copy(selectionCenter);
      helperRef.current.userData.isGizmoHelper = true; // LOG 2: Cible Gizmo (Multi)
      console.log(`[Mesh ${id}] 🎯 Gizmo Target: Helper (Center)`);

      return helperRef.current;
    } // LOG 2: Cible Gizmo (None)

    console.log(`[Mesh ${id}] 🎯 Gizmo Target: None`);

    return null;
  }, [selectedVertexIndices, meshRef.current, selectionCenter]); // Réinitialisation de l'état du gizmo helper et des données de drag

  useEffect(() => {
    if (
      meshRef.current &&
      selectedVertexIndices.length <= 1 &&
      helperRef.current
    ) {
      meshRef.current.remove(helperRef.current);
      helperRef.current = null;
    } // Réinitialisation de dragStartData si la sélection change

    if (dragStartData.current !== null) {
      console.log(
        `[Mesh ${id}] 🧹 dragStartData cleared due to selection change.`
      );
      dragStartData.current = null;
    }
  }, [selectedVertexIndices]); // Réinitialiser controlsReady quand gizmoTarget change

  useEffect(() => {
    console.log(
      `[Mesh ${id}] 🚧 Gizmo Target changed. Setting controlsReady=false.`
    );
    setControlsReady(false);
  }, [gizmoTarget]); // Surveiller quand transformControlsRef est assigné

  useEffect(() => {
    if (transformControlsRef.current && !controlsReady) {
      console.log(
        `[Mesh ${id}] ✅ TransformControls is ready! Setting controlsReady=true.`
      );
      setControlsReady(true);
    }
  }, [gizmoTarget, controlsReady]); // Écouteur qui gère le début et la fin du drag

  useEffect(() => {
    const controls = transformControlsRef.current;
    if (!controls || !gizmoTarget || !controlsReady) {
      console.log(`[Mesh ${id}] ⚠️ Cannot attach listener: Waiting...`);
      return;
    }

    console.log(`[Mesh ${id}] 🔧 Attaching dragging-changed listener.`);

    const handleDraggingChanged = (event: any) => {
      const dragging = event.value;
      console.log(
        `[Mesh ${id}] 🎤 dragging-changed event: ${dragging}. Current dragStartData: ${!!dragStartData.current}`
      );
      setIsDragging(dragging);

      if (!dragging) {
        // LOG 3: Fin du drag
        console.log(`[Mesh ${id}] 🏁 Drag ended. Nullifying dragStartData.`);
        dragStartData.current = null;
      }
    };

    controls.addEventListener("dragging-changed", handleDraggingChanged);

    return () => {
      console.log(`[Mesh ${id}] 🗑️ Detaching dragging-changed listener`);
      controls.removeEventListener("dragging-changed", handleDraggingChanged);
    };
  }, [gizmoTarget, controlsReady]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (mode !== "edit" || selectedVertexIndices.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        dispatch({ type: "CLEAR_EDIT_ELEMENT_SELECTION" });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mode, selectedVertexIndices, dispatch]);

  return (
    <group
      ref={meshRef}
      position={position}
      rotation={rotationInRadians}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();

        if (mode === "edit") {
          if (isDragging) return;
          if (isSelected) return;
          onClick(e.nativeEvent, id);
          return;
        }

        onClick(e.nativeEvent, id);
      }}
      onContextMenu={onContextMenu}
    >
      <mesh
        geometry={appliedGeometry}
        castShadow
        receiveShadow
        userData={{ id, isSelectable: mode === "object" }}
      >
        <meshStandardMaterial
          color={color}
          transparent={false}
          side={is2D ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>
      {isSelected && mode === "object" && (
        <>
          {!is2D && (
            <mesh
              geometry={appliedGeometry}
              scale={[
                THEME.sizes.outlineScale,
                THEME.sizes.outlineScale,
                THEME.sizes.outlineScale,
              ]}
              userData={{ isSelectable: false }}
            >
              <meshBasicMaterial
                color={THEME.outline.object}
                side={THREE.BackSide}
                transparent
                opacity={1}
                depthWrite={false}
              />
            </mesh>
          )}
          {is2D && (
            <lineSegments geometry={normalEdgesGeometry} raycast={() => null}>
              <lineBasicMaterial
                color={THEME.outline.object}
                linewidth={THEME.sizes.edgeLineWidth}
              />
            </lineSegments>
          )}
        </>
      )}
      {isSelected && mode === "edit" && (
        <>
          {/* Lignes non sélectionnées (affichées en gris par défaut) */}
          <lineSegments geometry={normalEdgesGeometry} raycast={() => null}>
            <lineBasicMaterial
              color={THEME.edge.default}
              linewidth={THEME.sizes.edgeLineWidth}
            />
          </lineSegments>
          {/* Lignes sélectionnées (affichées avec la couleur de sélection) */}
          {selectionData.selectedEdges.length > 0 && (
            <lineSegments geometry={selectedEdgesGeometry} raycast={() => null}>
              <lineBasicMaterial
                color={THEME.edge.selected}
                linewidth={THEME.sizes.selectedEdgeLineWidth}
                depthTest={true}
              />
            </lineSegments>
          )}
          {/* Faces sélectionnées */}
          {!is2D &&
            selectionData.selectedFaces.length > 0 &&
            selectionData.selectedFaces.map((face, faceIndex) => {
              if (face.length === 3 || face.length === 4) {
                const isQuad = face.length === 4;
                const orderedFace = isQuad
                  ? orderQuadVertices(face, topology.edges)
                  : face;

                const positions = new Float32Array(orderedFace.length * 3);
                orderedFace.forEach((vertIdx, idx) => {
                  const v = vertices[vertIdx];
                  positions[idx * 3] = v[0];
                  positions[idx * 3 + 1] = v[1];
                  positions[idx * 3 + 2] = v[2];
                });

                const faceGeometry = new THREE.BufferGeometry();
                faceGeometry.setAttribute(
                  "position",
                  new THREE.BufferAttribute(positions, 3)
                );

                faceGeometry.setIndex(isQuad ? [0, 1, 2, 0, 2, 3] : [0, 1, 2]);
                faceGeometry.computeVertexNormals();

                return (
                  <mesh
                    key={`selected-face-${faceIndex}`}
                    geometry={faceGeometry}
                    userData={{ isSelectable: false }}
                  >
                    <meshBasicMaterial
                      color={THEME.face.selected}
                      transparent
                      opacity={THEME.face.opacity}
                      side={THREE.DoubleSide}
                      depthWrite={false}
                      depthTest={true}
                      // 🌟 SOLUTION AU Z-FIGHTING 🌟
                      polygonOffset={true}
                      polygonOffsetFactor={-1}
                      polygonOffsetUnits={-1}
                      // 🌟 FIN SOLUTION 🌟
                    />
                  </mesh>
                );
              }
              return null;
            })}
          {/* Points de contrôle (Vertices) */}
          {vertices.map((vertex, i) => {
            const isSelectedVertex = selectedVertexIndices.includes(i);
            return (
              <mesh
                key={i}
                position={vertex}
                scale={[1, 1, 1]}
                onClick={(e: ThreeEvent<MouseEvent>) => {
                  e.stopPropagation();
                  if (isDragging) return;

                  const ctrl = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey;

                  dispatch({
                    type: ctrl
                      ? "MULTI_SELECT_EDIT_ELEMENT"
                      : "SELECT_EDIT_ELEMENT",
                    payload: {
                      meshId: id,
                      elementIndex: i,
                    } as SelectEditElementPayload,
                  });
                }}
                userData={{ isVertexMesh: true, vertexIndex: i }}
              >
                <sphereGeometry args={[THEME.sizes.pointSize, 8, 8]} />
                <meshBasicMaterial
                  color={
                    isSelectedVertex
                      ? THEME.vertex.selected
                      : THEME.vertex.default
                  }
                  depthTest={true}
                />
              </mesh>
            );
          })}
          {/* Gizmo de Transformation */}
          {gizmoTarget && !isCtrlPressed && (
            <TransformControls
              ref={(ref) => {
                transformControlsRef.current = ref;
                if (ref && !controlsReady) {
                  setControlsReady(true);
                }
              }}
              mode="translate"
              object={gizmoTarget}
              onObjectChange={handleGizmoObjectChange}
              showX={true}
              showY={true}
              showZ={true}
            />
          )}
        </>
      )}
    </group>
  );
};

export default CustomMesh;
export type { CustomMeshProps };
