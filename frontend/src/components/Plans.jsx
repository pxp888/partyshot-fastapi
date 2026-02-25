import React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { receiveJson } from "./helpers";
import StripePricingTable from "./stripe/StripePricingTable";
import "./style/Plans.css";

function Plans() {
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    receiveJson("/api/protected")
      .then((data) => {
        // console.log("Logged in:", data);
        if (data.user_info) {
          setUserInfo(data.user_info);
        }
      })
      .catch((err) => {
        // console.error("Logged out:", err);
        setUserInfo(null);
      });
  }, []);

  return (
    <div className="plans-page">
      {/* Hero Section */}
      <section className="plans-hero">
        <div className="hero-content">
          <h1>
            Ready to <span className="accent-text">Level Up?</span>
          </h1>
          <p className="hero-snarky">
            (because storage shouldn't be your bottleneck)
          </p>
          <p className="hero-subtext">
            Choose the perfect plan for your memories. From casual sharing to
            professional-grade collections, we've got you covered.
          </p>
        </div>
      </section>

      {/* Pricing Table Section */}
      <section className="pricing-section">
        <div className="pricing-container">
          <StripePricingTable
            userEmail={userInfo?.email}
            userId={userInfo?.username}
          />
        </div>
      </section>

      <footer className="welcome-footer">
        <nav className="footer-nav">
          <Link to="/how-it-works">How It Works</Link>
          <Link to="/contact">Contact</Link>
          <a
            href="https://github.com/pxp888/partyshot-fastapi"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
        <p className="footer-copy">
          &copy; {new Date().getFullYear()} shareShot.eu
        </p>
      </footer>
    </div>
  );
}

export default Plans;

