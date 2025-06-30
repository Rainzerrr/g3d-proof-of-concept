import { FC } from "react";
import { Icon } from "../icon/icon";
import "./toolbar.scss";
import MeshDropdown, { ShapeType } from "./mesh-dropdown/mesh-dropdown";

interface ToolbarProps {
  isEditing: boolean;
  onSelectDropdown: (shapeType: ShapeType) => void;
  resetBoard: () => void;
  resetEdit: () => void;
}

const Toolbar: FC<ToolbarProps> = ({
  isEditing,
  onSelectDropdown,
  resetBoard,
  resetEdit,
}) => {
  return (
    <div className="toolbar">
      <MeshDropdown onSelect={onSelectDropdown} />
      <div className="toolbar__separator" />
      <Icon padding name="mouse-pointer" />
      <Icon padding name={isEditing ? "check" : "pen"} onClick={resetEdit} />
      <Icon padding name="square" onClick={resetBoard} />
    </div>
  );
};

export default Toolbar;
export type { ToolbarProps };
