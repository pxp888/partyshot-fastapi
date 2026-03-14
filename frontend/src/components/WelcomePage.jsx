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
        <div className="hero-content">
          <span className="t1">Shared Photo Albums, Simplified</span>
          <h1>Simple by design.</h1>
          <p>
            Create shared albums anyone can contribute to. Share the link —
            friends drop their photos in, and the memories build themselves.
          </p>
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
        </div>
        <div className="hero-image">
          <img src={screen2} alt="Interface Preview" className="hero-screenshot parallax" />
        </div>
      </section>

      <section className="mid-feature">
        <div className="mid-content">
          <span className="t1">Seamless Sharing</span>
          <h2>One link, infinite memories.</h2>
          <p>
            No sign-ups needed. Send a link and anyone can view or contribute. 
            Perfect for weddings, parties, or just a weekend trip.
          </p>
          <img src={screen1} alt="Album View" className="screenshot-large" />
        </div>
      </section>

      <section className="works">
        <div className="works-container">
          <div className="works-image-stack">
            <img src={screen3} alt="How it works" className="side-screenshot top" />
            <img src={screen4} alt="Controls" className="side-screenshot bottom" />
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
                  <h4 className="head">Privacy you control</h4>
                  <p className="detail">
                    Other users cannot see photos in private albums unless they
                    uploaded them.
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
