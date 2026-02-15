export const THEME = {
  edge: {
    default: "#0671FF",
    selected: "#FFFFFF",
  },

  vertex: {
    default: "#0671FF",
    selected: "#FFFFFF",
  },

  face: {
    selected: "#0671FF",
    opacity: 0.5,
  },

  outline: {
    object: "#48B5FF",
  },

  sizes: {
    pointSize: 0.007,
    edgeLineWidth: 1,
    selectedEdgeLineWidth: 4,
    outlineScale: 1.007,
  },
} as const;

export type Theme = typeof THEME;
