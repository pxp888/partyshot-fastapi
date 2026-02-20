import "./style/WelcomePage.css";
import screen1 from "../assets/screen1.webp";

function Welcomepage() {
  return (
    <div className="welcome-container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            shareShot<span className="title-suffix">.eu</span>
          </h1>
          {/* <p className="hero-subtitle">Capture the moment, together.</p> */}
          <p className="hero-snarky">
            (because we don't all have to take the picture)
          </p>
          <div className="hero-description">
            <p>
              A minimal photo sharing platform designed for events, parties, and
              collaborative collections. Create shared albums where everyone can
              contribute in real-time.
            </p>
          </div>
          <div className="hero-cta">
            <p className="cta-note">Create an album to get started.</p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="guide-section">
        <h2 className="section-title">How it works</h2>
        <div className="guide-steps">
          <div className="step">
            <span className="step-number">01</span>
            <h4>Create</h4>
            <p>Start a new album for your event in seconds.</p>
          </div>
          <div className="step">
            <span className="step-number">02</span>
            <h4>Invite</h4>
            <p>
              Share the album code or your username with guests, collaborators
              or friends.
            </p>
          </div>
          <div className="step">
            <span className="step-number">03</span>
            <h4>Collect</h4>
            <p>Everyone can upload and download the full collection.</p>
          </div>
        </div>
      </section>

      {/* Info/Warning Section */}
      <section className="info-banner">
        <div className="info-content">
          <h3>Community Focused</h3>
          <p>
            partyShots is built for open collaboration. Please note that albums
            are accessible via codes or usernames—it's designed for sharing, and
            albums are visible by default.
          </p>
        </div>
      </section>

      <section className="screenshot-section">
        <img
          src={screen1}
          alt="Application Screenshot"
          className="screenshot-image"
        />
      </section>

      <section className="guide-section">
        <h2 className="section-title">Album Features</h2>
        <div className="guide-steps">
          <div className="step">
            <span className="step-number">Open</span>
            {/* <h4>Open</h4>*/}
            <p>
              Albums are <strong>Open</strong> by default. That means anyone can
              add to them.
            </p>
            <p>You can close an album, which means only you can modify them.</p>
          </div>
          <div className="step">
            <span className="step-number">Public</span>
            {/* <h4>Public</h4>*/}
            <p>
              Albums are marked as <strong>Public</strong> by default. They will
              visible on your profile.
            </p>
            <p>
              If an album is not marked public, it is still accessible to people
              who have the URL, but it will not show up on your profile.
            </p>
          </div>
          <div className="step">
            <span className="step-number">Follow</span>
            {/* <h4>Subscribe</h4>*/}
            <p>
              You can <strong>Subscribe</strong> to other people's albums. They
              will be added to your profile for quick access.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}

      {/* <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">📸</div>
          <h3>Easy Sharing</h3>
          <p>Upload your photos and videos instantly to shared albums.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🤝</div>
          <h3>Collaborative</h3>
          <p>
            Albums can be shared by code, link, even your username. Anyone can
            upload to an <strong>open</strong> album.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Live Updates</h3>
          <p>See new photos as they are uploaded by others in real time.</p>
        </div>
      </section>*/}

      {/* Footer */}
      <footer className="welcome-footer">
        <nav className="footer-nav">
          <a
            href="https://github.com/pxp888/partyshot-fastapi"
            target="_blank"
            rel="noopener noreferrer"
          >
            About
          </a>
          <a href="/contact">Contact</a>
        </nav>
        <p className="footer-copy">
          &copy; {new Date().getFullYear()} partyShots
        </p>
      </footer>
    </div>
  );
}

export default Welcomepage;
