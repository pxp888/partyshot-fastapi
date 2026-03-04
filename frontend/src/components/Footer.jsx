import React from "react";
import "./style/Footer.css";

const Footer = () => {
    return (
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
    );
};

export default Footer;
