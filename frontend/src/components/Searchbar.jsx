import React, { useState, useEffect } from "react";
import { useSocket } from "./WebSocketContext"; // ← NEW
import { useNavigate } from "react-router-dom";

export default function Searchbar() {
  const { sendJsonMessage, lastJsonMessage } = useSocket(); // ← NEW
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!lastJsonMessage) return;
    console.log(lastJsonMessage);
    const { action, payload } = lastJsonMessage;

    switch (action) {
      case "search":
        if (payload === "") {
          break;
        }
        navigate(payload);
    }
  }, [lastJsonMessage, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendJsonMessage({
      action: "search",
      payload: { term: query },
    });
  };

  return (
    <form
      className="search"
      onSubmit={handleSubmit}
      style={{ display: "flex", gap: "8px" }}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="username or album code"
      />
      <button className="btn" type="submit">
        Go
      </button>
    </form>
  );
}
