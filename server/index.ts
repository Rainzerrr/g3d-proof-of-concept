import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";

// ═══════════════════════════════════════════════════════════
// USER NAME GENERATION
// ═══════════════════════════════════════════════════════════

const ADJECTIVES = [
  "Anonymous",
  "Brave",
  "Curious",
  "Daring",
  "Elegant",
  "Fearless",
  "Graceful",
  "Happy",
  "Inventive",
  "Jolly",
  "Kind",
  "Lively",
  "Mighty",
  "Noble",
  "Optimistic",
  "Playful",
  "Quick",
  "Radiant",
  "Swift",
  "Thoughtful",
  "Unique",
  "Vibrant",
  "Wise",
  "Zealous",
];

const ANIMALS = [
  "Aardvark",
  "Badger",
  "Cheetah",
  "Dolphin",
  "Eagle",
  "Fox",
  "Giraffe",
  "Hedgehog",
  "Iguana",
  "Jaguar",
  "Koala",
  "Lemur",
  "Mongoose",
  "Narwhal",
  "Octopus",
  "Panda",
  "Quokka",
  "Raccoon",
  "Sloth",
  "Tiger",
  "Unicorn",
  "Vulture",
  "Walrus",
  "Xerus",
  "Yak",
  "Zebra",
];

const USER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8B739",
  "#52B788",
  "#E84A5F",
  "#A8DADC",
  "#FF8B94",
  "#B4A7D6",
  "#FFD97D",
  "#AAF683",
  "#FF9FF3",
  "#54A0FF",
  "#48DBFB",
  "#FF6348",
];

