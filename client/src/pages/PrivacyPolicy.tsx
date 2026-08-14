import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function PrivacyPolicy() {
  usePageTitle("Privacy Policy", "Noland Earthworks, LLC privacy policy — how we collect, use, and protect your information.", "/privacy-policy");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
      <Navbar />

      {/* Hero */}
      <div
        className="py-20 text-center"
        style={{ backgroundColor: "#1A1A1A", borderBottom: "1px solid rgba(224,123,42,0.2)" }}
      >
        <h1
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(2.5rem, 6vw, 4rem)",
            color: "#F0EDE6",
            letterSpacing: "0.02em",
            marginBottom: "0.75rem",
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.55)", fontSize: "0.9rem" }}>
          <strong style={{ color: "rgba(240,237,230,0.7)" }}>Effective Date:</strong> 08/14/2026 &nbsp;|&nbsp;{" "}
          <strong style={{ color: "rgba(240,237,230,0.7)" }}>Last Updated:</strong> 08/14/2026
        </p>
      </div>

      {/* Content */}
      <div className="container py-16 max-w-3xl mx-auto" style={{ fontFamily: "'Lato', sans-serif" }}>
        {/* Intro */}
        <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "2.5rem" }}>
          Noland Earthworks, LLC ("Noland Earthworks," "we," "our," or "us") explains here how we collect and use information submitted through our website and during a project. This notice is based on the current website and operations workflow and is undergoing final legal review. Please contact us with questions before sharing information that is not needed for your service request.
        </p>

        <Section number="1" title="Information We Collect">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "1rem" }}>
            We only collect information necessary to provide services you have requested, including:
          </p>
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li><strong style={{ color: "#E07B2A" }}>Contact Information:</strong> Name, phone number, email address, and property address</li>
            <li><strong style={{ color: "#E07B2A" }}>Service Details:</strong> Property address or county, approximate size, requested work, timing, project description, and information voluntarily supplied for a site visit</li>
            <li><strong style={{ color: "#E07B2A" }}>Communications and Project Materials:</strong> Emails, messages, phone or SMS interactions, and photos or documents voluntarily supplied for the project</li>
            <li><strong style={{ color: "#E07B2A" }}>Payment and Website Information:</strong> Invoice and payment-status information, plus limited cookie or analytics information about website use. Payment-card details are processed by Stripe and are not intended to be stored in our operations system.</li>
          </ul>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginTop: "1rem" }}>
            Please do not submit sensitive personal information that is not needed to request, schedule, or complete the work.
          </p>
        </Section>

        <Section number="2" title="How We Use Your Information">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "1rem" }}>
            Your information is used exclusively to:
          </p>
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>Review site-visit requests, determine project fit, and prepare a written scope after an on-site review</li>
            <li>Schedule and complete services, then invoice and collect payment</li>
            <li>Send service-related updates, appointment reminders, and follow-ups via SMS, email, or phone</li>
            <li>Respond to customer inquiries and provide support</li>
            <li>Create and manage a client, request, quote, job, invoice, deposit, and payment record in our native operations system</li>
            <li>Use AI-assisted tools to organize inquiry details and draft operational materials; the owner reviews output before making a customer commitment</li>
          </ul>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginTop: "1rem" }}>
            We do not sell or rent personal information. We share information with service providers only as needed to operate the website, communicate, process payment, or provide the requested service.
          </p>
        </Section>

        <Section number="3" title="SMS Communication & Consent (A2P Compliance)">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "1rem" }}>
            If you provide a phone number in connection with a project, we may use the requested contact method for service-related communications, including:
          </p>
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>Appointment confirmations and reminders</li>
            <li>Estimate follow-ups</li>
            <li>Weather or scheduling updates</li>
            <li>Service updates and customer support messages</li>
          </ul>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginTop: "1rem" }}>
            <strong style={{ color: "#F0EDE6" }}>Message Frequency:</strong> Varies based on your project status
          </p>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8 }}>
            <strong style={{ color: "#F0EDE6" }}>Message &amp; Data Rates May Apply</strong>
          </p>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginTop: "1rem" }}>
            Opt-Out Instructions: Reply <strong style={{ color: "#E07B2A" }}>STOP</strong> at any time to unsubscribe. Reply{" "}
            <strong style={{ color: "#E07B2A" }}>HELP</strong> for assistance.
          </p>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginTop: "0.5rem" }}>
            Choosing to opt out of SMS does not prevent you from requesting service. You may contact us by phone or email instead.
          </p>
        </Section>

        <Section number="4" title="Data Protection & Storage">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8 }}>
            We use reasonable technical and organizational measures intended to protect information and limit access to people and providers who need it for operations. No internet transmission or storage system can be guaranteed completely secure.
          </p>
        </Section>

        <Section number="5" title="Your Rights">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "1rem" }}>
            You have the right to:
          </p>
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>Request access to your information</li>
            <li>Request corrections or updates</li>
            <li>Request deletion where legally permissible</li>
          </ul>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginTop: "1rem" }}>
            To exercise your rights, contact us using the information in Section 9.
          </p>
        </Section>

        <Section number="6" title="Cookies & Website Tracking">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8 }}>
            We use cookies or analytics tools to understand website performance and usage. Information that identifies you is collected when you voluntarily submit it through a form, chat, payment, or other direct interaction.
          </p>
        </Section>

        <Section number="7" title="Third-Party Services">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "1rem" }}>
            We use the following third-party platforms to operate our business:
          </p>
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li><strong style={{ color: "#E07B2A" }}>Manus-hosted infrastructure and storage</strong> — website, operations application, and file storage</li>
            <li><strong style={{ color: "#E07B2A" }}>Resend</strong> — transactional email delivery</li>
            <li><strong style={{ color: "#E07B2A" }}>Twilio</strong> — SMS and telephone communication services</li>
            <li><strong style={{ color: "#E07B2A" }}>Stripe</strong> — payment processing</li>
            <li><strong style={{ color: "#E07B2A" }}>Google Maps</strong> — property location and service area display</li>
            <li><strong style={{ color: "#E07B2A" }}>Google Analytics</strong> — website measurement</li>
            <li><strong style={{ color: "#E07B2A" }}>AI service infrastructure</strong> — AI-assisted internal drafting and request organization</li>
          </ul>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginTop: "1rem" }}>
            These providers may have their own privacy policies and process information under their applicable terms. We use them only for the functions described above.
          </p>
        </Section>

        <Section number="8" title="Changes to This Policy">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8 }}>
            We may update this Privacy Policy periodically. All updates will be posted on this page with the revised effective date.
          </p>
        </Section>

        <Section number="9" title="Contact Us">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2 }}>
            Noland Earthworks, LLC<br />
            <strong style={{ color: "#F0EDE6" }}>Website:</strong>{" "}
            <a href="https://www.nolandearthworks.com" style={{ color: "#E07B2A" }}>https://www.nolandearthworks.com</a><br />
            <strong style={{ color: "#F0EDE6" }}>Email:</strong>{" "}
            <a href="mailto:quotes@nolandearthworks.com" style={{ color: "#E07B2A" }}>quotes@nolandearthworks.com</a><br />
            <strong style={{ color: "#F0EDE6" }}>Phone:</strong>{" "}
            <a href="tel:+16154064819" style={{ color: "#E07B2A" }}>(615) 406-4819</a>
          </p>
        </Section>
      </div>

      <Footer />
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "2.5rem" }}>
      <h2
        style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
          fontSize: "1.6rem",
          color: "#F0EDE6",
          marginBottom: "1rem",
          paddingBottom: "0.5rem",
          borderBottom: "2px solid rgba(224,123,42,0.3)",
        }}
      >
        {number}. {title}
      </h2>
      {children}
    </div>
  );
}
