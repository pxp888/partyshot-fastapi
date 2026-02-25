import React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { receiveJson } from "./helpers";
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
          <div className="comparison-table">
            <div className="labels-column">
              <div className="cell label-cell cell-header">Plan</div>
              <div className="cell label-cell">Storage</div>
              <div className="cell label-cell">Monthly Cost</div>
              <div className="cell label-cell cell-footer"></div>
            </div>

            <div className="plans-scroll-area">
              <div className="plan-column">
                <div className="cell data-cell cell-header">
                  <span className="plan-name">Free</span>
                </div>
                <div className="cell data-cell">500 MB</div>
                <div className="cell data-cell">
                  <span className="plan-price">Free</span>
                </div>
                <div className="cell data-cell cell-footer">
                  {userInfo ? (
                    <Link to="/" className="subscribe-button secondary">
                      Get Started
                    </Link>
                  ) : (
                    <span className="login-prompt">
                      Login or register to get started
                    </span>
                  )}
                </div>
              </div>

              <div className="plan-column">
                <div className="cell data-cell cell-header">
                  <span className="plan-name">Starter</span>
                </div>
                <div className="cell data-cell">5 GB</div>
                <div className="cell data-cell">
                  <span className="plan-price">€4.99</span>
                </div>
                <div className="cell data-cell cell-footer">
                  {userInfo ? (
                    <button className="subscribe-button">Subscribe</button>
                  ) : (
                    <span className="login-prompt">
                      Login or register to get started
                    </span>
                  )}
                </div>
              </div>

              <div className="plan-column">
                <div className="cell data-cell cell-header">
                  <span className="plan-name">Basic</span>
                </div>
                <div className="cell data-cell">20 GB</div>
                <div className="cell data-cell">
                  <span className="plan-price">€9.99</span>
                </div>
                <div className="cell data-cell cell-footer">
                  {userInfo ? (
                    <button
                      className="subscribe-button"
                      onClick={() => navigate("/basic")}
                    >
                      Subscribe
                    </button>
                  ) : (
                    <span className="login-prompt">
                      Login or register to get started
                    </span>
                  )}
                </div>
              </div>

              <div className="plan-column">
                <div className="cell data-cell cell-header">
                  <span className="plan-name">Pro</span>
                </div>
                <div className="cell data-cell">100 GB</div>
                <div className="cell data-cell">
                  <span className="plan-price">€19.99</span>
                </div>
                <div className="cell data-cell cell-footer">
                  {userInfo ? (
                    <button className="subscribe-button">Subscribe</button>
                  ) : (
                    <span className="login-prompt">
                      Login or register to get started
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
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

