import React, { useState } from "react";
import Loginbox from "./Loginbox";

import "./style/Topbar.css";

function Topbar() {
  const [showLogin, setShowLogin] = useState(false);

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  return (
    <div className="topbar">
      <div className="topLeft">
        <a href="/">Logo here</a>
      </div>
      <div className="nav">
        <p onClick={handleLoginClick}>Login</p>
        <p>Register</p>
      </div>
      {showLogin && <Loginbox setShowLogin={setShowLogin} />}
    </div>
  );
}

export default Topbar;
