// WebSocketContext.js
import React, { createContext, useContext } from "react";
import useWebSocket from "react-use-websocket";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const socketUrl = "ws://localhost:8000/ws";

  // Hook that gives us the raw sendJsonMessage
  const {
    sendJsonMessage: _sendJsonMessage,
    lastJsonMessage,
    readyState,
  } = useWebSocket(socketUrl, {
    share: true, // allows multiple components to share the same socket
    shouldReconnect: () => true,
  });

  /**
   * Wrapper that injects a `context` property into the JSON payload.
   * It has **exactly** the same name (`sendJsonMessage`) as the original
   * function, so callers don’t need to change anything.
   *
   * @param {Object} message  – Original message payload.
   * @param {any}    ctx      – Context you want to attach.
   */
  // const sendJsonMessage = (message, ctx) => {
  //   const wrappedMessage = { ...message, context: ctx };
  //   _sendJsonMessage(wrappedMessage);

  const sendJsonMessage = (message) => {
    const wrappedMessage = {
      ...message,
      wssecret: localStorage.getItem("wssecret"),
    };
    _sendJsonMessage(wrappedMessage);
  };

  const value = {
    sendJsonMessage, // <- exposed wrapper (same API as before)
    lastJsonMessage,
    readyState,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook for easy access in other components
export const useSocket = () => useContext(WebSocketContext);
