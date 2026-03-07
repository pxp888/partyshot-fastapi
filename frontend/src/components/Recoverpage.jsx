import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./style/Recoverpage.css";
import { sendJson } from "./helpers";

function Recoverpage() {
    const [formData, setFormData] = useState({
        username: "",
        code: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (formData.code.length !== 6) {
            setError("The reset code must be 6 digits.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const data = await sendJson("/api/reset-password", {
                username: formData.username,
                code: parseInt(formData.code),
                new_password: formData.password,
            });

            setSuccess("Password reset successful! Redirecting to login...");
            setTimeout(() => {
                navigate("/");
                // Note: You might want to trigger the login modal here instead of just navigating
            }, 3000);
        } catch (err) {
            setError(err.message || "Failed to reset password.");
        }
    };

    return (
        <div className="recover-container">
            <div className="recover-box">
                <h2>Reset Your Password</h2>
                <p>Enter your username, the 6-digit code from your email, and your new password.</p>

                <form onSubmit={handleSubmit}>
                    <div className="field">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Your username"
                            required
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="code">6-Digit Code</label>
                        <input
                            id="code"
                            name="code"
                            type="text"
                            maxLength="6"
                            pattern="\d{6}"
                            value={formData.code}
                            onChange={handleChange}
                            placeholder="000000"
                            required
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="password">New Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button className="btn" type="submit">
                        Reset Password
                    </button>
                </form>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
            </div>
        </div>
    );
}

export default Recoverpage;
