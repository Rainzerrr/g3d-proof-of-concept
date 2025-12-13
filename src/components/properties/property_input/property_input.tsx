import { FC, useState, useEffect } from "react";
import classNames from "classnames";
import "./property_input.scss";

interface PropertyInputProps {
  defaultValue?: string;
  onValidChange?: (value: string) => void;
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

    // ✅ Validation : Vide = pas d'erreur mais pas de callback
    if (val.trim() === "") {
      return;
    }

    // ✅ Validation : Nombre valide
    const floatValue = parseFloat(val);
    if (isNaN(floatValue)) {
      return;
    }

    // ✅ Validation : Limites
    if (floatValue < min || floatValue > max) {
      return;
    }

    // ✅ Tout est OK, appeler le callback
    onValidChange?.(val);
  };

  const handleBlur = () => {
    // ✅ Si vide au blur, restaurer la valeur par défaut
    if (value.trim() === "" && defaultValue) {
      setValue(defaultValue);
    }
  };

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
