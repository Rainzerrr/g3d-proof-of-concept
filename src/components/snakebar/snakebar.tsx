import { FC, useEffect, useState } from "react";
import "./snakebar.scss";
import { useTranslation } from "react-i18next";

interface SnackbarProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  type?: "info" | "warning" | "error" | "success";
}

const Snackbar: FC<SnackbarProps> = ({
  message,
  isVisible,
  onClose,
  duration = 3000,
  type = "warning",
}) => {
  const [isShowing, setIsShowing] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      const timer = setTimeout(() => {
        setIsShowing(false);
        setTimeout(onClose, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !isShowing) return null;

  return (
    <div
      className={`snackbar snackbar--${type} ${isShowing ? "snackbar--show" : ""}`}
    >
      <span className="snackbar__icon">
        {type === "warning" && "⚠️"}
        {type === "error" && "❌"}
        {type === "info" && "ℹ️"}
        {type === "success" && "✅"}
      </span>
      <span className="snackbar__message">{t(message)}</span>
    </div>
  );
};

export default Snackbar;