function generateUserName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adjective} ${animal}`;
}

function generateUserColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

// ═══════════════════════════════════════════════════════════
// TYPES (Shared with client)
// ═══════════════════════════════════════════════════════════

export type ShapeType = "cube" | "sphere" | "cylinder" | "circle" | "square";

export interface MeshData {
  id: number;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  vertexModifications?: { [vertexIndex: number]: [number, number, number] };
  lockedBy?: string | null;
  lockedByName?: string | null; // 🆕
}

export interface UserInfo {
  clientId: string;
  name: string;
  color: string;
}

export interface SceneState {
  meshes: MeshData[];
  selectedIds: number[];
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };
  mode: "object" | "edit";
  editMode: {
    selectionType: "vertex" | "edge" | "face";
    selectedElements: { meshId: number; elementIndex: number }[];
  };
  history: Action[];
  grid: { visible: boolean; size: number; divisions: number };
  lights: Array<{
    id: number;
    type: "directional" | "point" | "ambient";
    color: string;
    intensity: number;
    position?: [number, number, number];
  }>;
}

export interface Action {
  type: string;
  payload?: any;
}

export type WSMessage =
  | {
      type: "SYNC_STATE";
      payload: SceneState;
      clientId: string;
      userInfo: UserInfo;
      allUsers: UserInfo[];
    } // 🆕 Updated
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
    } // 🆕 Added userName
  | { type: "LOCK_RELEASED"; meshId: number }
  | { type: "USER_JOINED"; user: UserInfo } // 🆕
  | { type: "USER_LEFT"; clientId: string } // 🆕
  | { type: "ERROR"; message: string };

// ═══════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════

const initialSceneState: SceneState = {
  meshes: [],
  selectedIds: [],
  camera: { position: [5, 5, 5], target: [0, 0, 0], fov: 60 },
  mode: "object",
  editMode: { selectionType: "vertex", selectedElements: [] },
  history: [],
  grid: { visible: true, size: 10, divisions: 10 },
  lights: [
    {
      id: 1,
      type: "directional",
      color: "#ffffff",
      intensity: 0.8,
      position: [2, 5, 3],
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// PERSISTENCE CONFIGURATION
// ═══════════════════════════════════════════════════════════

const DATA_DIR = path.join(__dirname, "../data");
const STATE_FILE = path.join(DATA_DIR, "scene-state.json");
const SAVE_INTERVAL_MS = 30000; // 30 seconds

// ═══════════════════════════════════════════════════════════
// SERVER STATE
// ═══════════════════════════════════════════════════════════

let globalState: SceneState = { ...initialSceneState };
const meshLocks = new Map<number, string>(); // meshId -> clientId
const clientConnections = new Map<string, WebSocket>();
const userRegistry = new Map<string, UserInfo>(); // 🆕 clientId -> UserInfo

// ═══════════════════════════════════════════════════════════
// PERSISTENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function ensureDataDirectory(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("❌ Failed to create data directory:", error);
  }
}

async function loadPersistedState(): Promise<SceneState | null> {
  try {
    const data = await fs.readFile(STATE_FILE, "utf-8");
    const parsed = JSON.parse(data);
    console.log("📂 Loaded persisted state from disk");
    return parsed;
  } catch {
    console.log("📝 No persisted state found, starting fresh");
    return null;
  }
}

async function saveStateToDisk(): Promise<void> {
  try {
    await ensureDataDirectory();
    await fs.writeFile(
      STATE_FILE,
      JSON.stringify(globalState, null, 2),
      "utf-8",
    );
    console.log("💾 State saved to disk");
  } catch (error) {
    console.error("❌ Failed to save state:", error);
  }
}

// ═══════════════════════════════════════════════════════════
// REDUCER (Simplified server-side version)
// ═══════════════════════════════════════════════════════════

function sceneReducer(state: SceneState, action: Action): SceneState {
  switch (action.type) {
    case "ADD_MESH":
      return {
        ...state,
        meshes: [
          ...state.meshes,
          {
            ...action.payload,
            vertexModifications: {},
            lockedBy: null,
            lockedByName: null,
          },
        ],
        history: [...state.history, action],
      };

    case "REMOVE_MESH":
      return {
        ...state,
        meshes: state.meshes.filter((m) => m.id !== action.payload),
        selectedIds: state.selectedIds.filter((id) => id !== action.payload),
        editMode: {
          ...state.editMode,
          selectedElements: state.editMode.selectedElements.filter(
            (el) => el.meshId !== action.payload,
          ),
        },
        history: [...state.history, action],
      };

    case "DELETE_SELECTED_MESHES":
      return {
        ...state,
        meshes: state.meshes.filter((m) => !state.selectedIds.includes(m.id)),
        selectedIds: [],
        editMode: {
          ...state.editMode,
          selectedElements: state.editMode.selectedElements.filter(
            (el) => !state.selectedIds.includes(el.meshId),
          ),
        },
        history: [...state.history, action],
      };

    case "SELECT_MESH":
      return {
        ...state,
        selectedIds: [action.payload as number],
        editMode: { ...state.editMode, selectedElements: [] },
      };

    case "MULTI_SELECT": {
      const id = action.payload as number;
      const selected = state.selectedIds.includes(id)
        ? state.selectedIds.filter((i) => i !== id)
        : [...state.selectedIds, id];
      return {
        ...state,
        selectedIds: selected,
        editMode: {
          ...state.editMode,
          selectedElements: state.editMode.selectedElements.filter((el) =>
            selected.includes(el.meshId),
          ),
        },
      };
    }

    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedIds: [],
        editMode: { ...state.editMode, selectedElements: [] },
      };

    case "UPDATE_MESH": {
      const { id, property, values } = action.payload;
      return {
        ...state,
        meshes: state.meshes.map((m) =>
          m.id === id ? { ...m, [property]: values } : m,
        ),
        history: [...state.history, action],
      };
    }

    case "UPDATE_VERTEX_POSITION": {
      const { meshId, vertexIndex, newPosition } = action.payload;
      return {
        ...state,
        meshes: state.meshes.map((mesh) => {
          if (mesh.id !== meshId) return mesh;
          return {
            ...mesh,
            vertexModifications: {
              ...(mesh.vertexModifications || {}),
              [vertexIndex]: newPosition,
            },
          };
        }),
        history: [...state.history, action],
      };
    }

    case "UPDATE_MULTIPLE_VERTICES": {
      const { meshId, updates } = action.payload;
      return {
        ...state,
        meshes: state.meshes.map((mesh) => {
          if (mesh.id !== meshId) return mesh;
          const newModifications = { ...(mesh.vertexModifications || {}) };
          updates.forEach(({ vertexIndex, newPosition }: any) => {
            newModifications[vertexIndex] = newPosition;
          });
          return { ...mesh, vertexModifications: newModifications };
        }),
        history: [...state.history, action],
      };
    }

    case "RESET_SCENE":
      return { ...initialSceneState };

    case "SET_MODE":
      return {
        ...state,
        mode: action.payload,
        editMode:
          action.payload === "edit"
            ? state.editMode
            : { ...state.editMode, selectedElements: [] },
      };

    case "SELECT_EDIT_ELEMENT":
      return {
        ...state,
        editMode: {
          ...state.editMode,
          selectedElements: [action.payload],
        },
      };

    case "MULTI_SELECT_EDIT_ELEMENT": {
      const { meshId, elementIndex } = action.payload;
      const alreadySelected = state.editMode.selectedElements.some(
        (el) => el.meshId === meshId && el.elementIndex === elementIndex,
      );
      const selectedElements = alreadySelected
        ? state.editMode.selectedElements.filter(
            (el) => !(el.meshId === meshId && el.elementIndex === elementIndex),
          )
        : [...state.editMode.selectedElements, { meshId, elementIndex }];
      return {
        ...state,
        editMode: { ...state.editMode, selectedElements },
      };
    }

    case "CLEAR_EDIT_ELEMENT_SELECTION":
    case "CLEAR_EDIT_SELECTION":
      return {
        ...state,
        editMode: { ...state.editMode, selectedElements: [] },
      };

    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════
// WEBSOCKET SERVER
// ═══════════════════════════════════════════════════════════

const PORT = Number(process.env.PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });

(async () => {
  await ensureDataDirectory();
  const persistedState = await loadPersistedState();
  if (persistedState) {
    globalState = persistedState;
  }

  console.log(
    `🚀 Collaborative 3D Editor Server running on ws://localhost:${PORT}`,
  );
  console.log(`💾 Auto-save enabled (every ${SAVE_INTERVAL_MS / 1000}s)`);

  setInterval(async () => {
    if (globalState.meshes.length > 0) {
      await saveStateToDisk();
    }
  }, SAVE_INTERVAL_MS);
})();

