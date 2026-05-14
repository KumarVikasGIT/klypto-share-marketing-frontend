import { io } from "socket.io-client";

const socket = io("http://192.168.1.10:7000", {
  transports: ["websocket", "polling"],
  reconnection: true,
});
console.log("SOCKET FILE LOADED");

export default socket;
