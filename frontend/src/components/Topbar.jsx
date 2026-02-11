import React, { useState } from "react";
import Loginbox from "./Loginbox";
import RegisterBox from "./RegisterBox";

import "./style/Topbar.css";

function Topbar({ currentUser, setCurrentUser }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // const handleLoginClick = () => {
  //   setShowLogin(true);
  // };

  return (
    <div className="topbar">
      <div className="topLeft">
        <a href="/">Logo here</a>
      </div>

      {currentUser ? (
        <div className="userInfo">
          <span>home {currentUser}</span>
          <button className="btn" onClick={() => setCurrentUser(null)}>
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
