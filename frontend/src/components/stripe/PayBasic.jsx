import React from 'react';
import Stripe1 from './Stripe1';
import "./PayBasic.css";

const PayBasic = () => {
  return (
    <div className="pay-basic-page">
      <div className="pay-container glass">
        <div className="pay-info">
          <h1 className="pay-title">
            Complete your <span className="accent-text">Upgrade</span>
          </h1>
          <p className="pay-subtitle">Basic Membership</p>

          <div className="checkout-summary">
            <div className="current-plan-card">
              <div className="plan-label">Selected Plan</div>
              <div className="plan-main-info">
                <span className="plan-name">Basic</span>
                <span className="plan-price">€9.99<small>/mo</small></span>
              </div>
              <ul className="plan-features-list">
                <li>
                  <span className="icon">✓</span>
                  <span><strong>20 GB</strong> Secure Cloud Storage</span>
                </li>
                <li>
                  <span className="icon">✓</span>
                  <span><strong>4K</strong> Ultra HD Playback</span>
                </li>
                <li>
                  <span className="icon">✓</span>
                  <span>Premium Priority Support</span>
                </li>
              </ul>
            </div>
            <p className="trusted-badge">
              🔐 Secure Payment via Stripe
            </p>
          </div>
        </div>

        <div className="pay-form-wrapper">
          <div className="form-inner">
            <Stripe1 />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayBasic;
