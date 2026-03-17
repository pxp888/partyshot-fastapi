import { useState, useEffect, useCallback } from "react";
import Loginbox from "./Loginbox";
import RegisterBox from "./RegisterBox";
import { sendJson, receiveJson } from "./helpers";
import { Link, useNavigate } from "react-router-dom";

import HamburgerMenu from "./HamburgerMenu";
import SlideOutMenu from "./SlideOutMenu";
import "./style/Topbar.css";

function Topbar({ currentUser, setCurrentUser }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [userClass, setUserClass] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const checkSession = useCallback(() => {
    console.log("topbar protect test");
    receiveJson("/api/protected")
      .then((data) => {
        console.log("Logged in:", data);
        if (data.user_info) {
          setCurrentUser(data.user_info.username);
          setUserInfo(data.user_info);
          setUserClass(data.user_info.class);
        } else {
          handleLogout();
        }
      })
      .catch((err) => {
        console.error("Logged out:", err);
        handleLogout();
      });
  }, [setCurrentUser]);

  useEffect(() => {
    checkSession();
  }, [setCurrentUser]); // Test protected route on mount

  useEffect(() => {
    const handleWakeup = () => {
      if (document.visibilityState === "visible") {
        console.log("Page wakeup/visible: checking session");
        checkSession();
      }
    };

    window.addEventListener("visibilitychange", handleWakeup);
    window.addEventListener("focus", handleWakeup);

    return () => {
      window.removeEventListener("visibilitychange", handleWakeup);
      window.removeEventListener("focus", handleWakeup);
    };
  }, [checkSession]);

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

  async function handleLogout() {
    const token = localStorage.getItem("access_token");
    try {
      if (token) await fetch("/api/logout", { method: "POST" });
    } catch (e) {
      console.warn("Backend logout failed", e);
    }
    setCurrentUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("wssecret");
    localStorage.removeItem("user");
    if (token) window.location.reload();
  }

  return (
    <>
      <div className="topbar">
        <div className="topLeft">
          <Link to="/">
            shareShot<span className="title-suffix">.eu</span>
          </Link>
        </div>
        <div className="top-actions">
          {currentUser ? (
            <button
              className="btn topbar-btn"
              // onClick={() => navigate(`/user/${currentUser}`)}
              onClick={() => window.location.href = `/user/${currentUser}`}
            >
              {currentUser}
            </button>
          ) : (
            <>
              <button className="btn topbar-btn" onClick={() => setShowLogin(true)}>
                Login
              </button>
              <button
                className="btn topbar-btn register-btn"
                onClick={() => setShowRegister(true)}
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>

      <HamburgerMenu isOpen={isMenuOpen} toggle={() => setIsMenuOpen(!isMenuOpen)} />

      <SlideOutMenu
        isOpen={isMenuOpen}
        close={() => setIsMenuOpen(false)}
        currentUser={currentUser}
        handleLogout={handleLogout}
        setShowLogin={setShowLogin}
        setShowRegister={setShowRegister}
      />

      {showLogin && (
        <Loginbox setCurrentUser={setCurrentUser} setShowLogin={setShowLogin} />
      )}
      {showRegister && (
        <RegisterBox
          setCurrentUser={setCurrentUser}
          setShowRegister={setShowRegister}
        />
      )}
    </>
  );
}

export default Topbar;
