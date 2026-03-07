import React from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import Searchbar from "./Searchbar";
import './style/SlideOutMenu.css';

function SlideOutMenu({
    isOpen,
    close,
    currentUser,
    handleLogout,
    setShowLogin,
    setShowRegister
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNav = (path) => {
        close();
        navigate(path);
    };

    const handleAction = (action) => {
        close();
        action();
    };

    return (
        <>
            <div className={`slide-overlay ${isOpen ? 'open' : ''}`} onClick={close} />
            <div className={`slide-out-menu ${isOpen ? 'open' : ''}`}>
                <div className="menu-content">
                    <Searchbar className="search slide-search" />

                    <div className="menu-links">
                        <Link
                            to={`/contact?from=${location.pathname}${location.search}`}
                            className="plans-link"
                            onClick={close}
                        >
                            Contact
                        </Link>
                        <Link to="/plans" className="plans-link" onClick={close}>
                            Plans
                        </Link>
                    </div>

                    {currentUser ? (
                        <div className="menu-actions">
                            <button className="btn" onClick={() => handleNav(`/user/${currentUser}`)}>
                                Profile
                            </button>
                            <button className="btn" onClick={() => handleNav("/account")}>
                                Account
                            </button>
                            <button className="btn" onClick={() => handleAction(handleLogout)}>
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="menu-actions">
                            <button className="btn" onClick={() => handleAction(() => setShowLogin(true))}>
                                Login
                            </button>
                            <button className="btn" onClick={() => handleAction(() => setShowRegister(true))}>
                                Register
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default SlideOutMenu;
