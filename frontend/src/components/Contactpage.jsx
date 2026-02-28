import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./style/Contactpage.css";

function Contactpage() {
  const [searchParams] = useSearchParams();
  const sourceUrl = searchParams.get("from") || "Direct Nav";

  const [formData, setFormData] = useState({
    email: "",
    subject: "",
    body: "",
  });
  const [status, setStatus] = useState(null); // 'sending', 'success', 'error'

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");

    try {
      console.log("Submitting contact form to ntfy:", formData);

      const response = await fetch("http://51.20.201.88:8000/partyShotsContact", {
        method: "POST",
        body: `From: ${formData.email}\nSubject: ${formData.subject}\nSource: ${sourceUrl}\n\n${formData.body}`,
        headers: {
          "Title": `Contact Form: ${formData.subject}`,
          "Tags": "email,mailbox_with_mail",
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setStatus("success");
      setFormData({ email: "", subject: "", body: "" });

      setTimeout(() => setStatus(null), 5000);
    } catch (error) {
      console.error("Error submitting form:", error);
      setStatus("error");
    }
  };

  return (
    <section className="contactpage">
      <div className="contact-container">
        <h1>Get in Touch</h1>
        <p>Have a question or feedback? We'd love to hear from you.</p>
        <p className="source-info">Reporting from: {sourceUrl}</p>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              name="subject"
              placeholder="What's this about?"
              value={formData.subject}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="body">Message</label>
            <textarea
              id="body"
              name="body"
              placeholder="Your message here..."
              value={formData.body}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending..." : "Send Message"}
          </button>

          {status === "success" && (
            <div className="success-message">
              Thank you! Your message has been sent successfully.
            </div>
          )}
          {status === "error" && (
            <div className="error-message">
              Something went wrong. Please try again later.
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

export default Contactpage;