wss.on("connection", (ws: WebSocket) => {
  const clientId = uuidv4();
  const userName = generateUserName();
  const userColor = generateUserColor();

  const userInfo: UserInfo = { clientId, name: userName, color: userColor };

  clientConnections.set(clientId, ws);
  userRegistry.set(clientId, userInfo);

  console.log(
    `✅ ${userName} connected (${clientId.slice(0, 8)}) - Total: ${clientConnections.size}`,
  );

  // 🆕 Send SYNC_STATE with userInfo and allUsers
  const syncMsg: WSMessage = {
    type: "SYNC_STATE",
    payload: addLockInfo(globalState),
    clientId,
    userInfo,
    allUsers: Array.from(userRegistry.values()),
  };

  console.log("📤 Sending SYNC_STATE to", userName);
  console.log("   userInfo:", userInfo);
  console.log("   allUsers count:", userRegistry.size);

  ws.send(JSON.stringify(syncMsg));

  // 🆕 Broadcast USER_JOINED to other clients
  const userJoinedMsg: WSMessage = {
    type: "USER_JOINED",
    user: userInfo,
  };
  broadcast(userJoinedMsg, clientId);

  ws.on("message", (raw: string) => {
    try {
      const message: WSMessage = JSON.parse(raw);
      if (message.type === "CLIENT_ACTION") {
        handleClientAction(message.action, clientId);
      }
    } catch (error) {
      console.error("❌ Failed to process message:", error);
      sendError(ws, "Invalid message format");
    }
  });

  ws.on("close", () => {
    const user = userRegistry.get(clientId);
    console.log(`❌ ${user?.name || clientId} disconnected`);

    clientConnections.delete(clientId);
    userRegistry.delete(clientId);
    releaseAllLocks(clientId);

    // 🆕 Broadcast USER_LEFT
    const userLeftMsg: WSMessage = {
      type: "USER_LEFT",
      clientId,
    };
    broadcast(userLeftMsg);
  });

  ws.on("error", (error) => {
    console.error(`🚨 WebSocket error for ${userName}:`, error);
  });
});

