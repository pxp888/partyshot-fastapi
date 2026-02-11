import React, { useState, useEffect, use } from "react";
import Loginbox from "./Loginbox";
import RegisterBox from "./RegisterBox";
import { receiveJson } from "./helpers";

import "./style/Topbar.css";

function Topbar({ currentUser, setCurrentUser }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

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
      });
  }, [setCurrentUser]); // Test protected route on mount

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  return (
    <div className="topbar">
      <div className="topLeft">
        <a href="/">Logo here</a>
      </div>

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
