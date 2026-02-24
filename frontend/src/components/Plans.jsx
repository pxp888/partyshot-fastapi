import React from "react";
import { Link } from "react-router-dom";
import "./style/Plans.css";

function Plans() {
  const plansData = [
    {
      name: "Free",
      storage: "500 MB",
      video: "Limited",
      price: "Free",
      isPopular: false,
    },
    {
      name: "Starter",
      storage: "5 GB",
      video: "HD",
      price: "€4.99",
      isPopular: false,
    },
    {
      name: "Basic",
      storage: "20 GB",
      video: "4K",
      price: "€9.99",
      isPopular: false,
    },
    {
      name: "Pro",
      storage: "100 GB",
      video: "Unlimited",
      price: "€19.99",
      isPopular: false,
    },
  ];

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
              <div className="cell label-cell">Video Playback</div>
              <div className="cell label-cell">Monthly Cost</div>
              <div className="cell label-cell cell-footer"></div>
            </div>

            <div className="plans-scroll-area">
              {plansData.map((plan, index) => (
                <div key={index} className={`plan-column ${plan.isPopular ? 'popular' : ''}`}>
                  {plan.isPopular && <div className="popular-badge">Best Value</div>}
                  <div className="cell data-cell cell-header">
                    <span className="plan-name">{plan.name}</span>
                  </div>
                  <div className="cell data-cell">{plan.storage}</div>
                  <div className="cell data-cell">{plan.video}</div>
                  <div className="cell data-cell">
                    <span className="plan-price">{plan.price}</span>
                  </div>
                  <div className="cell data-cell cell-footer">
                    {plan.price === "Free" ? (
                      <Link to="/" className="subscribe-button secondary">Get Started</Link>
                    ) : (
                      <button className="subscribe-button">Subscribe</button>
                    )}
                  </div>
                </div>
              ))}
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

