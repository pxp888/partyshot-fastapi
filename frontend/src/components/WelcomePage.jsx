import { Link } from "react-router-dom";
import "./style/WelcomePage.css";
import Footer from "./Footer";
import screen1 from "../assets/screen1.webp";
import screen2 from "../assets/screen2.webp";
import screen3 from "../assets/screen3.webp";
import screen4 from "../assets/screen4.webp";

function Welcomepage() {
  return (
    <div className="welcome-container">
      <section className="hero">
        <span className="t1">Shared Photo Albums, Simplified</span>
        <h1>Simple by design.</h1>
        <p>
          Create shared albums anyone can contribute to. Share the link —
          friends drop their photos in, and the memories build themselves.
        </p>
        <p>No hashtags, no friction, just sharing.</p>

        <div className="btn-group">
          <button
            className="btn demo"
            onClick={() =>
              (window.location.href = "https://shareshot.eu/user/alice")
            }
          >
            Sample Profile
          </button>
          <button
            className="btn demo outline"
            onClick={() =>
            (window.location.href =
              "https://shareshot.eu/album/79504e976f894bb99f566847683be8a3")
            }
          >
            Sample Album
          </button>
        </div>
      </section>

      <section className="mid-screenshot">
        <div className="shot-container">
          <img src={screen2} alt="Profile View" className="screenshot" />
        </div>
      </section>

      <section className="features">
        <span className="t1">Features</span>
        <h2>Easy to use, easy to share.</h2>
        <div className="featgrid">
          <div className="featbox share">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-link2"
            >
              <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
              <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
              <line x1="8" x2="16" y1="12" y2="12"></line>
            </svg>
            <h3 className="head">Share by link</h3>
            <p>
              No sign-ups needed. Send a link and anyone can view or contribute.
            </p>
          </div>
          <div className="featbox">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-upload"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" x2="12" y1="3" y2="15"></line>
            </svg>
            <h3 className="head">Drop & go</h3>
            <p>Drag your photos in. They appear instantly for everyone.</p>
          </div>
          <div className="featbox">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-globe"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
              <path d="M2 12h20"></path>
            </svg>
            <h3 className="head">Publicly open</h3>
            <p>
              Albums can be open to the world — perfect for events and
              communities.
            </p>
          </div>
          <div className="featbox">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-users"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>

            <h3 className="head">Everyone contributes</h3>
            <p>
              No more chasing people for photos. Everyone adds their
              perspective.
            </p>
          </div>
        </div>
      </section>

      <section className="mid-screenshot alternate">
        <div className="shot-container">
          <img src={screen1} alt="Album View" className="screenshot" />
        </div>
      </section>

      <section className="works">
        <div className="works-container">
          <div className="works-image">
            <img src={screen3} alt="How it works" className="side-screenshot" />
            <img src={screen4} alt="Controls" className="side-screenshot" />
          </div>
          <div className="works-content">
            <span className="t1">How it works</span>
            <h2>Three simple controls.</h2>
            <div className="worklist">
              <div className="workitem">
                <h3 className="name">Open</h3>
                <div className="workitem-content">
                  <h4 className="head">Allow uploads from others</h4>
                  <p className="detail">
                    Users can upload photos to any albums marked <strong>open</strong>.
                  </p>
                </div>
              </div>
              <div className="workitem">
                <h3 className="name">Profile</h3>
                <div className="workitem-content">
                  <h4 className="head">Let others see your content</h4>
                  <p className="detail">
                    Every user has a <strong>profile</strong> with albums they choose
                    to show. Albums are visible to anyone with the URL.
                  </p>
                </div>
              </div>
              <div className="workitem">
                <h3 className="name">Private</h3>
                <div className="workitem-content">
                  <h4 className="head">Other users can be blocked, even with the URL</h4>
                  <p className="detail">
                    Other users cannot see photos in private albums unless they
                    uploaded them. Users will <strong>always</strong> be able to see their own
                    photos, even in your private albums.
                  </p>
                  <p className="detail">
                    <strong>Private + open</strong> can be useful for allowing uploads
                    without users seeing the current collection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="CTA">
        <h1>Start collecting memories.</h1>
        <p>Log in or register to get started.</p>
      </section>

      <Footer />
    </div>
  );
}

export default Welcomepage;
