import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../../icon/icon";
import "./mesh-dropdown.scss";

export type ShapeType = "cube" | "sphere" | "cylinder" | "circle" | "square";

interface MeshDropdownProps {
  onSelect: (shapeType: ShapeType) => void;
}

interface MeshDropdownOption {
  label: string;
  icon: string;
  type: string;
}

const options: MeshDropdownOption[] = [
  { label: "shapes.plane", icon: "square", type: "square" },
  { label: "shapes.cube", icon: "box", type: "cube" },
  { label: "shapes.circle", icon: "circle", type: "circle" },
  { label: "shapes.sphere", icon: "globe", type: "sphere" },
  { label: "shapes.cylinder", icon: "cylinder", type: "cylinder" },
];

const MeshDropdown: FC<MeshDropdownProps> = ({ onSelect }) => {
  const { t } = useTranslation();
  const [isDropdownOpened, setIsDropdownOpened] = useState(false);

  return (
    <div className="mesh-dropdown">
      <div
        className="mesh-dropdown__button"
        onClick={() => setIsDropdownOpened(!isDropdownOpened)}
      >
        <Icon name="box" padding />
        <Icon
          name="chevron-down"
          className={
            isDropdownOpened
              ? "mesh-dropdown__button__chevron--selected"
              : "mesh-dropdown__button__chevron"
          }
        />
      </div>
      {isDropdownOpened && (
        <div className="mesh-dropdown__options">
          {options.map((option: MeshDropdownOption) => (
            <div
              className="mesh-dropdown__option"
              onClick={() => {
                onSelect(option.type as ShapeType);
                setIsDropdownOpened(false);
              }}
            >
              <span className="mesh-dropdown__option__label">
                {t(option.label)}
              </span>
              <Icon name={option.icon} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeshDropdown;
