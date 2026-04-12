import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function TermsOfService() {
  usePageTitle("Terms of Service", "Noland Earthworks, LLC terms of service — the rules and conditions governing use of our website and services.", "/terms-of-service");

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
          Terms of Service
        </h1>
        <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.55)", fontSize: "0.9rem" }}>
          <strong style={{ color: "rgba(240,237,230,0.7)" }}>Effective Date:</strong> 04/01/2026 &nbsp;|&nbsp;{" "}
          <strong style={{ color: "rgba(240,237,230,0.7)" }}>Last Updated:</strong> 04/01/2026
        </p>
      </div>

      {/* Content */}
      <div className="container py-16 max-w-3xl mx-auto" style={{ fontFamily: "'Lato', sans-serif" }}>
        <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "2.5rem" }}>
          This Terms of Service ("Terms") constitutes a legally binding agreement between you ("Customer," "you," or
          "your") and Noland Earthworks, LLC ("Noland Earthworks," "we," "us," or "our"), governing your access to and
          use of Noland Earthworks' services, website, communications, and equipment operations. By requesting a quote,
          scheduling a service, submitting your information, or otherwise engaging Noland Earthworks, you agree to these
          Terms in full.
        </p>

        <Section number="1" title="Services Covered">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "1rem" }}>
            These Terms apply to all services provided by Noland Earthworks, including but not limited to:
          </p>
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>Forestry Mulching &amp; Brush Clearing</li>
            <li>Land Clearing &amp; Site Preparation</li>
            <li>Vegetation Management &amp; Invasive Species Removal</li>
            <li>Property Maintenance &amp; Reclamation</li>
            <li>Consulting, Estimates, Quotes &amp; Site Evaluations</li>
          </ul>
        </Section>

        <Section number="2" title="Estimates, Quotes & Payment Terms">
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2.2, paddingLeft: "1.5rem" }}>
            <li>All estimates are based on information available at the time of quoting. Final pricing may adjust based on actual site conditions, including brush density, debris, terrain, or accessibility.</li>
            <li>Quotes are valid for 30 days unless otherwise stated.</li>
            <li>Jobs over $5,000 may require a deposit to secure scheduling and equipment allocation.</li>
            <li>Deposits are refundable if cancellation occurs 14 or more days before the scheduled start date.</li>
            <li>Deposits are non-refundable if cancellation occurs within 14 days of the start date.</li>
            <li>Payment in full is due immediately upon completion unless otherwise agreed in writing.</li>
            <li>Failure to pay may result in collections, liens, or legal action.</li>
          </ul>
        </Section>

        <Section number="3" title="Customer Responsibilities">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "1rem" }}>
            By engaging Noland Earthworks services, you agree that:
          </p>
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>You are the legal property owner or have authorization from the legal owner.</li>
            <li>You grant Noland Earthworks access to the property with heavy machinery.</li>
            <li>You are responsible for disclosing utilities, septic systems, irrigation lines, and other hidden hazards.</li>
            <li>You agree to clearly mark or remove hazards prior to service.</li>
          </ul>
          <div
            style={{
              marginTop: "1.25rem",
              padding: "1rem 1.25rem",
              backgroundColor: "rgba(224,123,42,0.08)",
              borderLeft: "3px solid #E07B2A",
              borderRadius: "0 4px 4px 0",
            }}
          >
            <p style={{ color: "rgba(240,237,230,0.85)", lineHeight: 1.8, margin: 0 }}>
              <strong style={{ color: "#E07B2A" }}>Failure to Disclose Utilities or Hazards:</strong> Noland Earthworks
              is not responsible for any damage resulting from unmarked or undisclosed utilities or obstacles. Repair
              costs are the responsibility of the property owner.
            </p>
          </div>
        </Section>

        <Section number="4" title="Property & Equipment Liability Disclaimer">
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>Noland Earthworks operates heavy machinery that may cause ground disturbance.</li>
            <li>Noland Earthworks is not liable for cosmetic or incidental damage to lawns, soil, turf, or vegetation during standard operations.</li>
            <li>Customer assumes responsibility for natural changes in terrain resulting from clearing, mulching, or vegetation management services.</li>
          </ul>
        </Section>

        <Section number="5" title="SMS Messaging & Communications Policy (A2P 10DLC Compliant)">
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginBottom: "1rem" }}>
            By providing your phone number, you consent to receive text messages related to:
          </p>
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>Quotes and estimate follow-ups</li>
            <li>Appointment confirmations</li>
            <li>Project updates and scheduling notices</li>
          </ul>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8, marginTop: "1rem" }}>
            Message frequency varies. Message and data rates may apply.
          </p>
          <p style={{ color: "rgba(240,237,230,0.8)", lineHeight: 1.8 }}>
            <strong style={{ color: "#F0EDE6" }}>Opt-Out:</strong> Reply <strong style={{ color: "#E07B2A" }}>STOP</strong> at any time.{" "}
            <strong style={{ color: "#F0EDE6" }}>For help:</strong> Reply <strong style={{ color: "#E07B2A" }}>HELP</strong> or contact us at{" "}
            <a href="mailto:quotes@nolandearthworks.com" style={{ color: "#E07B2A" }}>quotes@nolandearthworks.com</a>.
          </p>
        </Section>

        <Section number="6" title="Service Limitations & No Warranty">
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>All services are provided "as-is" with no warranties, unless stated in writing.</li>
            <li>Noland Earthworks does not guarantee results impacted by weather, land conditions, wildlife, or natural regrowth.</li>
          </ul>
        </Section>

        <Section number="7" title="Weather & Scheduling Delays">
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>Services may be postponed due to weather or equipment conditions.</li>
            <li>Deposits will not be forfeited if Noland Earthworks initiates rescheduling.</li>
          </ul>
        </Section>

        <Section number="8" title="Cancellations & Rescheduling">
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>Cancellations must be submitted in writing to <a href="mailto:quotes@nolandearthworks.com" style={{ color: "#E07B2A" }}>quotes@nolandearthworks.com</a>.</li>
            <li>Deposits for projects over $5,000 are refundable if canceled 14 or more days prior.</li>
            <li>Smaller jobs may be rescheduled one time at no cost if done 72 or more hours in advance.</li>
          </ul>
        </Section>

        <Section number="9" title="Limitation of Liability">
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>Noland Earthworks' total liability is limited to the total amount paid for services.</li>
            <li>Noland Earthworks is not liable for indirect, incidental, or punitive damages.</li>
            <li>Customer agrees to indemnify Noland Earthworks for claims arising from undisclosed hazards or property access issues.</li>
          </ul>
        </Section>

        <Section number="10" title="Governing Law & Dispute Resolution">
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>These Terms are governed by the laws of the State of Tennessee.</li>
            <li>Any disputes will be resolved in the courts of Maury County, Tennessee.</li>
          </ul>
        </Section>

        <Section number="11" title="Changes to Terms">
          <ul style={{ color: "rgba(240,237,230,0.8)", lineHeight: 2, paddingLeft: "1.5rem" }}>
            <li>Noland Earthworks may update these Terms at any time.</li>
            <li>Continued use of our services constitutes acceptance of any updated Terms.</li>
          </ul>
        </Section>

        <Section number="12" title="Contact Information">
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
