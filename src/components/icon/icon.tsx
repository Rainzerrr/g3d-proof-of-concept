import classNames from "classnames";
import "./icon.scss";

export interface IconProps {
  className?: string;
  name: string;
  fill?: string;
  stroke?: string;
  padding?: boolean;
  onClick?: () => void;
}

export const Icon = ({
  className,
  name,
  fill = "white",
  stroke,
  onClick,
}: IconProps): React.ReactElement => {
  return (
    <div className={classNames(className, "icon-wrapper")}>
      <svg
        className={classNames(className, "icon", `icon-${name}`, {
          "icon-clickable": onClick,
        })}
        onClick={onClick}
      >
        <use
          xlinkHref={`/assets/symbol-defs.svg#icon-${name}`}
          width="100%"
          height="100%"
          style={{ fill: fill, stroke: stroke }}
        />
      </svg>
    </div>
  );
};
