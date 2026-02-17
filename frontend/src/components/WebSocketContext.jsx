import React, { createContext, useContext, useState } from "react";
import { useMemo } from "react";
import useWebSocket from "react-use-websocket";

const WebSocketContext = createContext(null);
// const socketUrl = `ws://localhost:8000/ws?wssecret=${wssecret}&username=${encodeURIComponent(username)}`;
// const socketUrl = `ws://localhost:8000/ws`;

export const WebSocketProvider = ({ children }) => {
  // Use state to make credentials reactive
  const [credentials, setCredentials] = useState({
    wssecret: localStorage.getItem("wssecret"),
    username: localStorage.getItem("username"),
  });

  // Only create socketUrl if both credentials are present
  const socketUrl = useMemo(() => {
    if (!credentials.wssecret || !credentials.username) return null;
    return `ws://localhost:8000/ws?wssecret=${credentials.wssecret}&username=${encodeURIComponent(credentials.username)}`;
  }, [credentials.wssecret, credentials.username]);

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    socketUrl, // Will be null if credentials are missing
    {
      share: true,
      shouldReconnect: () => true,
    }
  );

  const reconnect = () => {
    // Re-read credentials from localStorage and update state
    // This will trigger a reconnection automatically when socketUrl changes
    setCredentials({
      wssecret: localStorage.getItem("wssecret"),
      username: localStorage.getItem("username"),
    });
  };

  const value = { sendJsonMessage, lastJsonMessage, readyState, reconnect };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
// Custom hook for easy access in other components
export const useSocket = () => useContext(WebSocketContext);
