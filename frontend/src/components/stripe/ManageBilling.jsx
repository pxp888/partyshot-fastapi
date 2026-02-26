import React, { useState } from "react";
import "./ManageBilling.css";

const ManageBilling = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleManageBilling = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch("/api/create-portal-session", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Failed to create portal session");
            }

            const { url } = await response.json();
            // This URL is a direct session, no login required for the user
            window.location.href = url;
        } catch (err) {
            console.error("Error redirecting to billing portal:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="manage-billing-container">
            <button
                onClick={handleManageBilling}
                disabled={loading}
                className="account-btn billing-btn"
            >
                {loading ? "Loading..." : "Manage Billing & Subscription"}
            </button>
            {error && (
                <div className="billing-error">
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
};

export default ManageBilling;
