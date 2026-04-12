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
          <strong style={{ color: "rgba(240,237,230,0.7)" }}>Effective Date:</strong> 04/01/2026 &nbsp;|&nbsp;{" "}
          <strong style={{ color: "rgba(240,237,230,0.7)" }}>Last Updated:</strong> 04/01/2026
        </p>
      </div>

      {/* Content */}
      <div className="container py-16 max-w-3xl mx-auto" style={{ fontFamily: "'Lato', sans-serif" }}>
        {/* Intro */}
        <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "2.5rem" }}>
          Noland Earthworks, LLC ("Noland Earthworks," "we," "our," or "us") is committed to protecting your privacy
          and ensuring full compliance with SMS industry regulations, including A2P 10DLC, TCPA, and CTIA guidelines.
          This Privacy Policy explains how we collect, use, and protect your personal information, including phone
          numbers collected for communication regarding quotes, scheduling, and project updates.
        </p>

        <Section number="1" title="Information We Collect">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "1rem" }}>
            We only collect information necessary to provide services you have requested, including:
          </p>
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li><strong style={{ color: "#E07B2A" }}>Contact Information:</strong> Name, phone number, email address, and property address</li>
            <li><strong style={{ color: "#E07B2A" }}>Service Details:</strong> Property size, acreage, terrain, vegetation type, and related job requirements</li>
            <li><strong style={{ color: "#E07B2A" }}>Communication Records:</strong> Emails, messages, phone call history, and SMS interactions</li>
          </ul>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginTop: "1rem" }}>
            We do not collect sensitive personal data unless it is directly required to provide services and you have given explicit consent.
          </p>
        </Section>

        <Section number="2" title="How We Use Your Information">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "1rem" }}>
            Your information is used exclusively to:
          </p>
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>Provide quotes and estimates</li>
            <li>Schedule and complete services</li>
            <li>Send service-related updates, appointment reminders, and follow-ups via SMS, email, or phone</li>
            <li>Respond to customer inquiries and provide support</li>
            <li>Create and manage your client record in our field service management system (Jobber)</li>
          </ul>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginTop: "1rem" }}>
            We do not sell, rent, or share your information with third parties for marketing purposes. Your information is used only to fulfill services you have requested.
          </p>
        </Section>

        <Section number="3" title="SMS Communication & Consent (A2P Compliance)">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "1rem" }}>
            By submitting your phone number through our website, quote form, or scheduling system, you explicitly consent to receive SMS messages related to your service, including:
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
            Opting out of SMS does not affect your ability to receive services, but it may impact our ability to provide real-time updates.
          </p>
        </Section>

        <Section number="4" title="Data Protection & Storage">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8 }}>
            We use industry-standard administrative, technical, and physical security measures to protect your information. Data is stored securely and accessed only by authorized team members strictly for operational purposes.
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
            We may use cookies or analytics tools to improve website performance. These do not collect personally identifiable information unless voluntarily submitted.
          </p>
        </Section>

        <Section number="7" title="Third-Party Services">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "1rem" }}>
            We use the following third-party platforms to operate our business:
          </p>
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li><strong style={{ color: "#E07B2A" }}>Jobber</strong> — field service management and scheduling</li>
            <li><strong style={{ color: "#E07B2A" }}>Resend</strong> — transactional email delivery</li>
            <li><strong style={{ color: "#E07B2A" }}>Google Maps</strong> — property location and service area display</li>
          </ul>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginTop: "1rem" }}>
            These providers may have their own privacy policies. We do not authorize these providers to use your data for any purpose beyond fulfilling your service.
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
