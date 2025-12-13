"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { SceneState, Action } from "./types";
import { initialSceneState, sceneReducer } from "./sceneReducer";

interface SceneContextType {
  state: SceneState;
  dispatch: React.Dispatch<Action>;
}

const SceneContext = createContext<SceneContextType | undefined>(undefined);

export const SceneProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(sceneReducer, initialSceneState);
  return (
    <SceneContext.Provider value={{ state, dispatch }}>
      {children}
    </SceneContext.Provider>
  );
};

export const useScene = (): SceneContextType => {
  const context = useContext(SceneContext);
  if (!context) throw new Error("useScene must be used within a SceneProvider");
  return context;
};
