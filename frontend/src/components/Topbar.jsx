import React, { useState } from "react";
import Loginbox from "./Loginbox";
import RegisterBox from "./RegisterBox";

import "./style/Topbar.css";

function Topbar() {
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
      <div className="nav">
        <p onClick={() => setShowLogin(true)}>Login</p>
        <p onClick={() => setShowRegister(true)}>Register</p>
      </div>
      {showLogin && <Loginbox setShowLogin={setShowLogin} />}
      {showRegister && <RegisterBox setShowRegister={setShowRegister} />}
    </div>
  );
}

export default Topbar;
