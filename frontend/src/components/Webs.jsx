import React, { useState, useCallback, useEffect } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

const Webs = () => {
  const [socketUrl] = useState("ws://localhost:8000/ws");
  const [messageHistory, setMessageHistory] = useState([]);

  // The hook handles the connection lifecycle automatically
  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
    onOpen: () => console.log("Connected to FastAPI"),
    shouldReconnect: (closeEvent) => true, // Auto-reconnect on disconnect
  });

  // Update history whenever a new message arrives
  useEffect(() => {
    if (lastMessage !== null) {
      setMessageHistory((prev) => prev.concat(lastMessage.data));
    }
  }, [lastMessage]);

  // Connection status mapping
  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting...",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing...",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  const handleClickSendMessage = useCallback(() => {
    sendMessage("Hello from React!");
  }, [sendMessage]);

  return (
    <div>
      <h3>Connection Status: {connectionStatus}</h3>
      <button
        onClick={handleClickSendMessage}
        disabled={readyState !== ReadyState.OPEN}
      >
        Send "Hello" to FastAPI
      </button>

      <ul>
        {messageHistory.map((message, idx) => (
          <li key={idx}>{message}</li>
        ))}
      </ul>
    </div>
  );
};

export default Webs;
