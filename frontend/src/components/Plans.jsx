import React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { receiveJson } from "./helpers";
import StripePricingTable from "./stripe/StripePricingTable";
import ManageBilling from "./stripe/ManageBilling";
import "./style/Plans.css";
import Footer from "./Footer";

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
        <h3 className="t1">STORAGE PLANS</h3>
        <h1>
          {/* Ready to <span className="accent-text">Level Up?</span> */}
          Ready to level up?
        </h1>
        <p className="hero-snarky">
          {/* (because storage shouldn't be your bottleneck) */}
        </p>
        <p className="hero-subtext">
          Choose the perfect plan for your memories. From casual sharing to
          professional-grade collections, we've got you covered.
        </p>
      </section>

      {/* Pricing and Comparison Section */}
      <section className="pricing-section">
        <div className="pricing-container">
          <table className="plans-simple-table">
            <thead>
              <tr>
                <th>Storage</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Free", storage: "1 GB", price: "Free" },
                { name: "Starter", storage: "10 GB", price: "50 SEK/mo" },
                { name: "Basic", storage: "50 GB", price: "100 SEK/mo" },
                { name: "Pro", storage: "250 GB", price: "200 SEK/mo" },
              ].map((plan, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="plan-info">
                      <span className="plan-name-tag">{plan.name}</span>
                      <span className="plan-storage-value">{plan.storage}</span>
                    </div>
                  </td>
                  <td className="plan-price-value">{plan.price}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Conditional pricing actions based on user status */}
          <div className="pricing-actions">
            {(!userInfo || userInfo?.class?.toLowerCase() === "free") ? (
              <div className="pricing-wrapper">
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
            ) : (
              <div className="status-wrapper" style={{ textAlign: "center", padding: "40px" }}>
                <div className="auth-card">
                  <h3>Subscription Active</h3>
                  <p>You are currently on the <strong>{userInfo.class}</strong> plan. You can manage your subscription and billing details below.</p>
                  <ManageBilling />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Plans;
