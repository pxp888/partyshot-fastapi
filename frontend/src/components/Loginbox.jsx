import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./style/Loginbox.css";
import { sendJson } from "./helpers";

function Loginbox({ setCurrentUser, setShowLogin }) {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
    if (successMessage) setSuccessMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    try {
      if (showForgotPassword) {
        await sendCode();
      } else {
        const data = await sendJson("/api/login", credentials);
        console.log("Login successful:");
        setCurrentUser(data.user);
        localStorage.setItem("user", data.user);
        setShowLogin(false);

        const uuidData = await sendJson("/api/generate-wssecret", {});
        localStorage.setItem("wssecret", uuidData.wssecret);

        if (location.pathname === "/") {
          navigate(`/user/${data.user}`);
        } else {
          window.location.reload();
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const sendCode = async () => {
    setError("");
    try {
      const data = await sendJson("/api/send-reset-code", {
        username: credentials.username,
      });
      console.log("Reset code sent successfully");
      setShowForgotPassword(false);
      setResetEmail("");
      setCredentials({ ...credentials, username: "" }); // clear username field
      // setSuccessMessage(
      //   <span>
      //     Reset code sent! <Link to="/recover">Click here to reset</Link>
      //   </span>
      // );
      window.location.href = "/recover";
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="loginback" onClick={() => setShowLogin(false)}>
      <div className="loginbox" onClick={(e) => e.stopPropagation()}>
        <h2>{showForgotPassword ? "Reset Password" : "Login"}</h2>

        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
          {!showForgotPassword ? (
            <>
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
            </>
          ) : (
            <>
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


              <button className="btn" type="submit">
                Send Code
              </button>
            </>
          )}
          <a
            className="forgotButton"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setShowForgotPassword(!showForgotPassword);
              setSuccessMessage("");
              setError("");
            }}
          >
            {showForgotPassword ? "Back to Login" : "(forgot password)"}
          </a>
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}
        </form>
      </div>
    </div>
  );
}

export default Loginbox;
