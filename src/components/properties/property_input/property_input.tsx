import { FC } from "react";
import classNames from "classnames";
import "./property_input.scss";

interface PropertyInputProps {
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  className?: string;
  axe: string;
}

const PropertyInput: FC<PropertyInputProps> = ({
  value,
  axe,
  onChange,
  placeholder = "0",
  disabled,
  className,
}) => {
  return (
    <div className={classNames("property-input", className)}>
      <span
        className={classNames(
          "property-input__axe-letter",
          `property-input__axe-letter--${axe}`
        )}
      >
        {axe}
      </span>
      <input
        className="property-input__field"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
};

export default PropertyInput;
export type { PropertyInputProps };
