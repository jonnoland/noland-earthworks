import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";

export default function TermsOfService() {
  useEffect(() => {
    document.title = "Terms of Service | Noland Earthworks, LLC";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "#C8873A" }}>Legal</p>
          <h1 className="text-4xl font-bold mb-3" style={{ color: "#F0EDE6" }}>Terms of Service</h1>
          <p className="text-sm" style={{ color: "rgba(240,237,230,0.5)" }}>
            Noland Earthworks, LLC &nbsp;·&nbsp; Effective Date: April 1, 2026 &nbsp;·&nbsp; Last Updated: April 1, 2026
          </p>
        </div>

        <div className="space-y-10 text-base leading-relaxed" style={{ color: "rgba(240,237,230,0.85)" }}>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>1. Agreement to Terms</h2>
            <p>By accessing or using the website located at www.nolandearthworks.com (the "Site"), requesting a quote, or engaging the services of Noland Earthworks, LLC ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Site or our services.</p>
            <p className="mt-3">Noland Earthworks, LLC is a limited liability company organized under the laws of the State of Tennessee, providing land clearing, forestry mulching, vegetation management, and related land services throughout Middle Tennessee.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>2. Services</h2>
            <p>Noland Earthworks, LLC provides professional land services including, but not limited to, land clearing, forestry mulching, vegetation management, and property maintenance. All services are subject to a separate written service agreement or work order executed between the Company and the client prior to commencement of work. These Terms govern your use of the Site and the quote request process; the scope, pricing, and terms of any actual field work are governed by the applicable service agreement.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>3. Quote Requests</h2>
            <p>Submitting a quote request through the Site does not constitute a binding contract or guarantee of service. A quote request is an expression of interest only. The Company will review your request and contact you to discuss the scope of work, pricing, and scheduling. No work will begin until both parties have executed a written service agreement or work order.</p>
            <p className="mt-3">By submitting a quote request, you represent that the information you provide is accurate and complete, and that you have the authority to authorize work on the property described in the request.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>4. Intellectual Property</h2>
            <p>All content on the Site — including text, graphics, logos, images, and software — is the property of Noland Earthworks, LLC or its content suppliers and is protected by applicable United States copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any content on the Site without the prior written consent of the Company.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>5. Disclaimer of Warranties</h2>
            <p>The Site and its content are provided on an "as is" and "as available" basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. The Company does not warrant that the Site will be uninterrupted, error-free, or free of viruses or other harmful components.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>6. Limitation of Liability</h2>
            <p>To the fullest extent permitted by applicable law, Noland Earthworks, LLC and its members, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Site or the quote request process, even if the Company has been advised of the possibility of such damages. The Company's total liability to you for any claim arising out of or related to these Terms or the Site shall not exceed one hundred dollars ($100.00).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>7. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless Noland Earthworks, LLC and its members, officers, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with your access to or use of the Site, your violation of these Terms, or your provision of inaccurate information in a quote request.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>8. Third-Party Links</h2>
            <p>The Site may contain links to third-party websites. These links are provided for your convenience only. The Company has no control over the content of those sites and accepts no responsibility for them or for any loss or damage that may arise from your use of them.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>9. Governing Law and Dispute Resolution</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the State of Tennessee, without regard to its conflict of law provisions. Any dispute arising out of or relating to these Terms or the Site shall be resolved exclusively in the state or federal courts located in Williamson County, Tennessee, and you consent to the personal jurisdiction of such courts.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>10. Changes to These Terms</h2>
            <p>The Company reserves the right to modify these Terms at any time. Changes will be effective immediately upon posting to the Site. Your continued use of the Site after any changes constitutes your acceptance of the revised Terms. We encourage you to review these Terms periodically.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>11. Contact Information</h2>
            <p>If you have any questions about these Terms, please contact us:</p>
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
              <Link href="/privacy-policy" style={{ color: "#C8873A" }}>Privacy Policy</Link>
              <Link href="/terms-and-conditions" style={{ color: "#C8873A" }}>Terms and Conditions of Service</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
