import { Link } from "react-router-dom";
import "./style/WelcomePage.css";

function Welcomepage() {
  return (
    <div className="welcome-container">
      <div className="hero">
        <h3 className="t1">SHARED PHOTO ALBUMS, SIMPLIFIED</h3>
        <h1>Every moment, together.</h1>
        <p>
          Create shared albums anyone can contribute to. Share the link —
          friends drop their photos in, and the memories build themselves.
        </p>
        <button className="btn">Learn more</button>
      </div>

      <div className="features">
        <h3 className="t1">FEATURES</h3>
        <h2>Simple by design</h2>
        <div className="featgrid">
          <div className="featbox">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-link2 h-5 w-5 text-feature-muted mb-4"
            >
              <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
              <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
              <line x1="8" x2="16" y1="12" y2="12"></line>
            </svg>
            <p className="head">Share by link</p>
            <p>
              No sign-ups needed. Send a link and anyone can view or contribute.
            </p>
          </div>
          <div className="featbox">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-upload h-5 w-5 text-feature-muted mb-4"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" x2="12" y1="3" y2="15"></line>
            </svg>
            <p className="head">Drop & go</p>
            <p>Drag your photos in. They appear instantly for everyone.</p>
          </div>
          <div className="featbox">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-globe h-5 w-5 text-feature-muted mb-4"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
              <path d="M2 12h20"></path>
            </svg>
            <p className="head">Publicly open</p>
            <p>
              Albums can be open to the world — perfect for events and
              communities.
            </p>
          </div>
          <div className="featbox">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-users h-5 w-5 text-feature-muted mb-4"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>

            <p className="head">Everyone contributes</p>
            <p>
              No more chasing people for photos. Everyone adds their
              perspective.
            </p>
          </div>
        </div>
      </div>

      <div className="works">
        <h3 className="t1">HOW IT WORKS</h3>
        <h2>Three simple controls</h2>
        <div className="worklist">
          <div className="workitem">
            <p className="name">open</p>
            <p className="head">allow uploads from others</p>
            <p className="detail">blah</p>
          </div>
          <div className="workitem">
            <p className="name">profile</p>
            <p className="head">let others see your</p>
            <p className="detail">blah ipsum lorem</p>
          </div>
          <div className="workitem">
            <p className="name">private</p>
            <p className="head">allow uploads from others</p>
            <p className="detail">blah</p>
          </div>
        </div>
      </div>

      <div className="CTA">
        <h1>Start collecting memories</h1>
        <p>Create your first album in seconds, </p>
        <button className="btn">Get started</button>
      </div>

      <footer className="welcome-footer">
        <div className="footerlinks">
          <nav className="footer-nav">
            <a
              href="https://github.com/pxp888/partyshot-fastapi"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </nav>
          <nav className="footer-nav">
            <a href="/privacy">Privacy Policy</a>
          </nav>
          <nav className="footer-nav">
            <a href="/terms">Terms of Service</a>
          </nav>
        </div>
        <p className="footer-copy">
          &copy; {new Date().getFullYear()} shareShot.eu
        </p>
      </footer>
    </div>
  );
}

export default Welcomepage;
