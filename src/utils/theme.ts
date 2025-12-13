/**
 * ✅ Constantes de thème centralisées pour l'application
 */

export const THEME = {
  // Couleurs des edges
  edge: {
    default: "#0671FF",
    selected: "#FFFFFF",
  },

  // Couleurs des vertices
  vertex: {
    default: "#0671FF",
    selected: "#FFFFFF",
  },

  // Couleurs des faces
  face: {
    selected: "#0671FF",
    opacity: 0.5,
  },

  // Couleurs du outline en mode objet
  outline: {
    object: "#48B5FF",
  },

  // Tailles
  sizes: {
    pointSize: 0.007,
    edgeLineWidth: 1,
    selectedEdgeLineWidth: 4,
    outlineScale: 1.007,
  },
} as const;

export type Theme = typeof THEME;
