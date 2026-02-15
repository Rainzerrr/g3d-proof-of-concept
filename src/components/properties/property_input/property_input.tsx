import { FC, useState, useEffect } from "react";
import classNames from "classnames";
import "./property_input.scss";

interface PropertyInputProps {
  defaultValue?: string;
  onValidChange?: (value: string) => void;
  onBlur?: () => void; // 🆕 Added
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  axe: string;
  min?: number;
  max?: number;
}

const PropertyInput: FC<PropertyInputProps> = ({
  defaultValue = "",
  axe,
  onValidChange,
  onBlur, // 🆕 Added
  placeholder,
  disabled,
  className,
  min = -10000,
  max = 10000,
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);

    if (val.trim() === "") {
      return;
    }

    const floatValue = parseFloat(val);
    if (isNaN(floatValue)) {
      return;
    }

    if (floatValue < min || floatValue > max) {
      return;
    }

    onValidChange?.(val);
  };

  const handleBlur = () => {
    if (value.trim() === "" && defaultValue) {
      setValue(defaultValue);
    }
    onBlur?.();
  };

  return (
    <div className={classNames("property-input", className)}>
      <span
        className={classNames(
          "property-input__axe-letter",
          `property-input__axe-letter--${axe}`,
        )}
      >
        {axe}
      </span>
      <input
        type="number"
        step="any"
        className="property-input__field"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
};

export default PropertyInput;
export type { PropertyInputProps };