// ═══════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════

function handleClientAction(action: Action, authorId: string): void {
  // 1. 🛡️ LOCK VALIDATION (Reject unauthorized edits early)
  if (requiresLock(action)) {
    const meshId = getMeshIdFromAction(action);
    const lockOwner = meshLocks.get(meshId);

    if (lockOwner && lockOwner !== authorId) {
      const ownerName = userRegistry.get(lockOwner)?.name || "another user";
      console.warn(
        `🚫 Blocked unauthorized action from ${authorId} on mesh ${meshId}`,
      );
      const ws = clientConnections.get(authorId);
      if (ws) {
        sendError(ws, `Mesh ${meshId} is locked by ${ownerName}`);
      }
      return; // Stop processing. The action is rejected.
    }
  }

  // 2. 🔐 LOCK MANAGEMENT (Infer locks based on selections/deletions)
  if (action.type === "SELECT_MESH") {
    // Release previously selected meshes
    globalState.selectedIds.forEach((id) => {
      if (meshLocks.get(id) === authorId) releaseLock(id, authorId);
    });
    // Acquire the new one
    acquireLock(action.payload as number, authorId);
  }

  if (action.type === "MULTI_SELECT") {
    const meshId = action.payload as number;
    // We check if it's already selected IN THE CURRENT STATE (before reducing)
    if (globalState.selectedIds.includes(meshId)) {
      releaseLock(meshId, authorId); // They are deselecting it
    } else {
      acquireLock(meshId, authorId); // They are selecting it
    }
  }

  if (action.type === "CLEAR_SELECTION" || action.type === "RESET_SCENE") {
    releaseAllLocks(authorId);
  }

  if (
    action.type === "DELETE_SELECTED_MESHES" ||
    action.type === "REMOVE_MESH"
  ) {
    // Use the payload if available (to match our frontend fix), otherwise fallback to server state
    const meshesToDelete = action.payload
      ? Array.isArray(action.payload)
        ? action.payload
        : [action.payload]
      : globalState.selectedIds;

    meshesToDelete.forEach((meshId: number) => {
      if (meshLocks.get(meshId) === authorId) {
        releaseLock(meshId, authorId); // Explicitly release instead of just deleting from map
      }
    });
  }

  // 3. 🧠 UPDATE MASTER STATE
  // Now that locks are sorted, apply the action to the server's truth
  globalState = sceneReducer(globalState, action);

  // 4. 📡 BROADCAST TO PEERS
  // We do NOT broadcast selection actions, because selections are local to each user's view.
  // We ONLY broadcast actions that modify the scene geometry or environment.
  const selectionActions = [
    "SELECT_MESH",
    "MULTI_SELECT",
    "CLEAR_SELECTION",
    "SELECT_EDIT_ELEMENT",
    "MULTI_SELECT_EDIT_ELEMENT",
    "CLEAR_EDIT_ELEMENT_SELECTION",
    "CLEAR_EDIT_SELECTION",
    "SET_MODE",
  ];

  if (!selectionActions.includes(action.type)) {
    const authorName = userRegistry.get(authorId)?.name || "Unknown";
    const broadcastMsg: WSMessage = {
      type: "REMOTE_ACTION",
      action,
      authorId,
      timestamp: Date.now(),
    };

    broadcast(broadcastMsg, authorId);
    console.log(`📡 Broadcast action: ${action.type} from ${authorName}`);
  }
}

