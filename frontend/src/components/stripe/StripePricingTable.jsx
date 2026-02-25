import React, { useEffect } from "react";
import "./StripePricingTable.css";

const StripePricingTable = ({ userEmail, userId }) => {
    useEffect(() => {
        // Load the Stripe pricing table script
        const script = document.createElement("script");
        script.src = "https://js.stripe.com/v3/pricing-table.js";
        script.async = true;
        document.body.appendChild(script);

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
            <stripe-pricing-table
                pricing-table-id="prctbl_1T4nwuL8Y0JfbCB1v5p0Qc9q"
                publishable-key="pk_test_51T3cGfL8Y0JfbCB1IGvFR59EjCXSO89qjUKqqRATyS7e4Sm0dCBaO0rlNo1gN6kzQ1XffSNVuwJWXTCC8rtrtcJQ00qpo9ksPd"
                customer-email={userEmail}
                client-reference-id={userId}
                return-url={returnUrl}
            ></stripe-pricing-table>
        </div>
    );
};

export default StripePricingTable;
