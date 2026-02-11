import React, { useState } from "react";
import "./style/Loginbox.css";
import { sendJson } from "./helpers";

function RegisterBox({ setCurrentUser, setShowRegister }) {
  const [credentials, setCredentials] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

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
      const data = await sendJson("/api/register", credentials);
      console.log("Registration successful:", data);
      setCurrentUser(data.user);
      setShowRegister(false);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="loginback" onClick={() => setShowRegister(false)}>
      <div className="loginbox" onClick={(e) => e.stopPropagation()}>
        <h2>Register</h2>

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
            <label htmlFor="email">email</label>
            <input
              id="email"
              name="email"
              type="text"
              value={credentials.email}
              onChange={handleChange}
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
            Register New User
          </button>
          {error && <div className="error-message">{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default RegisterBox;
