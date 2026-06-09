import { io } from "socket.io-client";

const socket = io("http://192.168.1.16:8000", {
  // const socket = io("http://localhost:9000", {

  transports: ["websocket", "polling"],
  reconnection: true,
});
console.log("SOCKET FILE LOADED");

export default socket;
