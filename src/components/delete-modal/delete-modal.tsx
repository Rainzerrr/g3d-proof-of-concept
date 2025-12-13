"use client";
import "./delete-modal.scss";

import React, { useEffect } from "react";

interface DeleteModalProps {
  position: { x: number; y: number };
  onDelete: () => void;
  onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  position,
  onDelete,
  onClose,
}) => {
  // ✅ Fermer la modal avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // ✅ Fermer la modal si clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".delete-modal")) {
        onClose();
      }
    };

    // Ajouter avec un léger délai pour éviter la fermeture immédiate
    setTimeout(() => {
      window.addEventListener("click", handleClickOutside);
    }, 0);

    return () => window.removeEventListener("click", handleClickOutside);
  }, [onClose]);

  const handleClick = () => {
    onDelete();
    onClose();
  };

  return (
    <div
      style={{
        left: position.x,
        top: position.y,
      }}
      className="delete-modal"
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="delete-modal-button">Supprimer</p>
    </div>
  );
};

export default DeleteModal;
