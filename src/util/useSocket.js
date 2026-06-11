import React, { useEffect, useRef } from "react";
import { socketManager } from "../services/websocket/socketManager";

const useSocket = (eventHandlers = {}) => {
  const handlersRef = useRef(eventHandlers);

  // Keep handlers fresh without causing re-subscribes
  useEffect(() => {
    handlersRef.current = eventHandlers;
  }, [eventHandlers]);

  useEffect(() => {
    const unsubscribers = [];

    // Register generic wrappers that call the latest handler from the ref
    Object.keys(eventHandlers).forEach((eventName) => {
      const wrapper = (...args) => {
        if (handlersRef.current[eventName]) {
          handlersRef.current[eventName](...args);
        }
      };
      
      const unsub = socketManager.subscribe(eventName, wrapper);
      unsubscribers.push(unsub);
    });

    // Cleanup on unmount or when the keys of eventHandlers change
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
    // Only re-run if the *names* of the events we want to listen to change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(eventHandlers).join(",")]);

  const methods = React.useMemo(() => ({
    emit: socketManager.emit.bind(socketManager),
    once: socketManager.once.bind(socketManager),
    connect: socketManager.socket.connect.bind(socketManager.socket),
    disconnect: socketManager.socket.disconnect.bind(socketManager.socket),
  }), []);

  return { 
    ...methods,
    get connected() { return socketManager.socket.connected; },
    get id() { return socketManager.socket.id; }
  };
};

export default useSocket;
