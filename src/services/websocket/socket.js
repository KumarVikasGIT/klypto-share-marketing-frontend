import { io } from "socket.io-client";
import { getUser } from "../../pages/auth/protected";

// Setup initial connection, extracting userId if available
const getUserId = () => {
  const user = getUser();
  return user?.id || user?._id || "123";
};

const socket = io("http://192.168.1.7:5000", {
  transports: ["websocket", "polling"],
  reconnection: true,
});

// Dedicated socket for strategy deployment
let strategySocketInstance = null;

export const getStrategySocket = () => {
  if (!strategySocketInstance) {
    strategySocketInstance = io("http://192.168.1.7:5000", {
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

export const SOCKET_URL = "http://192.168.1.6:3000";
export default socket;
