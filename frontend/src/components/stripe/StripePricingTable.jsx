import React, { useEffect, useState } from "react";
import "./StripePricingTable.css";
import { sendJson } from "../helpers";

const StripePricingTable = ({ userEmail, userId }) => {
    const [clientSecret, setClientSecret] = useState(null);

    useEffect(() => {
        // Load the Stripe pricing table script
        const script = document.createElement("script");
        script.src = "https://js.stripe.com/v3/pricing-table.js";
        script.async = true;
        document.body.appendChild(script);

        // Fetch the customer session client secret from the backend
        sendJson("/api/create-customer-session", {})
            .then(data => {
                if (data.client_secret) {
                    setClientSecret(data.client_secret);
                }
            })
            .catch(err => {
                console.error("Error fetching customer session:", err);
            });

        return () => {
            // Clean up the script when the component unmounts
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    const returnUrl = `${window.location.origin}/basic/return?session_id={CHECKOUT_SESSION_ID}`;

    return (
        <div className="stripe-pricing-table-container">
            {clientSecret ? (
                <stripe-pricing-table
                    pricing-table-id="prctbl_1T4nwuL8Y0JfbCB1v5p0Qc9q"
                    publishable-key="pk_test_51T3cGfL8Y0JfbCB1IGvFR59EjCXSO89qjUKqqRATyS7e4Sm0dCBaO0rlNo1gN6kzQ1XffSNVuwJWXTCC8rtrtcJQ00qpo9ksPd"
                    customer-session-client-secret={clientSecret}
                    return-url={returnUrl}
                ></stripe-pricing-table>
            ) : (
                <div className="loading-pricing">Loading pricing...</div>
            )}
        </div>
    );
};

export default StripePricingTable;
