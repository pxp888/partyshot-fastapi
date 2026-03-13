import React, { useEffect } from "react";
import { useMessage } from "./MessageBoxContext";
import { getCookie, setCookie } from "./helpers";

const CookieConsent = () => {
  const { showMessage } = useMessage();

  useEffect(() => {
    // Disable cookie consent locally
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return;
    }

    const consent = getCookie("cookie_consent");
    if (!consent) {
      showMessage(
        "This site uses session cookies to store login information. We do not use cookies for tracking or marketing.",
        "Cookie Policy",
        () => {
          setCookie("cookie_consent", "true", 365);
        },
      );
    }
  }, [showMessage]);

  return null; // This component doesn't render anything itself
};

export default CookieConsent;
