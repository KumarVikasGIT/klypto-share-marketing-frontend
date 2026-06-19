import { io } from "socket.io-client";
import { getUser } from "../../pages/auth/protected";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://192.168.1.7:5000";
export const OPTION_CHAIN_BASE_URL =
  import.meta.env.VITE_OPTION_CHAIN_BASE_URL || "http://192.168.1.6:3000";

// Setup initial connection, extracting userId if available
const getUserId = () => {
  const user = getUser();
  return user?.id || user?._id || "123";
};

// 🔹 Backend Connection
const socket = io(import.meta.env.VITE_API_URL, {
  transports: ["websocket", "polling"],
  reconnection: true,
});

// Dedicated socket for strategy deployment
let strategySocketInstance = null;

export const getStrategySocket = () => {
  if (!strategySocketInstance) {
    strategySocketInstance = io(import.meta.env.VITE_STRATEGY_API_URL, {
      query: { userId: getUserId() },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
  }
  return strategySocketInstance;
};

// Helper function to manually reconnect global socket if needed
export const reconnectSocket = () => {
  if (socket) {
    socket.disconnect().connect();
  }
};

console.log("SOCKET FILE LOADED");

export const SOCKET_URL = import.meta.env.VITE_METADATA_API_URL || "http://192.168.1.6:3000";
export default socket;
