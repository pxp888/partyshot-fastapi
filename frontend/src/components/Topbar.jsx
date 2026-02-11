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
          <span>Welcome, {currentUser.username}!</span>
          <button onClick={() => setCurrentUser(null)}>Logout</button>
        </div>
      ) : (
        <div className="nav">
          <p onClick={() => setShowLogin(true)}>Login</p>
          <p onClick={() => setShowRegister(true)}>Register</p>
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
