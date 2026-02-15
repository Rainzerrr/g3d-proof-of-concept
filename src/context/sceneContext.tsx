"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useCallback,
  useState,
} from "react";
import { SceneState, Action, UserInfo } from "./types";
import { initialSceneState, sceneReducer } from "./sceneReducer";
import { useWebSocket } from "../hooks/useWebSocket";

interface SceneContextType {
  state: SceneState;
  dispatch: React.Dispatch<Action>;
  commitAction: (action: Action) => void;
  isConnected: boolean;
  clientId: string | null;
  userInfo: UserInfo | null;
  connectedUsers: UserInfo[];
}

const SceneContext = createContext<SceneContextType | undefined>(undefined);

/**
 * Global provider for the 3D scene state.
 * Manages the transition between local UI updates and remote server synchronization.
 */
export const SceneProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, localDispatch] = useReducer(sceneReducer, initialSceneState);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Synchronizes the local client with the authoritative server state.
   * Triggered upon successful WebSocket connection.
   */
  const handleStateSync = useCallback((serverState: SceneState) => {
    localDispatch({
      type: "SYNC_STATE",
      payload: serverState,
    });
    setIsInitialized(true);
  }, []);

  // Initialize WebSocket hook with local dispatch and sync callback
  const { sendAction, isConnected, clientId, userInfo, connectedUsers } =
    useWebSocket(localDispatch, handleStateSync);

  /**
   * Performs a local-only state update.
   * Useful for transient UI states that don't need to be broadcasted.
   */
  const dispatch = useCallback((action: Action) => {
    localDispatch(action);
  }, []);

  /**
   * Executes a state change locally and broadcasts it to all connected peers.
   * Ensures actions are only sent once the socket is initialized.
   */
  const commitAction = useCallback(
    (action: Action) => {
      localDispatch(action);

      if (isConnected && isInitialized) {
        sendAction(action);
      }
    },
    [isConnected, isInitialized, sendAction],
  );

  return (
    <SceneContext.Provider
      value={{
        state,
        dispatch,
        commitAction,
        isConnected,
        clientId,
        userInfo,
        connectedUsers,
      }}
    >
      {children}
    </SceneContext.Provider>
  );
};

/**
 * Hook to access the scene state and communication methods.
 * @throws Error if used outside of a SceneProvider.
 */
export const useScene = (): SceneContextType => {
  const context = useContext(SceneContext);
  if (!context) throw new Error("useScene must be used within a SceneProvider");
  return context;
};
