import { useState, useEffect } from "react";
import Loginbox from "./Loginbox";
import RegisterBox from "./RegisterBox";
import { sendJson, receiveJson } from "./helpers";
// import { useSocket } from "./WebSocketContext"; // ← NEW
// import { useNavigate } from "react-router-dom";

import Searchbar from "./Searchbar";
import "./style/Topbar.css";

function Topbar({ currentUser, setCurrentUser }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  // const { sendJsonMessage, lastJsonMessage } = useSocket(); // ← websocket
  // const navigate = useNavigate();

  useEffect(() => {
    console.log("topbar protect test");
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
      });
  }, [setCurrentUser]); // Test protected route on mount

  /* ---- Keep‑alive logic ---- */
  useEffect(() => {
    // Only run if we have a refresh token (user is logged in)
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return;

    // Call /api/refresh every 9 minutes (less than the default 15 min expiry)
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

          const uuidData = await sendJson("/api/generate-wssecret", {}); // socket secret
          localStorage.setItem("wssecret", uuidData.wssecret); // socket secret
        } catch (e) {
          console.warn("Keep‑alive failed, logging out", e);
          // Token chain is broken – log the user out
          handleLogout();
        }
      },
      5 * 60 * 1000,
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
    // navigate("/");
  }

  return (
    <div className="topbar">
      <div className="topLeft">
        <a href="/">shareShot<span className="title-suffix">.eu</span></a>
      </div>

      <Searchbar className="search" />
      {currentUser ? (
        <div className="userInfo">
          <button
            className="btn"
            onClick={() => (window.location.href = `/user/${currentUser}`)}
          >
            {currentUser} home
          </button>
          <button
            className="btn"
            onClick={() => (window.location.href = "/account")}
          >
            Account
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
