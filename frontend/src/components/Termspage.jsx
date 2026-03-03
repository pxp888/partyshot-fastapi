import React from "react";
import "./style/Policypage.css";

function Termspage() {
  return (
    <section className="policy-page">
      <h1>Terms of Service</h1>

      <h2>1. Identity & Contact (The "Impressum")</h2>
      <p>
        <strong>Contracting Party:</strong> This service is provided by{" "}
        <strong>[Your Name/Business Name]</strong>, registered as a sole
        proprietorship (<em>enskild firma</em>) in Sweden.
      </p>
      <ul>
        <li>
          <strong>Org. Number:</strong> [Your Personnummer or Org. Number]
        </li>
        <li>
          <strong>Address:</strong> [Your Swedish Business Address]
        </li>
        <li>
          <strong>Email:</strong>{" "}
          <a href="mailto:[Your Support Email]">[Your Support Email]</a>
        </li>
      </ul>

      <h2>2. User Content & Licensing</h2>
      <ul>
        <li>
          <strong>Ownership:</strong> Users retain full ownership and copyright
          of the photos they upload.
        </li>
        <li>
          <strong>License Grant:</strong> By uploading, the user grants you a
          non‑exclusive, worldwide, royalty‑free license to host, store, and
          display the content for the purpose of providing the service.
        </li>
        <li>
          <strong>Third‑Party Rights:</strong> Users must warrant that they have
          the consent of any identifiable people in the photos (crucial for GDPR
          compliance).
        </li>
      </ul>

      <h2>3. The "Illegal Content" Clause (DSA 2026)</h2>
      <ul>
        <li>
          <strong>Reporting:</strong> We provide a "Contact" link at the top of
          the page where users can report illegal content. This is a DSA
          requirement for reporting illegal content.
        </li>
        <li>
          <strong>Moderation:</strong> We reserve the right to remove content
          that violates Swedish or EU law (e.g., hate speech, CSAM, copyright
          infringement) without prior notice.
        </li>
        <li>
          <strong>Statement of Reasons:</strong> If a user’s photo is removed or
          they are banned, we provide a brief “Statement of Reasons” explaining
          why, in compliance with the DSA.
        </li>
      </ul>

      <h2>4. Payments & The "Withdrawal Button"</h2>
      <ul>
        <li>
          <strong>Right of Withdrawal:</strong> For digital
          services/subscriptions, Swedish consumers generally have a 14‑day
          right of withdrawal (<em>ångerrätt</em>).
        </li>
        <li>
          <strong>The Exception:</strong> If a user starts using the “Pro”
          features (e.g., uploads their first photo under a paid plan), they
          waive their right to the 14‑day refund period as the service has been
          “fully performed” or “initiated with consent.”
        </li>
        <li>
          <strong>Stripe:</strong> Payments are processed by Stripe and are
          subject to their terms.
        </li>
      </ul>

      <h2>5. Limitation of Liability</h2>
      <ul>
        <li>
          <strong>As‑Is Basis:</strong> The site is provided “as‑is.” We do not
          guarantee 100% uptime or that photos will never be lost (users should
          keep backups).
        </li>
        <li>
          <strong>Damages Cap:</strong> Our total liability is limited to the
          amount the user has paid us in the last 12 months. This protects
          personal assets in Sweden.
        </li>
      </ul>
    </section>
  );
}

export default Termspage;
