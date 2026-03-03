// fast1/frontend/src/components/Policypage.jsx

import React from "react";
import "./style/Policypage.css";

function Policypage() {
  return (
    <section className="policy-page">
      <h1>Privacy Policy</h1>

      <h2>1. Data Controller</h2>
      <p>
        The responsible party for your data is <strong>[Your Name]</strong>,
        operating as a sole proprietorship (<em>enskild firma</em>) in Sweden.
      </p>
      <ul>
        <li>
          <strong>Org. nr:</strong> [Your Personnummer]
        </li>
        <li>
          <strong>Contact:</strong> <a href="mailto:[Your Email]">[Your Email]</a>
        </li>
      </ul>

      <h2>2. How We Secure Your Photos (The UUID System)</h2>
      <p>
        We take a "Privacy by Design" approach to your content. To ensure
        high performance while maintaining privacy:
      </p>
      <ul>
        <li>
          <strong>Obfuscated Paths:</strong> Your photos are stored using
          non‑sequential, randomly generated unique identifiers (UUIDs). This
          prevents "guessing" of URLs.
        </li>
        <li>
          <strong>Access Control:</strong> While paths are obfuscated for
          sharing purposes, our server validates your <em>Session Cookie</em>{" "}
          before granting access to your private account dashboard and
          management tools.
        </li>
        <li>
          <strong>Infrastructure:</strong> All data is hosted on{" "}
          <strong>AWS</strong>. We utilize the{" "}
          <strong>Stockholm Region (eu‑north‑1)</strong> to ensure your data
          remains within the EEA, complying with GDPR data residency standards.
        </li>
      </ul>

      <h2>3. Cookies</h2>
      <p>
        We keep it simple. We do not use tracking or marketing cookies.
      </p>
      <ul>
        <li>
          <strong>Strictly Necessary Session Cookies:</strong> These are used
          solely to keep you logged in and to authorize your requests. Because
          these are essential for the service you requested, they do not
          require a "Reject" option under the ePrivacy Directive, but we list
          them here for full transparency.
        </li>
      </ul>

      <h2>4. Your Rights (The Swedish Context)</h2>
      <p>
        Under GDPR and the Swedish Data Act, you have the right to:
      </p>
      <ul>
        <li>
          <strong>Access & Export:</strong> Download all photos you have
          uploaded at any time.
        </li>
        <li>
          <strong>Erasure (Right to be Forgotten):</strong> When you delete a
          photo or your account, we trigger an immediate deletion from our
          S3 storage and an invalidation of the content on our CDN
          (CloudFlare).
        </li>
        <li>
          <strong>Withdrawal (New for 2026):</strong> In accordance with the
          <em>Distance Contracts Act</em>, you may withdraw from any paid
          subscription within 14 days by clicking the "Withdraw from Contract"
          button in your account settings.
        </li>
      </ul>

      <h2>5. Supervisory Authority</h2>
      <p>
        If you believe we are mishandling your data, you have the right to file
        a complaint with <strong>Integritetsskyddsmyndigheten (IMY)</strong> at{" "}
        <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer">
          https://www.imy.se
        </a>
        .
      </p>
    </section>
  );
}

export default Policypage;
