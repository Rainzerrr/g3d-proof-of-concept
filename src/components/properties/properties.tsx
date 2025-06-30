import { useTranslation } from "react-i18next";
import "./properties.scss";
import PropertyInput from "./property_input/property_input";
import { MeshData } from "../../page/homepage";
import { FC } from "react";

interface PropertiesProps {
  selectedId: number | null;
  meshes: MeshData[];
  setMeshes: React.Dispatch<React.SetStateAction<MeshData[]>>;
}

const Properties: FC<PropertiesProps> = ({ selectedId, meshes, setMeshes }) => {
  const { t } = useTranslation();

  if (selectedId === null) return null;

  const selectedMesh = meshes.find((mesh) => mesh.id === selectedId);
  if (!selectedMesh) return null;

  const updateProperty = (
    type: "position" | "scale" | "rotation",
    axis: number, // 0: X, 1: Y, 2: Z
    value: string
  ) => {
    const floatValue = parseFloat(value);
    if (isNaN(floatValue)) return;

    const updated = meshes.map((mesh) =>
      mesh.id === selectedId
        ? {
            ...mesh,
            [type]: mesh[type].map((v, i) => (i === axis ? floatValue : v)) as
              | [number, number, number],
          }
        : mesh
    );
    setMeshes(updated);
  };

  const renderInputs = (
    type: "position" | "scale" | "rotation",
    values: [number, number, number]
  ) => (
    <div className="properties__info">
      <span className="properties_subtitle">{t(`properties.${type}`)}</span>
      <div className="properties__info__inputs">
        {(["X", "Y", "Z"] as const).map((axe, i) => (
          <PropertyInput
            key={axe}
            axe={axe}
            value={values[i].toString()}
            onChange={(e) => updateProperty(type, i, e.target.value)}
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
