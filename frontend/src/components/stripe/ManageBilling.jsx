import React, { useState } from "react";

const ManageBilling = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleManageBilling = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("access_token"); // Assuming token is stored in localStorage
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
                className="manage-billing-button"
                style={{
                    padding: "10px 20px",
                    backgroundColor: "#6772e5",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    transition: "background-color 0.2s"
                }}
            >
                {loading ? "Loading..." : "Manage Billing"}
            </button>
            {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        </div>
    );
};

export default ManageBilling;
