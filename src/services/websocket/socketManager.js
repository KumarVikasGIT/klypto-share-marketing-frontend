import socket from "./socket";
import EVENTS from "./socketEvent";

/**
 * CENTRAL SOCKET MANAGER
 * - registers all listeners once
 * - routes backend socket events → UI handlers
 *
 * RULE: only register `on` for events the SERVER sends to the client.
 *       Events the client sends (GET, SUBSCRIBE, UNSUBSCRIBE) are emits — never listeners.
 */

class SocketManager {
  constructor() {
    this.handlers = new Map();
    this.socket = socket;
    
    // Setup connection listeners
    this.socket.on("connect", () => {
      console.log("[SocketManager] Socket connected");
      this._triggerHandlers("connect");
    });
    
    this.socket.on("disconnect", () => {
      console.log("[SocketManager] Socket disconnected");
      this._triggerHandlers("disconnect");
    });
    
    this.socket.on("connect_error", (err) => {
      console.error("[SocketManager] Connection error:", err);
      this._triggerHandlers("connect_error", err);
    });

    this._initializeListeners();
  }

  _triggerHandlers(eventName, ...args) {
    const callbacks = this.handlers.get(eventName);
    if (callbacks) {
      callbacks.forEach(cb => cb(...args));
    }
  }

  _initializeListenersForEvent(eventName) {
    // Prevent re-registering if socket is already listening
    // Note: socket.io doesn't have a simple hasListeners that checks for our specific bounded function,
    // but since we only call this once per eventName in our map, it's safe.
    this.socket.on(eventName, (...args) => {
      this._triggerHandlers(eventName, ...args);
    });
  }

  _initializeListeners() {
    // Extract all values from the nested EVENTS object
    const extractEvents = (obj) => {
      let events = [];
      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          events = events.concat(extractEvents(obj[key]));
        } else {
          events.push(obj[key]);
        }
      }
      return events;
    };

    const allEvents = extractEvents(EVENTS);
    
    // Initialize standard connection events
    const standardEvents = ["connect", "disconnect", "connect_error"];
    
    allEvents.forEach(eventName => {
      // Don't re-register standard events
      if (!standardEvents.includes(eventName)) {
         this.handlers.set(eventName, new Set());
         this._initializeListenersForEvent(eventName);
      }
    });
  }

  // Hook entrypoint
  subscribe(eventName, callback) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
      this._initializeListenersForEvent(eventName); 
    }
    this.handlers.get(eventName).add(callback);
    return () => this.unsubscribe(eventName, callback);
  }

  unsubscribe(eventName, callback) {
    if (this.handlers.has(eventName)) {
      this.handlers.get(eventName).delete(callback);
    }
  }

  emit(eventName, payload) {
    this.socket.emit(eventName, payload);
  }
  
  once(eventName, callback) {
    this.socket.once(eventName, callback);
  }
}

export const socketManager = new SocketManager();
