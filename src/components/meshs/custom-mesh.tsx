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
  onLockedClick?: (meshId: number) => void; // 🆕 Callback for locked mesh click
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
  onLockedClick, // 🆕
}) => {
  const { state, dispatch, commitAction, clientId } = useScene();
  const { mode, editMode, meshes } = state;

  const meshRef = useRef<THREE.Group>(null);
  const transformControlsRef = useRef<any>(null);
  const helperRef = useRef<THREE.Object3D | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [controlsReady, setControlsReady] = useState(false);

  const dragStartData = useRef<{
    initialPositions: Map<number, THREE.Vector3>;
    startCenter: THREE.Vector3;
  } | null>(null);

  const meshData = useMemo(() => meshes.find((m) => m.id === id), [meshes, id]);
  const vertexModifications = meshData?.vertexModifications || {};

  // 🆕 Lock status (but no visual changes)
  const isLockedByOther = meshData?.lockedBy && meshData.lockedBy !== clientId;

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
      return modifiedPos || [v.x, v.y, v.z];
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
      new THREE.Float32BufferAttribute(positions, 3),
    );
    return geo;
  }, [vertices, topology.edges]);

  const selectedVertexIndices = useMemo(() => {
    const indices = editMode.selectedElements
      .filter((el) => el.meshId === id && editMode.selectionType === "vertex")
      .map((el) => el.elementIndex);

    return indices;
  }, [editMode.selectedElements, id, editMode.selectionType]);

  const selectionData = useMemo(() => {
    const selectedEdges = getSelectedEdges(
      topology.edges,
      selectedVertexIndices,
    );

    return {
      selectedEdges,
      selectedFaces: getSelectedFaces(topology.faces, selectedVertexIndices),
    };
  }, [topology.edges, topology.faces, selectedVertexIndices]);

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
      new THREE.Float32BufferAttribute(positions, 3),
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

  const handleGizmoObjectChange = () => {
    if (!meshRef.current) return;

    if (selectedVertexIndices.length === 1) {
      const vertexIndex = selectedVertexIndices[0];
      const vertexMesh = meshRef.current.children.find(
        (child) =>
          (child as THREE.Mesh).isMesh &&
          child.userData.isVertexMesh &&
          child.userData.vertexIndex === vertexIndex,
      ) as THREE.Mesh | undefined;

      if (vertexMesh) {
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
    } else if (selectedVertexIndices.length > 1 && helperRef.current) {
      if (!dragStartData.current) {
        const positions = new Map<number, THREE.Vector3>();
        selectedVertexIndices.forEach((idx) => {
          const v = vertices[idx];
          positions.set(idx, new THREE.Vector3(v[0], v[1], v[2]));
        });

        dragStartData.current = {
          initialPositions: positions,
          startCenter: helperRef.current.position.clone(),
        };
      }

      if (dragStartData.current) {
        const delta = helperRef.current.position
          .clone()
          .sub(dragStartData.current.startCenter);

        const updates = Array.from(
          dragStartData.current.initialPositions.entries(),
        ).map(([vertexIndex, initialPos]) => ({
          vertexIndex,
          newPosition: [
            initialPos.x + delta.x,
            initialPos.y + delta.y,
            initialPos.z + delta.z,
          ] as [number, number, number],
        }));

        dispatch({
          type: "UPDATE_MULTIPLE_VERTICES",
          payload: { meshId: id, updates } as UpdateMultipleVerticesPayload,
        });
      }
    }
  };

  const handleDragEnd = () => {
    if (selectedVertexIndices.length === 1) {
      const vertexIndex = selectedVertexIndices[0];
      const vertexMesh = meshRef.current?.children.find(
        (child) =>
          (child as THREE.Mesh).isMesh &&
          child.userData.isVertexMesh &&
          child.userData.vertexIndex === vertexIndex,
      ) as THREE.Mesh | undefined;

      if (vertexMesh) {
        const newLocalPosition = vertexMesh.position;
        commitAction({
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
    } else if (
      selectedVertexIndices.length > 1 &&
      dragStartData.current &&
      helperRef.current
    ) {
      const delta = helperRef.current.position
        .clone()
        .sub(dragStartData.current.startCenter);

      const updates = Array.from(
        dragStartData.current.initialPositions.entries(),
      ).map(([vertexIndex, initialPos]) => ({
        vertexIndex,
        newPosition: [
          initialPos.x + delta.x,
          initialPos.y + delta.y,
          initialPos.z + delta.z,
        ] as [number, number, number],
      }));

      commitAction({
        type: "UPDATE_MULTIPLE_VERTICES",
        payload: { meshId: id, updates } as UpdateMultipleVerticesPayload,
      });
    }
  };

  const gizmoTarget = useMemo<THREE.Object3D | null>(() => {
    if (!meshRef.current) return null;
    if (selectedVertexIndices.length === 1) {
      return (
        meshRef.current.children.find(
          (child) =>
            (child as THREE.Mesh).isMesh &&
            child.userData.isVertexMesh &&
            child.userData.vertexIndex === selectedVertexIndices[0],
        ) || null
      );
    } else if (selectedVertexIndices.length > 1 && selectionCenter) {
      if (!helperRef.current) {
        const helper = new THREE.Object3D();
        meshRef.current.add(helper);
        helperRef.current = helper;
      }
      helperRef.current.position.copy(selectionCenter);
      return helperRef.current;
    }
    return null;
  }, [selectedVertexIndices, meshRef.current, selectionCenter]);

  useEffect(() => {
    if (
      meshRef.current &&
      selectedVertexIndices.length <= 1 &&
      helperRef.current
    ) {
      meshRef.current.remove(helperRef.current);
      helperRef.current = null;
    }
    if (dragStartData.current !== null) {
      dragStartData.current = null;
    }
  }, [selectedVertexIndices]);

  useEffect(() => {
    setControlsReady(false);
  }, [gizmoTarget]);

  useEffect(() => {
    if (transformControlsRef.current && !controlsReady) {
      setControlsReady(true);
    }
  }, [gizmoTarget, controlsReady]);

  useEffect(() => {
    const controls = transformControlsRef.current;
    if (!controls || !gizmoTarget || !controlsReady) return;

    const handleDraggingChanged = (event: any) => {
      const dragging = event.value;
      setIsDragging(dragging);
      if (!dragging) {
        handleDragEnd();
        dragStartData.current = null;
      }
    };

    controls.addEventListener("dragging-changed", handleDraggingChanged);
    return () => {
      controls.removeEventListener("dragging-changed", handleDraggingChanged);
    };
  }, [gizmoTarget, controlsReady]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) setIsCtrlPressed(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) setIsCtrlPressed(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <group
      ref={meshRef}
      position={position}
      rotation={rotationInRadians}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();

        // 🆕 Check if mesh is locked by another user
        if (isLockedByOther && mode === "object") {
          onLockedClick?.(id);
          return;
        }

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
        {/* ✅ Keep original color - no visual lock indicator */}
        <meshStandardMaterial
          color={color}
          transparent={false}
          side={is2D ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>

      {/* ❌ Removed lock indicator HTML element */}

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
          <lineSegments geometry={normalEdgesGeometry} raycast={() => null}>
            <lineBasicMaterial
              color={THEME.edge.default}
              linewidth={THEME.sizes.edgeLineWidth}
            />
          </lineSegments>

          {selectionData.selectedEdges.length > 0 && (
            <lineSegments geometry={selectedEdgesGeometry} raycast={() => null}>
              <lineBasicMaterial
                color={THEME.edge.selected}
                linewidth={THEME.sizes.selectedEdgeLineWidth}
                depthTest={true}
              />
            </lineSegments>
          )}

          {!is2D &&
            selectionData.selectedFaces.length > 0 &&
            selectionData.selectedFaces.map((face, faceIndex) => {
              if (face.length < 3) return null;
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
                new THREE.BufferAttribute(positions, 3),
              );
              faceGeometry.setIndex(isQuad ? [0, 1, 2, 0, 2, 3] : [0, 1, 2]);
              faceGeometry.computeVertexNormals();

              return (
                <mesh
                  key={`selected-face-${faceIndex}`}
                  geometry={faceGeometry}
                  userData={{ isSelectable: false }}
                >
                  {/* ✅ Keep original face color */}
                  <meshBasicMaterial
                    color={THEME.face.selected}
                    transparent
                    opacity={THEME.face.opacity}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    depthTest={true}
                    polygonOffset
                    polygonOffsetFactor={-1}
                    polygonOffsetUnits={-1}
                  />
                </mesh>
              );
            })}

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

                  // 🆕 Check if mesh is locked in edit mode
                  if (isLockedByOther) {
                    onLockedClick?.(id);
                    return;
                  }

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

          {gizmoTarget && !isCtrlPressed && !isLockedByOther && (
            <TransformControls
              ref={(ref) => {
                transformControlsRef.current = ref;
                if (ref && !controlsReady) setControlsReady(true);
              }}
              mode="translate"
              object={gizmoTarget}
              onObjectChange={handleGizmoObjectChange}
              showX
              showY
              showZ
            />
          )}
        </>
      )}
    </group>
  );
};

export default CustomMesh;
export type { CustomMeshProps };
