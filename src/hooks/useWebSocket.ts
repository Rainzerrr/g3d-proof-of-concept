import { useEffect, useRef, useState, useCallback } from "react";
import { Action, SceneState, UserInfo } from "../context/types";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

/**
 * Protocol definition for collaborative WebSocket messages.
 * Handles state hydration, remote actions, object locking, and user presence.
 */
export type WSMessage =
  | {
      type: "SYNC_STATE";
      payload: SceneState;
      clientId: string;
      userInfo: UserInfo;
      allUsers: UserInfo[];
    }
  | {
      type: "REMOTE_ACTION";
      action: Action;
      authorId: string;
      timestamp: number;
    }
  | { type: "CLIENT_ACTION"; action: Action }
  | {
      type: "LOCK_ACQUIRED";
      meshId: number;
      clientId: string;
      userName: string;
    }
  | { type: "LOCK_RELEASED"; meshId: number }
  | { type: "USER_JOINED"; user: UserInfo }
  | { type: "USER_LEFT"; clientId: string }
  | { type: "ERROR"; message: string };

interface UseWebSocketReturn {
  sendAction: (action: Action) => void;
  isConnected: boolean;
  clientId: string | null;
  userInfo: UserInfo | null;
  connectedUsers: UserInfo[];
}

/**
 * Custom hook to manage the real-time communication layer.
 * Facilitates automatic reconnection, state synchronization, and peer-to-peer event handling.
 * * @param dispatch - The local scene reducer's dispatch function to apply remote changes.
 * @param onStateSync - Optional callback triggered when the initial full scene state is received.
 * @returns Object containing socket status, current user info, and a function to broadcast actions.
 */
export function useWebSocket(
  dispatch: React.Dispatch<Action>,
  onStateSync?: (state: SceneState, clientId: string) => void,
): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<UserInfo[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);

  /**
   * Diagnostic effect to monitor collaborative presence and connection status changes.
   */
  useEffect(() => {
    console.log("🎣 WebSocket Presence Update:", {
      isConnected,
      clientId,
      count: connectedUsers.length,
    });
  }, [isConnected, clientId, userInfo, connectedUsers]);

  /**
   * Initializes the WebSocket connection and configures event listeners.
   * Logic includes exponential backoff for reconnections and a message router.
   */
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        // Routing logic based on message type
        switch (message.type) {
          case "SYNC_STATE":
            // Initial hydration of client identity and world state
            setClientId(message.clientId);
            setUserInfo(message.userInfo);
            setConnectedUsers(message.allUsers);
            if (onStateSync) onStateSync(message.payload, message.clientId);
            break;

          case "REMOTE_ACTION":
            // Apply scene modifications performed by other users
            dispatch(message.action);
            break;

          case "LOCK_ACQUIRED":
          case "LOCK_RELEASED":
            // Update mesh metadata to reflect edit-locking status
            dispatch({
              type: "UPDATE_MESH_LOCK",
              payload: {
                meshId: message.meshId,
                lockedBy:
                  message.type === "LOCK_ACQUIRED" ? message.clientId : null,
                lockedByName:
                  message.type === "LOCK_ACQUIRED" ? message.userName : null,
              },
            });
            break;

          case "USER_JOINED":
            // Add new peer to the active users list
            setConnectedUsers((prev) => [...prev, message.user]);
            break;

          case "USER_LEFT":
            // Remove peer and clean up their associated state
            setConnectedUsers((prev) =>
              prev.filter((u) => u.clientId !== message.clientId),
            );
            break;

          case "ERROR":
            console.error(`Server error: ${message.message}`);
            break;

          default:
            console.warn("Unhandled message type received:", message);
        }
      } catch (error) {
        console.error("Failed to process socket message:", error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);

      // Calculate reconnection delay using exponential backoff (max 10s)
      const delay = Math.min(
        1000 * Math.pow(2, reconnectAttemptsRef.current),
        10000,
      );
      reconnectAttemptsRef.current++;

      reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
    };

    ws.onerror = (error) => console.error("WebSocket transport error:", error);

    wsRef.current = ws;
  }, [dispatch, onStateSync]);

  /**
   * Effect to manage initial mounting and resource cleanup.
   */
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

  /**
   * Broadcasts a local action to the server to synchronize changes with all connected peers.
   * * @param action - The scene action to be transmitted (Move, Scale, Add, etc.).
   */
  const sendAction = useCallback((action: Action) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WSMessage = { type: "CLIENT_ACTION", action };
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("Action suppressed: WebSocket is not in OPEN state.");
    }
  }, []);

  return {
    sendAction,
    isConnected,
    clientId,
    userInfo,
    connectedUsers,
  };
}