// ═══════════════════════════════════════════════════════════
// LOCK MANAGEMENT
// ═══════════════════════════════════════════════════════════

function acquireLock(meshId: number, clientId: string): void {
  const currentOwner = meshLocks.get(meshId);
  if (currentOwner && currentOwner !== clientId) {
    const ownerName = userRegistry.get(currentOwner)?.name || "Unknown";
    console.warn(`⚠️  Mesh ${meshId} already locked by ${ownerName}`);
    return;
  }

  meshLocks.set(meshId, clientId);
  const userName = userRegistry.get(clientId)?.name || "Unknown User";

  globalState.meshes = globalState.meshes.map((m) =>
    m.id === meshId ? { ...m, lockedBy: clientId, lockedByName: userName } : m,
  );

  const lockMsg: WSMessage = {
    type: "LOCK_ACQUIRED",
    meshId,
    clientId,
    userName,
  };
  broadcast(lockMsg);
  console.log(`🔒 Mesh ${meshId} locked by ${userName}`);
}

function releaseLock(meshId: number, clientId: string): void {
  const owner = meshLocks.get(meshId);
  if (owner !== clientId) return;

  meshLocks.delete(meshId);
  globalState.meshes = globalState.meshes.map((m) =>
    m.id === meshId ? { ...m, lockedBy: null, lockedByName: null } : m,
  );

  const lockMsg: WSMessage = { type: "LOCK_RELEASED", meshId };
  broadcast(lockMsg);
  console.log(`🔓 Mesh ${meshId} unlocked`);
}

function releaseAllLocks(clientId: string): void {
  const lockedMeshes: number[] = [];

  meshLocks.forEach((owner, meshId) => {
    if (owner === clientId) {
      lockedMeshes.push(meshId);
      meshLocks.delete(meshId);
    }
  });

  if (lockedMeshes.length > 0) {
    globalState.meshes = globalState.meshes.map((m) =>
      lockedMeshes.includes(m.id)
        ? { ...m, lockedBy: null, lockedByName: null }
        : m,
    );

    lockedMeshes.forEach((meshId) => {
      const lockMsg: WSMessage = { type: "LOCK_RELEASED", meshId };
      broadcast(lockMsg);
    });

    const userName = userRegistry.get(clientId)?.name || clientId;
    console.log(`🔓 Released ${lockedMeshes.length} locks for ${userName}`);
  }
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

function requiresLock(action: Action): boolean {
  return [
    "UPDATE_MESH",
    "UPDATE_VERTEX_POSITION",
    "UPDATE_MULTIPLE_VERTICES",
    "REMOVE_MESH",
  ].includes(action.type);
}

function getMeshIdFromAction(action: Action): number {
  const payload = action.payload as any;
  return payload.id || payload.meshId || 0;
}

function addLockInfo(state: SceneState): SceneState {
  return {
    ...state,
    meshes: state.meshes.map((mesh) => {
      const lockOwner = meshLocks.get(mesh.id);
      return {
        ...mesh,
        lockedBy: lockOwner || null,
        lockedByName: lockOwner
          ? userRegistry.get(lockOwner)?.name || null
          : null,
      };
    }),
  };
}

function broadcast(message: WSMessage, excludeClientId?: string): void {
  const serialized = JSON.stringify(message);

  clientConnections.forEach((ws, clientId) => {
    if (clientId !== excludeClientId && ws.readyState === WebSocket.OPEN) {
      ws.send(serialized);
    }
  });
}

function sendError(ws: WebSocket, message: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    const errorMsg: WSMessage = { type: "ERROR", message };
    ws.send(JSON.stringify(errorMsg));
  }
}

// ═══════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════

async function shutdown() {
  console.log("\n🛑 Shutting down server...");
  await saveStateToDisk();
  wss.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
