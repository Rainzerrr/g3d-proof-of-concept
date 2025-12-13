"use client";

import React from "react";
import { useScene } from "../../context/sceneContext";
import { useTranslation } from "react-i18next";
import "./properties.scss";
import PropertyInput from "./property_input/property_input";
import { MeshData } from "../../context/types";

interface PropertiesProps {
  selectedId: number | null;
}

const Properties: React.FC<PropertiesProps> = ({ selectedId }) => {
  const { state, dispatch } = useScene();
  const { t } = useTranslation();
  const selectedMesh: MeshData | undefined = state.meshes.find(
    (m) => m.id === selectedId
  );

  // pas de mesh sélectionné = rien à afficher
  if (!selectedMesh) return null;

  const updateProperty = (
    type: "position" | "scale" | "rotation",
    axis: number,
    value: string
  ) => {
    if (value.trim() === "") return; // on laisse vide sans update mesh

    const floatValue = parseFloat(value);
    if (isNaN(floatValue)) return;

    const newValues: [number, number, number] = [...selectedMesh[type]] as [
      number,
      number,
      number
    ];
    newValues[axis] = floatValue;

    dispatch({
      type: "UPDATE_MESH",
      payload: { id: selectedMesh.id, property: type, values: newValues },
    });
  };

  const renderInputs = (
    type: "position" | "scale" | "rotation",
    values: [number, number, number]
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
        {renderInputs("position", selectedMesh.position)}
        {renderInputs("scale", selectedMesh.scale)}
        {renderInputs("rotation", selectedMesh.rotation)}
      </div>
    </div>
  );
};

export default Properties;
