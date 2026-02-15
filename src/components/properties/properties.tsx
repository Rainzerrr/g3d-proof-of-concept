"use client";

import React, { useState, useEffect } from "react";
import { useScene } from "../../context/sceneContext";
import { useTranslation } from "react-i18next";
import "./properties.scss";
import PropertyInput from "./property_input/property_input";
import { MeshData } from "../../context/types";

interface PropertiesProps {
  selectedId: number | null;
}

const Properties: React.FC<PropertiesProps> = ({ selectedId }) => {
  const { state, dispatch, commitAction, clientId } = useScene();
  const { t } = useTranslation();
  const selectedMesh: MeshData | undefined = state.meshes.find(
    (m) => m.id === selectedId,
  );

  const [localPosition, setLocalPosition] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [localRotation, setLocalRotation] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [localScale, setLocalScale] = useState<[number, number, number]>([
    1, 1, 1,
  ]);

  useEffect(() => {
    if (selectedMesh) {
      setLocalPosition(selectedMesh.position);
      setLocalRotation(selectedMesh.rotation);
      setLocalScale(selectedMesh.scale);
    }
  }, [selectedMesh]);

  if (!selectedMesh) return null;

  const isLocked =
    selectedMesh.lockedBy != "" && selectedMesh.lockedBy !== clientId;

  const updateProperty = (
    type: "position" | "scale" | "rotation",
    axis: number,
    value: string,
  ) => {
    if (value.trim() === "") return;

    const floatValue = parseFloat(value);
    if (isNaN(floatValue)) return;

    let newValues: [number, number, number];
    if (type === "position") {
      newValues = [...localPosition] as [number, number, number];
      newValues[axis] = floatValue;
      setLocalPosition(newValues);
    } else if (type === "rotation") {
      newValues = [...localRotation] as [number, number, number];
      newValues[axis] = floatValue;
      setLocalRotation(newValues);
    } else {
      newValues = [...localScale] as [number, number, number];
      newValues[axis] = floatValue;
      setLocalScale(newValues);
    }

    dispatch({
      type: "UPDATE_MESH",
      payload: { id: selectedMesh.id, property: type, values: newValues },
    });
  };

  const handleBlur = (type: "position" | "rotation" | "scale") => {
    let values: [number, number, number];

    if (type === "position") values = localPosition;
    else if (type === "rotation") values = localRotation;
    else values = localScale;

    commitAction({
      type: "UPDATE_MESH",
      payload: { id: selectedMesh.id, property: type, values },
    });
  };

  const renderInputs = (
    type: "position" | "scale" | "rotation",
    values: [number, number, number],
  ) => (
    <div className="properties__info">
      <span className="properties_subtitle">{t(`properties.${type}`)}</span>
      <div className="properties__info__inputs">
        {["X", "Y", "Z"].map((axis, i) => (
          <PropertyInput
            key={axis}
            axe={axis}
            defaultValue={values[i].toString()}
            onValidChange={(v: string) => updateProperty(type, i, v)}
            onBlur={() => handleBlur(type)}
            disabled={isLocked}
            min={type === "scale" ? 0.001 : -10000}
            max={10000}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="properties">
      <span className="properties_title">{t("properties.title")}</span>
      <div className="properties__infos">
        {renderInputs("position", localPosition)}
        {renderInputs("scale", localScale)}
        {renderInputs("rotation", localRotation)}
      </div>
    </div>
  );
};

export default Properties;
