import React from "react";
import { Link } from "react-router-dom";
import "./style/Howitworks.css";
import Footer from "./Footer";
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
              Set your album to <strong>Profile</strong> to show it on your
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
            <h2>Open it up</h2>
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
            <h3>Open Albums</h3>
            <p>
              Albums can be set to <strong>open</strong>, allowing anyone with
              the URL to upload photos.
            </p>
            <p>
              By the way, the storage taken by photos uploaded to open albums
              counts against the album owner's storage quota.
            </p>
          </div>

          <div className="hiw-feature-card">
            <h3>Profile Albums</h3>
            <p>
              Albums marked <strong>profile</strong> will appear on your
              shareShot profile, allowing others to easily find them.
            </p>
            <p>
              Albums that are not marked <strong>profile</strong> are still
              accessible by anyone with the URL, but they aren't listed on your
              profile.
            </p>
          </div>

          <div className="hiw-feature-card">
            <h3>Private Albums</h3>
            <p>
              Albums are open to anyone with the URL, but if you want to keep it
              more exclusive, you can set it to <strong>private</strong>.
            </p>
            <p>Private albums can't be accessed by others.</p>
          </div>

          <div className="hiw-feature-card">
            <h3>Subscribe</h3>
            <p>You can subscribe to other people's albums with just a click.</p>
            <p>
              Then they appear on your profile, and you can easily access them
              at any time.
            </p>
          </div>

          <div className="hiw-feature-card">
            <h3>Deleting</h3>
            <p>You can create and delete your own albums at any time.</p>
            <p>
              Photos can be deleted by either the album owner or the photo
              uploader.
            </p>
          </div>

          <div className="hiw-feature-card">
            <h3>private + open</h3>
            <p>
              You can set an album to both private and open, which means that
              anyone can upload to it, but only the album owner can view it.
            </p>
            <p>
              This is useful for situations where you want to allow people to
              contribute photos without giving them immediate access to the
              existing collection.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Howitworks;
