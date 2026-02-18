// WebSocketContext.js
import React, { createContext, useContext } from "react";
import useWebSocket from "react-use-websocket";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  // const socketUrl = "ws://51.20.201.88/ws";
  // const socketUrl = "ws://192.168.0.225:8000/ws";
  const socketUrl = import.meta.env.VITE_WS_URL;


  const {
    sendJsonMessage: _sendJsonMessage,
    lastJsonMessage,
    readyState,
  } = useWebSocket(socketUrl, {
    share: true,
    shouldReconnect: () => true,
  });

  const sendJsonMessage = React.useCallback((message) => {
    const wrappedMessage = {
      ...message,
      wssecret: localStorage.getItem("wssecret"),
    };
    _sendJsonMessage(wrappedMessage);
  }, [_sendJsonMessage]);

  const value = React.useMemo(() => ({
    sendJsonMessage,
    lastJsonMessage,
    readyState,
  }), [sendJsonMessage, lastJsonMessage, readyState]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};


export const useSocket = () => useContext(WebSocketContext);
