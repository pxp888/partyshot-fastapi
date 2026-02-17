import { useState, useEffect } from "react";
import Loginbox from "./Loginbox";
import RegisterBox from "./RegisterBox";
import { receiveJson } from "./helpers";
import { useSocket } from "./WebSocketContext"; // ← NEW
import { useNavigate } from "react-router-dom";

import Searchbar from "./Searchbar";
import "./style/Topbar.css";

function Topbar({ currentUser, setCurrentUser }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const { reconnect } = useSocket(); // ← NEW
  const navigate = useNavigate();

  useEffect(() => {
    receiveJson("/api/protected")
      .then((data) => {
        console.log("Logged in:", data);
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch((err) => {
        console.error("Logged out:", err);
        setCurrentUser(null);
        reconnect();
      });
  }, [setCurrentUser]); // Test protected route on mount

  /* ---- Keep‑alive logic ---- */
  useEffect(() => {
    // Only run if we have a refresh token (user is logged in)
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return;

    // Call /api/refresh every 12 minutes (less than the default 15 min expiry)
    const intervalId = setInterval(
      async () => {
        try {
          const resp = await fetch("/api/refresh", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          });

          if (!resp.ok) throw new Error("Refresh failed");

          const data = await resp.json();
          localStorage.setItem("access_token", data.access_token);
          console.log("Refreshed access token");
        } catch (e) {
          console.warn("Keep‑alive failed, logging out", e);
          // Token chain is broken – log the user out
          handleLogout();
        }
      },
      10 * 60 * 1000,
    );

    // Clean up when component unmounts
    return () => clearInterval(intervalId);
  }, []); // Only once on mount

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("wssecret");
    localStorage.removeItem("username");
    reconnect();
    // navigate("/");
  }

  return (
    <div className="topbar">
      <div className="topLeft">
        <a href="/">partyShots</a>
      </div>

      <Searchbar />
      {currentUser ? (
        <div className="userInfo">
          <button
            className="btn"
            onClick={() => (window.location.href = `/user/${currentUser}`)}
          >
            {currentUser} home
          </button>
          <button className="btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      ) : (
        <div className="nav">
          <button className="btn" onClick={() => setShowLogin(true)}>
            Login
          </button>
          <button className="btn" onClick={() => setShowRegister(true)}>
            Register
          </button>
        </div>
      )}

      {showLogin && (
        <Loginbox setCurrentUser={setCurrentUser} setShowLogin={setShowLogin} />
      )}
      {showRegister && (
        <RegisterBox
          setCurrentUser={setCurrentUser}
          setShowRegister={setShowRegister}
        />
      )}
    </div>
  );
}

export default Topbar;
