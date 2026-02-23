import React from "react";
import { Link } from "react-router-dom";
import "./style/Plans.css";

function Plans() {
  return (
    <div className="plans-page">
      {/* Hero Section */}
      <section className="plans-hero">
        <h1>
          Choose Your <span className="accent-text">Plan</span>,
        </h1>
        <p className="hero-snarky">
          (because we want to make sharing easy for everyone)
        </p>
        <p className="hero-subtext">
          We have three plan levels for you to choose what suits your needs
          best.
        </p>
      </section>

      {/* Pricing Table Section */}
      <section className="pricing-table">
        <div className="pricing-table-container">
          <div className="pricing-table-header">
            <h2>Storage & Features</h2>
          </div>

          <div className="pricing-table-content">
            <div className="pricing-table-row">
              <div className="pricing-table-cell header-cell">Level</div>
              <div className="pricing-table-cell header-cell">Free</div>
              <div className="pricing-table-cell header-cell">Starter</div>
              <div className="pricing-table-cell header-cell">Basic</div>
              <div className="pricing-table-cell header-cell">Pro</div>
            </div>

            <div className="pricing-table-row">
              <div className="pricing-table-cell feature-cell">
                Storage Space
              </div>
              <div className="pricing-table-cell">2 GB</div>
              <div className="pricing-table-cell">100 GB</div>
              <div className="pricing-table-cell">1 TB</div>
              <div className="pricing-table-cell">2 TB+</div>
            </div>

            <div className="pricing-table-row">
              <div className="pricing-table-cell feature-cell">
                Video Playback
              </div>
              <div className="pricing-table-cell">-</div>
              <div className="pricing-table-cell">Yes</div>
              <div className="pricing-table-cell">Yes</div>
              <div className="pricing-table-cell">Yes</div>
            </div>

            <div className="pricing-table-row">
              <div className="pricing-table-cell feature-cell">
                Monthly Cost
              </div>
              <div className="pricing-table-cell">0</div>
              <div className="pricing-table-cell">
                <strong>5</strong> Euro
              </div>
              <div className="pricing-table-cell">
                <strong>10</strong> Euro
              </div>
              <div className="pricing-table-cell">
                <strong>15</strong> Euro
              </div>
            </div>

            <div className="pricing-table-row">
              <div className="pricing-table-cell feature-cell">Subscribe</div>
              <div className="pricing-table-cell">
                <button className="subscribe-button">Select</button>
              </div>
              <div className="pricing-table-cell">
                <button className="subscribe-button">Select</button>
              </div>
              <div className="pricing-table-cell">
                <button className="subscribe-button">Select</button>
              </div>
              <div className="pricing-table-cell">
                <button className="subscribe-button">Select</button>
              </div>
            </div>
          </div>

          <div className="pricing-table-footer">
            <p>
              * At the <strong>Pro</strong> tier storage consumed above plan
              levels will be charged at our best estimation of actual cost.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {/* <section className="plans-cta">
        <h2>Start your collection today.</h2>
        <p>Join thousands of users sharing their best moments on shareShot.</p>
        <Link to="/" className="plans-button">
          Get Started for Free
        </Link>
      </section>*/}

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
