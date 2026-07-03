import { io } from "socket.io-client";
import { getUser } from "../../pages/auth/protected";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://192.168.1.9:5000";
export const METADATA_API_URL =
  import.meta.env.VITE_METADATA_API_URL || "http://192.168.1.9:3000";

// Setup initial connection, extracting userId if available
const getUserId = () => {
  const user = getUser();
  return user?.id || "123";
};

// 🔹 Backend Connection
const socket = io(import.meta.env.VITE_API_BASE_URL, {
  transports: ["websocket", "polling"],
  reconnection: true,
});

socket.on("connect", () => {
  console.log("Connected", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.log("Connect error:", err.message);
});

socket.io.on("reconnect", (attempt) => {
  console.log("Reconnected", attempt);
});

socket.io.on("reconnect_attempt", () => {
  console.log("Reconnect attempt");
});

// Dedicated socket for strategy deployment
let strategySocketInstance = null;

export const getStrategySocket = () => {
  if (!strategySocketInstance) {
    const strategyUrl = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;
    strategySocketInstance = io(strategyUrl, {
      query: { userId: getUserId() },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
  }
  return strategySocketInstance;
};

export const reconnectSocket = () => {
  if (socket) {
    socket.disconnect().connect();
  }
};

console.log("SOCKET FILE LOADED");

export const SOCKET_URL =
  import.meta.env.VITE_METADATA_API_URL || "http://192.168.1.9:3000";
export default socket;
