import socket from "./services/socket";

/**
 * Indicator Logger Utility
 * This file intercepts outgoing 'updateIndicator' events and listens for incoming responses.
 * It prints a structured "hit" and "response" log to the browser console.
 */

// Intercept outgoing emissions
const originalEmit = socket.emit;
socket.emit = function (event, ...args) {
  if (event === "updateIndicator" || event === "getIndicatorDetails") {
    console.log("==========================================");
    console.log(`[INDICATOR HIT] ${new Date().toLocaleTimeString()}`);
    console.log(`Event: ${event}`);
    console.log("Payload:", args[0]);
    console.log("==========================================");
  }
  return originalEmit.apply(this, [event, ...args]);
};
// Listen for ALL incoming events to catch any naming discrepancies
socket.onAny((event, ...args) => {
  if (event.includes("Indicator") || event.includes("indicator")) {
    console.log(`[ANY EVENT] ${event}:`, args[0]);
  }
});

// Listen for incoming responses
socket.on("updateIndicatorResponse", (response) => {
  console.log("==========================================");
  console.log(`[INDICATOR RESPONSE] ${new Date().toLocaleTimeString()}`);
  console.log("-------------------------------------Data:", response);
  console.log("==========================================");
});

socket.on("indicatorDetailsResponse", (response) => {
  console.log("==========================================");
  console.log(`[DETAILS RESPONSE] ${new Date().toLocaleTimeString()}`);
  console.log("Data:", response);
  console.log("==========================================");
}); 

socket.on("indicatorDetailsError", (error) => {
  console.log("==========================================");
  console.log(`[DETAILS ERROR] ${new Date().toLocaleTimeString()}`);
  console.error("Error:", error);
  console.log("==========================================");
});

console.log("🚀 Indicator Logger initialized and listening...");
