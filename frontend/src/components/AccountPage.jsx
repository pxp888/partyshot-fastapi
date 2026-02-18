import React, { useState, useEffect } from "react";
import { useSocket } from "./WebSocketContext";
import "./style/AccountPage.css";

const AccountPage = ({ currentUser, setCurrentUser }) => {
    const { sendJsonMessage, lastJsonMessage } = useSocket();
    const [formData, setFormData] = useState({
        newusername: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [status, setStatus] = useState({ type: "", message: "" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (lastJsonMessage && lastJsonMessage.action === "setUserData") {
            setLoading(false);
            const { username, message } = lastJsonMessage.payload;

            if (message === "success") {
                setStatus({ type: "success", message: "Account settings updated successfully!" });
                setFormData({
                    newusername: "",
                    email: "",
                    password: "",
                    confirmPassword: "",
                });
            } else if (message === "username taken") {
                setStatus({ type: "error", message: "That username is already taken. Please choose another." });
            } else if (message === "no changes") {
                setStatus({ type: "info", message: "No changes were detected." });
            } else if (message === "error") {
                setStatus({ type: "error", message: "An error occurred while updating your settings." });
            } else {
                setStatus({ type: "error", message: message || "Unexpected response from server." });
            }

            if (username && username !== currentUser) {
                setCurrentUser(username);
                localStorage.setItem("username", username);
            }
        }
    }, [lastJsonMessage, currentUser, setCurrentUser]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setStatus({ type: "", message: "" });

        if (formData.password && formData.password !== formData.confirmPassword) {
            setStatus({ type: "error", message: "Passwords do not match." });
            return;
        }

        setLoading(true);
        sendJsonMessage({
            action: "setUserData",
            payload: {
                newusername: formData.newusername || null,
                email: formData.email || null,
                password: formData.password || null,
            },
        });
    };

    if (!currentUser) {
        return (
            <div className="account-container">
                <div className="account-card">
                    <h2>Access Denied</h2>
                    <p style={{ textAlign: "center", color: "#a0a0c0" }}>
                        Please log in to manage your account settings.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="account-container">
            <div className="account-card">
                <h2>Account Settings</h2>
                <div className="current-user-info">
                    Current User: <strong>{currentUser}</strong>
                </div>

                <form className="account-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="newusername">New Username (min 3 chars)</label>
                        <input
                            type="text"
                            id="newusername"
                            name="newusername"
                            value={formData.newusername}
                            onChange={handleChange}
                            placeholder="Leave blank to keep current"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">New Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Leave blank to keep current"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">New Password (min 3 chars)</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Leave blank to keep current"
                        />
                    </div>

                    {formData.password && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm your new password"
                            />
                        </div>
                    )}

                    <button className="account-btn" type="submit" disabled={loading}>
                        {loading ? "Updating..." : "Update Settings"}
                    </button>

                    {status.message && (
                        <div className={`message ${status.type}`}>
                            {status.message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default AccountPage;
