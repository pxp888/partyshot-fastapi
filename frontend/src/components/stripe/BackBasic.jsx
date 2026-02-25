import React, { useEffect, useState } from "react";
import Stripe1 from "./Stripe1";

const BackBasic = () => {
    const [status, setStatus] = useState(null);
    const [customerEmail, setCustomerEmail] = useState("");

    useEffect(() => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const sessionId = urlParams.get("session_id");

        const fetchSessionStatus = async () => {
            try {
                const response = await fetch(`/api/stripe/session_status?session_id=${sessionId}`);
                if (!response.ok) throw new Error("Network response was not ok");
                const session = await response.json();

                setStatus(session.status);
                setCustomerEmail(session.customer_email);
            } catch (error) {
                console.error("Error fetching session status:", error);
            }
        };

        if (sessionId) {
            fetchSessionStatus();
        }
    }, []);

    if (status === "open") {
        return (
            <div className="return-container">
                <h3>Session still open. Please complete your payment.</h3>
                <Stripe1 />
            </div>
        );
    }

    if (status === "complete") {
        return (
            <section id="success" className="success-page">
                <h2>Payment Successful!</h2>
                <p>
                    We appreciate your business! A confirmation email will be sent to <strong>{customerEmail}</strong>.
                </p>
                <p>
                    If you have any questions, please email <a href="mailto:support@example.com">support@example.com</a>.
                </p>
            </section>
        );
    }

    return (
        <div className="loading-container">
            <p>Processing your payment status...</p>
        </div>
    );
};

export default BackBasic;
