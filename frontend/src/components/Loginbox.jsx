import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./style/Loginbox.css";
import { sendJson } from "./helpers";
// import { useSocket } from "./WebSocketContext"; // ← socket

function Loginbox({ setCurrentUser, setShowLogin }) {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  // const { sendJsonMessage, lastJsonMessage } = useSocket(); // ← socket

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = await sendJson("/api/login", credentials);
      console.log("Login successful:");
      setCurrentUser(data.user);
      localStorage.setItem("user", data.user);
      setShowLogin(false);

      const uuidData = await sendJson("/api/generate-wssecret", {});
      localStorage.setItem("wssecret", uuidData.wssecret);


      if (location.pathname === "/") {
        navigate(`/user/${data.user}`);
      }
      else {
        window.location.reload();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="loginback" onClick={() => setShowLogin(false)}>
      <div className="loginbox" onClick={(e) => e.stopPropagation()}>
        <h2>Login</h2>

        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={credentials.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </div>
          <button className="btn" type="submit">
            Log In
          </button>
          {error && <div className="error-message">{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default Loginbox;
