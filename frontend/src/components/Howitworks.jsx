import React from "react";
import { Link } from "react-router-dom";
import "./style/Howitworks.css";
import how1 from "../assets/how1.webp";
import how2 from "../assets/how2.webp";
import how3 from "../assets/how3.webp";
import how4 from "../assets/how4.webp";
import screen1 from "../assets/screen1.webp";

function Howitworks() {
  return (
    <div className="how-it-works-page">
      {/* Hero Section */}
      <section className="hiw-hero">
        <h1>
          Capture the <span className="accent-text">Moment</span>, <br />
          Together.
        </h1>
        <p className="hero-snarky">
          (because we don't all have to take the picture)
        </p>
        <p className="hero-subtext">
          shareShot is a minimal photo sharing platform designed for
          collaborative collections. No hashtags, no friction—just sharing.
        </p>
      </section>


      <section className="screenshot-section">
        <img
          src={screen1}
          alt="Application Screenshot"
          className="screenshot-image"
        />
      </section>



      {/* Steps Section */}
      <section className="hiw-steps">
        <div className="hiw-step-item">
          <div className="hiw-step-content">
            <span className="hiw-step-number">Step 01</span>
            <h2>Create Your Album</h2>
            <p>Just choose a name, and click create. It's that simple.</p>
            <p>
              Set your album to <strong>Public</strong> to show it on your
              profile, or keep it unlisted for private sharing.
            </p>
            <p>
              You can also choose to set it as <strong>Open</strong> to allow
              anyone upload to your album.
            </p>
          </div>
          <div className="hiw-step-image-placeholder">
            <img src={how1} className="hiw-step-image" alt="Create Album" />
          </div>
        </div>

        <div className="hiw-step-item">
          <div className="hiw-step-content">
            <span className="hiw-step-number">Step 02</span>
            <h2>Let People Know</h2>
            <p>
              Invite guests to contribute by sharing your album{" "}
              <strong>URL</strong> or your <strong>username</strong>. There's
              also a QR code if you'd like.
            </p>
            <p>
              Participants don't need to create an account to view your album,
              but they will need an account to upload photos.
            </p>
            <p>
              But, creating an account is free and only takes a few seconds.
            </p>
          </div>
          <div className="hiw-step-image-placeholder">
            <img src={how2} className="hiw-step-image" alt="Share Album" />
          </div>
        </div>

        <div className="hiw-step-item">
          <div className="hiw-step-content">
            <span className="hiw-step-number">Step 03</span>
            <h2>Real-Time Updates</h2>
            <p>
              As photos are uploaded, they appear instantly for everyone. Watch
              the collection grow in real-time as your event unfolds.
            </p>
            <p>
              Everyone becomes a photographer, ensuring no memory goes
              uncaptured.
            </p>
          </div>
          <div className="hiw-step-image-placeholder">
            <img
              src={how3}
              className="hiw-step-image"
              alt="Real-time Updates"
            />
          </div>
        </div>

        <div className="hiw-step-item">
          <div className="hiw-step-content">
            <span className="hiw-step-number">Step 04</span>
            <h2>Keep the Memories</h2>
            <p>
              Once the party is over, everyone can download the full-resolution
              photos. No more chasing people for pictures or dealing with
              low-quality social media compression.
            </p>
          </div>
          <div className="hiw-step-image-placeholder">
            <img src={how4} className="hiw-step-image" alt="Download Photos" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="hiw-cta">
        <h2>Start your collection today.</h2>
        <p>Join thousands of users sharing their best moments on shareShot.</p>
        <Link to="/plans" className="hiw-button">
          Check which plan suits you best
        </Link>
      </section>


      {/* General Mechanics Section */}
      <section className="hiw-features">
        <h2>General Mechanics</h2>
        <div className="hiw-features-grid">
          <div className="hiw-feature-card">
            <h3>Smart Deletion</h3>
            <p>
              Maintain control over your content. Photos can only be deleted by
              the person who uploaded them or the album owner.
            </p>
          </div>

          <div className="hiw-feature-card">
            <h3>Complete Ownership</h3>
            <p>
              As an album owner, you have full authority. Only you can delete
              albums, change settings, or modify visibility.
            </p>
          </div>

          <div className="hiw-feature-card">
            <h3>Easy Subscriptions</h3>
            <p>
              Never miss an update. Subscribe to albums you love, and they'll be
              pinned to your profile for quick access.
            </p>
          </div>

          <div className="hiw-feature-card">
            <h3>Public Profiles</h3>
            <p>
              Showcase your best work. Any album set to public will
              automatically appear on your shareShot profile.
            </p>
          </div>

          <div className="hiw-feature-card">
            <h3>Privacy</h3>
            <p>
              Albums that are marked as private will not appear on your profile,
              and can only be accessed by users with the album URL.
            </p>
          </div>

          <div className="hiw-feature-card">
            <h3>Public Albums</h3>
            <p>
              Albums that are marked as public will appear on your profile, and
              other users can view and subscribe to them.
            </p>
          </div>
        </div>
      </section>



      <footer className="welcome-footer">
        <nav className="footer-nav">
          {/* <Link to="/">Home</Link> */}
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

export default Howitworks;
