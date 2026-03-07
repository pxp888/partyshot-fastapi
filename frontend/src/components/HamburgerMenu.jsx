import React from 'react';
import './style/HamburgerMenu.css';

function HamburgerMenu({ isOpen, toggle }) {
    return (
        <div className={`hamburger-menu ${isOpen ? 'open' : ''}`} onClick={toggle}>
            <span className="line"></span>
            <span className="line"></span>
            <span className="line"></span>
        </div>
    );
}

export default HamburgerMenu;
