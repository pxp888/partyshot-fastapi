import "./style/WelcomePage.css";
import screen1 from "../assets/screen1.webp";


function Welcomepage() {
  return (
    <div className="welcome-container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">partyShots</h1>
          <p className="hero-subtitle">Capture the moment, together.</p>
          <p className="hero-snarky">(because we don't all have to take the picture.)</p>
          <div className="hero-description">
            <p>
              A minimal photo sharing platform designed for events, parties, and
              collaborative collections. Create shared albums where everyone can
              contribute in real-time.
            </p>
          </div>
          <div className="hero-cta">
            <p className="cta-note">Join or create an album to get started.</p>
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
            <p>Share the album code or your link with guests.</p>
          </div>
          <div className="step">
            <span className="step-number">03</span>
            <h4>Collect</h4>
            <p>Everyone uploads and downloads the full collection.</p>
          </div>
        </div>
      </section>

      {/* Info/Warning Section */}
      <section className="info-banner">
        <div className="info-content">
          <h3>Community Focused</h3>
          <p>
            partyShots is built for open collaboration. Please note that albums are
            accessible via codes or usernames—it's designed for sharing, not
            private storage.
          </p>
        </div>
      </section>

      <section className="screenshot-section">
        <img src={screen1} alt="Application Screenshot" className="screenshot-image" />
      </section>

      {/* Features Section */}

      <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">📸</div>
          <h3>Easy Sharing</h3>
          <p>Upload your photos and videos instantly to shared albums.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🤝</div>
          <h3>Collaborative</h3>
          <p>Invite friends to join and build a collective memory of your events.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Live Updates</h3>
          <p>See new photos as they are uploaded by others in the album.</p>
        </div>
      </section>

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
        <p className="footer-copy">&copy; {new Date().getFullYear()} partyShots</p>
      </footer>
    </div>
  );
}

export default Welcomepage;
