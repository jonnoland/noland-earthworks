import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";

const copy = { color: "rgba(240,237,230,0.8)", lineHeight: 1.8 };
const list = { ...copy, lineHeight: 2, paddingLeft: "1.5rem" };

export default function PrivacyPolicy() {
  usePageTitle("Privacy Policy", "Noland Earthworks, LLC privacy policy — how we collect, use, and protect service-request information.", "/privacy-policy");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
      <Navbar />
      <div className="py-20 text-center" style={{ backgroundColor: "#1A1A1A", borderBottom: "1px solid rgba(224,123,42,0.2)" }}>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: "clamp(2.5rem, 6vw, 4rem)", letterSpacing: "0.02em", marginBottom: "0.75rem" }}>Privacy Policy</h1>
        <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.55)", fontSize: "0.9rem" }}><strong style={{ color: "rgba(240,237,230,0.7)" }}>Working Draft Updated:</strong> August 19, 2026 &nbsp;|&nbsp; <strong style={{ color: "rgba(240,237,230,0.7)" }}>Status:</strong> Attorney review required</p>
      </div>

      <div className="container py-16 max-w-3xl mx-auto" style={{ fontFamily: "'Lato', sans-serif" }}>
        <div className="mb-10 border border-[#E07B2A]/35 bg-[#E07B2A]/10 p-5" role="note">
          <p style={{ ...copy, margin: 0 }}><strong style={{ color: "#F0EDE6" }}>Important:</strong> This working draft is intended to describe the website and operations practices currently used by Noland Earthworks, LLC in plain language. Tennessee-appropriate counsel must approve it before it is relied upon as a final privacy notice.</p>
        </div>

        <Section number="1" title="Information We Collect">
          <p style={copy}>We collect information that you provide when you request a site visit, send a message, use the website chat, subscribe to updates, pay an approved invoice or deposit, or otherwise contact us. Depending on the interaction, that may include:</p>
          <ul style={list}>
            <li><strong style={{ color: "#E07B2A" }}>Contact details:</strong> name, phone number, email address, and preferred contact method.</li>
            <li><strong style={{ color: "#E07B2A" }}>Property and project details:</strong> county, address or road name, approximate size, requested work, timing, messages, and information volunteered for a site visit.</li>
            <li><strong style={{ color: "#E07B2A" }}>Communications and submitted materials:</strong> emails, messages, chat conversations, call or SMS interactions, and photos or documents you choose to provide.</li>
            <li><strong style={{ color: "#E07B2A" }}>Business and payment records:</strong> client, request, quote, job, invoice, deposit, and payment-status information. Payment-card details are processed by Stripe and are not intended to be stored in the Noland Earthworks operations system.</li>
            <li><strong style={{ color: "#E07B2A" }}>Website-use data:</strong> limited analytics, cookie, device, and page-use information used to understand site performance and service-request sources.</li>
            <li><strong style={{ color: "#E07B2A" }}>Optional Parcel ID lookup data:</strong> if you choose Parcel ID lookup on a Site Visit Request, the selected county and Parcel ID are sent to the Tennessee Comptroller’s public property-boundary service to retrieve available property-location details, such as address, map reference, and reported acreage. The public request form does not display or copy owner or mailing details from that lookup.</li>
          </ul>
          <p style={copy}>Please do not submit medical, financial-account, government-identification, or other sensitive information that is not needed to request, schedule, or complete the work.</p>
        </Section>

        <Section number="2" title="How We Use Information">
          <ul style={list}>
            <li>Review requests, determine project fit, arrange and document a site visit, prepare a written scope, and manage project communications.</li>
            <li>Create and maintain native records for clients, leads, quotes, jobs, invoices, deposits, and payment status.</li>
            <li>Schedule and complete work, provide weather or service updates, invoice for approved work, and support customers.</li>
            <li>Measure website performance, protect the website and operations system, and improve the service-request process.</li>
          </ul>
          <p style={copy}>We do not sell or rent personal information. We share information with service providers only as needed to operate the website, communicate about a request or project, process approved payments, or provide requested services.</p>
        </Section>

        <Section number="3" title="AI-Assisted Workflows">
          <p style={copy}>Noland Earthworks uses AI-assisted tools to organize inquiry details, summarize requests, draft internal materials and proposed customer communications, support operational planning, and help route work. Request details and chat text may be processed by AI service infrastructure for those functions. The owner reviews output before making a customer commitment.</p>
          <p style={copy}>AI does not independently set a final price, confirm a scope, schedule work, approve a discount, decide whether to accept a customer, or replace the required property review. Final scope and pricing are confirmed by the owner after an appropriate site review.</p>
        </Section>

        <Section number="4" title="Email, SMS, and Phone Communications">
          <p style={copy}>We use the contact method you provide to respond to an inquiry and to communicate about a site visit, proposal, scheduling, weather, service, invoice, deposit, payment, or customer support. If you select text as your preferred contact method on the Site Visit Request, we record the acknowledgement shown on that form for project-related text messages. Message frequency varies, and message and data rates may apply.</p>
          <p style={copy}>For project-related SMS, reply <strong style={{ color: "#E07B2A" }}>STOP</strong> to opt out or <strong style={{ color: "#E07B2A" }}>HELP</strong> for help. Choosing not to receive texts does not prevent you from requesting service; phone and email remain available. Separate email subscriptions for seasonal clearing tips and schedule updates may be unsubscribed through the message or by contacting us.</p>
        </Section>

        <Section number="5" title="Storage and Service Providers">
          <p style={copy}>Our current operations stack uses native Noland Earthworks records as the working source of truth for clients, leads, quotes, jobs, invoices, deposits, and payment status. We use providers for hosting and file storage, transactional email, SMS/telephone communication, payment processing, mapping, analytics, and AI-assisted internal work. These functions may involve Manus-hosted infrastructure and storage, Resend, Twilio, Stripe, Google Maps, the Tennessee Comptroller’s public property-boundary service when a user elects Parcel ID lookup, Google Analytics, website analytics services, and AI service infrastructure made available through the application.</p>
          <p style={copy}>Providers may process information under their own terms and privacy practices. We disclose or provide information only as needed for the applicable function. Jobber is not the default system of record and is used only if the owner adopts it for a specific operational need. This notice does not govern third-party websites, platforms, or payment pages that have their own privacy notices.</p>
        </Section>

        <Section number="6" title="Retention, Access, and Requests">
          <p style={copy}>We retain request, project, communication, and payment-status records for as long as reasonably needed to operate the business, resolve disputes, meet recordkeeping obligations, and enforce agreements. You may request access to, correction of, or deletion of applicable information by contacting us. Requests are subject to identity verification, legal requirements, and records we are required or reasonably need to retain.</p>
        </Section>

        <Section number="7" title="Security">
          <p style={copy}>We use reasonable technical and organizational measures intended to protect information and limit access to people and providers who need it for business operations. No internet transmission or storage system can be guaranteed completely secure.</p>
        </Section>

        <Section number="8" title="Changes to This Policy">
          <p style={copy}>We may update this policy as our website, communications, payment, or operations practices change. After attorney approval, the revised version will be posted here with an updated effective date and will apply from that effective date forward.</p>
        </Section>

        <Section number="9" title="Contact Us">
          <p style={{ ...copy, lineHeight: 2 }}>Noland Earthworks, LLC<br /><strong style={{ color: "#F0EDE6" }}>Website:</strong> <a href="https://www.nolandearthworks.com" style={{ color: "#E07B2A" }}>nolandearthworks.com</a><br /><strong style={{ color: "#F0EDE6" }}>Email:</strong> <a href="mailto:info@nolandearthworks.com" style={{ color: "#E07B2A" }}>info@nolandearthworks.com</a><br /><strong style={{ color: "#F0EDE6" }}>Phone:</strong> <a href="tel:+16154064819" style={{ color: "#E07B2A" }}>(615) 406-4819</a></p>
        </Section>
      </div>
      <Footer />
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section style={{ marginBottom: "2.5rem" }}><h2 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: "1.6rem", color: "#F0EDE6", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid rgba(224,123,42,0.3)" }}>{number}. {title}</h2>{children}</section>;
}
