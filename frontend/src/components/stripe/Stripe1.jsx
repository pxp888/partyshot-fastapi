import * as React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useCallback } from "react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { sendJson } from "../helpers";

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe("pk_test_51T3cGfL8Y0JfbCB1IGvFR59EjCXSO89qjUKqqRATyS7e4Sm0dCBaO0rlNo1gN6kzQ1XffSNVuwJWXTCC8rtrtcJQ00qpo9ksPd");

const Stripe1 = () => {
  const fetchClientSecret = useCallback(() => {
    // Create a Checkout Session using the auth helper
    return sendJson("/api/stripe/create-checkout-session", {})
      .then((data) => data.clientSecret);
  }, []);

  const options = { fetchClientSecret };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
};

export default Stripe1;
