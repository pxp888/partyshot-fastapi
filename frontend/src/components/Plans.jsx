import React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { receiveJson } from "./helpers";
import StripePricingTable from "./stripe/StripePricingTable";
import ManageBilling from "./stripe/ManageBilling";
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

      {/* Comparison Table Section - Always Visible */}
      <section className="comparison-section" style={{ marginBottom: "40px" }}>
        <div className="pricing-container">
          <div className="comparison-table">
            <div className="labels-column">
              <div className="cell label-cell cell-header">Plans & Specs</div>
              <div className="cell label-cell">Total Storage</div>
              <div className="cell label-cell">Public Albums</div>
              <div className="cell label-cell">Hidden Albums</div>
              <div className="cell label-cell">Private Albums</div>
              <div className="cell label-cell">Price</div>
            </div>
            <div className="plans-scroll-area">
              {[
                {
                  name: "Free",
                  storage: "1 GB",
                  publicAlbums: "Yes",
                  hiddenAlbums: "Yes",
                  privateAlbums: "No",
                  price: "Free",
                },
                {
                  name: "Starter",
                  storage: "10 GB",
                  publicAlbums: "Yes",
                  hiddenAlbums: "Yes",
                  privateAlbums: "Yes",
                  price: "50 SEK/mo",
                },
                {
                  name: "Basic",
                  storage: "50 GB",
                  publicAlbums: "Yes",
                  hiddenAlbums: "Yes",
                  privateAlbums: "Yes",
                  price: "100 SEK/mo",
                },
                {
                  name: "Pro",
                  storage: "250 GB",
                  publicAlbums: "Yes",
                  hiddenAlbums: "Yes",
                  privateAlbums: "Yes",
                  price: "200 SEK/mo",
                },
              ].map((plan, idx) => (
                <div
                  key={idx}
                  className={`plan-column ${plan.popular ? "popular" : ""}`}
                >
                  {plan.popular && (
                    <div className="popular-badge">Most Popular</div>
                  )}
                  <div className="cell cell-header">
                    <div className="plan-name">{plan.name}</div>
                  </div>
                  <div className="cell data-cell">{plan.storage}</div>
                  <div className="cell data-cell">{plan.publicAlbums}</div>
                  <div className="cell data-cell">{plan.hiddenAlbums}</div>
                  <div className="cell data-cell">{plan.privateAlbums}</div>
                  <div className="cell data-cell">{plan.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Conditional pricing actions based on user status */}
      {(!userInfo || userInfo?.class?.toLowerCase() === "free") ? (
        <section className="pricing-section">
          <div className="pricing-container">
            {userInfo ? (
              <StripePricingTable
                userEmail={userInfo?.email}
                userId={userInfo?.username}
              />
            ) : (
              <div className="login-required-overlay">
                <div className="auth-card">
                  <Link to="/" className="subscribe-button">
                    Log in or Register to get started
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="pricing-section">
          <div className="pricing-container" style={{ textAlign: "center", padding: "40px" }}>
            <div className="auth-card">
              <h3>Subscription Active</h3>
              <p>You are currently on the <strong>{userInfo.class}</strong> plan. You can manage your subscription and billing details below.</p>
              <ManageBilling />
            </div>
          </div>
        </section>
      )}

      <footer className="welcome-footer">
        <nav className="footer-nav">
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

