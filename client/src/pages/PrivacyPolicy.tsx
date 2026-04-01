import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy | Noland Earthworks, LLC";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "#C8873A" }}>Legal</p>
          <h1 className="text-4xl font-bold mb-3" style={{ color: "#F0EDE6" }}>Privacy Policy</h1>
          <p className="text-sm" style={{ color: "rgba(240,237,230,0.5)" }}>
            Noland Earthworks, LLC &nbsp;·&nbsp; Effective Date: April 1, 2026 &nbsp;·&nbsp; Last Updated: April 1, 2026
          </p>
        </div>

        <div className="space-y-10 text-base leading-relaxed" style={{ color: "rgba(240,237,230,0.85)" }}>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>1. Introduction</h2>
            <p>Noland Earthworks, LLC ("Company," "we," "us," or "our") respects your privacy and is committed to protecting the personal information you share with us. This Privacy Policy explains what information we collect, how we use it, and your rights with respect to that information when you visit www.nolandearthworks.com (the "Site") or submit a quote request.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>2. Information We Collect</h2>
            <p>We collect information you provide directly to us and information collected automatically when you use the Site.</p>
            <p className="mt-3"><strong style={{ color: "#F0EDE6" }}>Information You Provide.</strong> When you submit a quote request through the Site, we collect the following information: your full name, email address, phone number, property address (street, city, state, and ZIP code), the type of service requested, the county, the approximate acreage, and any additional project details you choose to share in the message field.</p>
            <p className="mt-3"><strong style={{ color: "#F0EDE6" }}>Information Collected Automatically.</strong> When you visit the Site, we may automatically collect certain technical information, including your IP address, browser type, operating system, referring URLs, pages viewed, and the date and time of your visit. This information is collected through standard web server logs and analytics tools.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes: to respond to your quote request and contact you to discuss your project; to create and manage your client record in our business management software; to send you a confirmation email acknowledging receipt of your quote request; to send you service-related communications, including scheduling and follow-up; to improve the Site and our services; and to comply with applicable legal obligations.</p>
            <p className="mt-3">We do not sell, rent, or trade your personal information to third parties for their marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>4. How We Share Your Information</h2>
            <p>We may share your information with the following service providers who assist us in operating our business:</p>
            <div className="mt-4 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(240,237,230,0.1)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "rgba(200,135,58,0.12)" }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#F0EDE6" }}>Service Provider</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#F0EDE6" }}>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Resend", "Transactional email delivery (quote confirmations and notifications)"],
                    ["Jobber", "Field service management and client record keeping"],
                    ["Google Maps", "Service area mapping displayed on the Site"],
                  ].map(([provider, purpose], i) => (
                    <tr key={provider} style={{ backgroundColor: i % 2 === 0 ? "rgba(240,237,230,0.03)" : "transparent" }}>
                      <td className="px-4 py-3 font-medium" style={{ color: "#F0EDE6" }}>{provider}</td>
                      <td className="px-4 py-3">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4">Each of these providers is contractually obligated to use your information only as necessary to provide services to us and in accordance with applicable law. We may also disclose your information if required to do so by law, court order, or governmental authority.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>5. Data Retention</h2>
            <p>We retain your personal information for as long as necessary to fulfill the purposes described in this Privacy Policy, to provide our services, and to comply with our legal obligations. Quote request data is retained in our business management system for the duration of our client relationship and for a reasonable period thereafter for record-keeping purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>6. Security</h2>
            <p>We implement reasonable administrative, technical, and physical safeguards to protect your personal information from unauthorized access, disclosure, alteration, or destruction. However, no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>7. Children's Privacy</h2>
            <p>The Site is not directed to children under the age of 13, and we do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected information from a child under 13, please contact us immediately and we will take steps to delete that information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>8. Your Rights</h2>
            <p>You may contact us at any time to request access to, correction of, or deletion of the personal information we hold about you. We will respond to your request within a reasonable timeframe. Please note that we may need to retain certain information for legal or business purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>9. Third-Party Links</h2>
            <p>The Site may contain links to third-party websites. This Privacy Policy does not apply to those sites, and we are not responsible for the privacy practices of third parties. We encourage you to review the privacy policies of any third-party sites you visit.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>10. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. Your continued use of the Site after any changes constitutes your acceptance of the revised Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>11. Contact Us</h2>
            <p>If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:</p>
            <div className="mt-4 p-5 rounded-lg" style={{ backgroundColor: "rgba(200,135,58,0.08)", border: "1px solid rgba(200,135,58,0.2)" }}>
              <p className="font-semibold" style={{ color: "#F0EDE6" }}>Noland Earthworks, LLC</p>
              <p className="mt-1">Phone: <a href="tel:6154064819" style={{ color: "#C8873A" }}>(615) 406-4819</a></p>
              <p>Email: <a href="mailto:info@nolandearthworks.com" style={{ color: "#C8873A" }}>info@nolandearthworks.com</a></p>
              <p>Website: <a href="https://www.nolandearthworks.com" style={{ color: "#C8873A" }}>www.nolandearthworks.com</a></p>
            </div>
          </section>

          {/* Related links */}
          <div className="pt-6 border-t" style={{ borderColor: "rgba(240,237,230,0.1)" }}>
            <p className="text-sm mb-3" style={{ color: "rgba(240,237,230,0.5)" }}>Related legal documents:</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/terms-of-service" style={{ color: "#C8873A" }}>Terms of Service</Link>
              <Link href="/terms-and-conditions" style={{ color: "#C8873A" }}>Terms and Conditions of Service</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
