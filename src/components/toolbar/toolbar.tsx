import { FC } from "react";
import { Icon } from "../icon/icon";
import MeshDropdown, { ShapeType } from "./mesh-dropdown/mesh-dropdown";
import "./toolbar.scss";

interface ToolbarProps {
  isEditing: boolean;
  onSelectDropdown: (shapeType: ShapeType) => void;
  resetBoard: () => void;
  resetEdit: () => void;
  onEditClick: () => void;
}

const Toolbar: FC<ToolbarProps> = ({
  isEditing,
  onSelectDropdown,
  onEditClick,
}) => {
  return (
    <div className="toolbar">
      <MeshDropdown onSelect={onSelectDropdown} />

      <div className="toolbar__separator" />

      <Icon padding name="mouse-pointer" />

      <Icon padding name={isEditing ? "check" : "pen"} onClick={onEditClick} />
    </div>
  );
};

export default Toolbar;
export type { ToolbarProps };
