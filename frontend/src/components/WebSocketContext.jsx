// WebSocketContext.js
import React, { createContext, useContext } from "react";
import useWebSocket from "react-use-websocket";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const wssecret = localStorage.getItem("wssecret");
  const username = localStorage.getItem("username");
  const socketUrl = `ws://localhost:8000/ws?wssecret=${wssecret}&username=${encodeURIComponent(username)}`;
  // const socketUrl = `ws://localhost:8000/ws`;

  // The hook lives here in the Provider
  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    socketUrl,
    {
      share: true, // Crucial: allows multiple components to tap into one socket
      shouldReconnect: () => true,
    },
  );

  const value = { sendJsonMessage, lastJsonMessage, readyState };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook for easy access in other components
export const useSocket = () => useContext(WebSocketContext);
