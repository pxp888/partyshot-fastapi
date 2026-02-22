import React from "react";
import { Link } from "react-router-dom";
import "./style/Howitworks.css";

function Howitworks() {
    return (
        <div className="how-it-works-page">
            {/* Hero Section */}
            <section className="hiw-hero">
                <h1>
                    Capture the <span className="accent-text">Moment</span>, <br />
                    Together.
                </h1>
                <p>
                    shareShot is a minimal photo sharing platform designed for events,
                    parties, and collaborative collections. No apps, no friction—just sharing.
                </p>
            </section>

            {/* Steps Section */}
            <section className="hiw-steps">
                <div className="hiw-step-item">
                    <div className="hiw-step-content">
                        <span className="hiw-step-number">Step 01</span>
                        <h2>Create Your Album</h2>
                        <p>
                            Start by naming your event and choosing a unique album code.
                            Whether it's a wedding, a birthday party, or a weekend getaway,
                            your album is ready in seconds.
                        </p>
                        <p>
                            Set your album to <strong>Public</strong> to show it on your profile,
                            or keep it unlisted for private sharing.
                        </p>
                    </div>
                    <div className="hiw-step-image-placeholder">
                        {/* Replace with your image: <img src={createImg} alt="Create Album" /> */}
                    </div>
                </div>

                <div className="hiw-step-item">
                    <div className="hiw-step-content">
                        <span className="hiw-step-number">Step 02</span>
                        <h2>Share the Love</h2>
                        <p>
                            Invite guests to contribute by sharing your album URL or your username.
                            Participants don't need to create an account to view or upload
                            to <strong>Open</strong> albums.
                        </p>
                        <p>
                            Just point, shoot, and share. It's that simple.
                        </p>
                    </div>
                    <div className="hiw-step-image-placeholder">
                        {/* Replace with your image: <img src={shareImg} alt="Share Album" /> */}
                    </div>
                </div>

                <div className="hiw-step-item">
                    <div className="hiw-step-content">
                        <span className="hiw-step-number">Step 03</span>
                        <h2>Real-Time Magic</h2>
                        <p>
                            As photos are uploaded, they appear instantly for everyone.
                            Watch the collection grow in real-time as your event unfolds.
                        </p>
                        <p>
                            Every guest becomes a photographer, ensuring no memory goes uncaptured.
                        </p>
                    </div>
                    <div className="hiw-step-image-placeholder">
                        {/* Replace with your image: <img src={realtimeImg} alt="Real-time Updates" /> */}
                    </div>
                </div>

                <div className="hiw-step-item">
                    <div className="hiw-step-content">
                        <span className="hiw-step-number">Step 04</span>
                        <h2>Keep the Memories</h2>
                        <p>
                            Once the party is over, everyone can download the full-resolution
                            photos. No more chasing people for pictures or dealing with low-quality
                            social media compression.
                        </p>
                    </div>
                    <div className="hiw-step-image-placeholder">
                        {/* Replace with your image: <img src={downloadImg} alt="Download Photos" /> */}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="hiw-features">
                <div className="container">
                    <h2>Everything you need.</h2>
                    <div className="hiw-features-grid">
                        <div className="hiw-feature-card">
                            <span className="hiw-feature-icon">⚡</span>
                            <h3>Instant Upload</h3>
                            <p>Lightning fast uploads directly from your mobile browser. No app store required.</p>
                        </div>
                        <div className="hiw-feature-card">
                            <span className="hiw-feature-icon">🔒</span>
                            <h3>Privacy First</h3>
                            <p>You control who sees and who contributes. Close albums anytime to stop new uploads.</p>
                        </div>
                        <div className="hiw-feature-card">
                            <span className="hiw-feature-icon">📱</span>
                            <h3>Mobile Friendly</h3>
                            <p>Designed to work perfectly on any device, from the latest iPhone to your old tablet.</p>
                        </div>
                        <div className="hiw-feature-card">
                            <span className="hiw-feature-icon">🤝</span>
                            <h3>Collaborative</h3>
                            <p>Subscribe to friends' albums to follow their updates and build shared collections.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="hiw-cta">
                <h2>Start your collection today.</h2>
                <p>Join thousands of users sharing their best moments on shareShot.</p>
                <Link to="/" className="hiw-button">
                    Get Started for Free
                </Link>
            </section>

            <footer className="welcome-footer">
                <nav className="footer-nav">
                    <Link to="/">Home</Link>
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
