import { FC, useState, useRef, useEffect } from "react";
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

  // 1. Créer une référence pour le conteneur du composant
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 2. Logique de fermeture au clic extérieur (Click Outside)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Si le menu est ouvert ET que l'élément cliqué n'est PAS un descendant de l'élément référencé
      if (
        isDropdownOpened &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpened(false);
      }
    };

    // Attacher l'écouteur d'événement global 'mousedown'
    document.addEventListener("mousedown", handleClickOutside);

    // Nettoyer l'écouteur d'événement lors du démontage du composant
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpened]); // Dépend de isDropdownOpened pour garantir que la fonction est à jour

  return (
    // 3. Appliquer la référence au conteneur racine
    <div className="mesh-dropdown" ref={dropdownRef}>
      <div
        className="mesh-dropdown__button"
        // Le clic ouvre/ferme le menu
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
              key={option.label}
              className="mesh-dropdown__option"
              onClick={() => {
                onSelect(option.type as ShapeType);
                // Fermer le menu après la sélection
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
