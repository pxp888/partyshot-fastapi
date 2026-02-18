// WebSocketContext.js
import React, { createContext, useContext } from "react";
import useWebSocket from "react-use-websocket";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  // const socketUrl = "ws://51.20.201.88/ws";
  // const socketUrl = "ws://192.168.0.225:8000/ws";
  const socketUrl = import.meta.env.VITE_WS_URL;

  // Hook that gives us the raw sendJsonMessage
  const {
    sendJsonMessage: _sendJsonMessage,
    lastJsonMessage,
    readyState,
  } = useWebSocket(socketUrl, {
    share: true, // allows multiple components to share the same socket
    shouldReconnect: () => true,
  });

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
