import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";

export default function TermsAndConditions() {
  useEffect(() => {
    document.title = "Terms and Conditions | Noland Earthworks, LLC";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "#C8873A" }}>Legal</p>
          <h1 className="text-4xl font-bold mb-3" style={{ color: "#F0EDE6" }}>Terms and Conditions of Service</h1>
          <p className="text-sm" style={{ color: "rgba(240,237,230,0.5)" }}>
            Noland Earthworks, LLC &nbsp;·&nbsp; Effective Date: April 1, 2026 &nbsp;·&nbsp; Last Updated: April 1, 2026
          </p>
        </div>

        <div className="space-y-10 text-base leading-relaxed" style={{ color: "rgba(240,237,230,0.85)" }}>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>1. Scope and Application</h2>
            <p>These Terms and Conditions ("Terms") govern the provision of land services by Noland Earthworks, LLC ("Company," "we," "us," or "our") to clients ("Client," "you") in Middle Tennessee. These Terms apply to all quote requests, service agreements, work orders, and field services performed by the Company, including land clearing, forestry mulching, vegetation management, property maintenance, and any related services.</p>
            <p className="mt-3">By requesting a quote, signing a service agreement, or authorizing work to begin, you agree to be bound by these Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>2. Quotes and Estimates</h2>
            <p>All quotes and estimates provided by the Company are based on information available at the time of the quote, including site visits, photographs, and information provided by the Client. Quotes are valid for thirty (30) days from the date of issuance unless otherwise stated in writing.</p>
            <p className="mt-3">Quotes are estimates only. Final pricing may vary if site conditions differ materially from those described or observed at the time of the quote, if the scope of work changes at the Client's request, or if unforeseen conditions are encountered during work (including but not limited to buried debris, stumps, rocks, utilities, or hazardous materials).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>3. Authorization and Property Access</h2>
            <p>By signing a service agreement or authorizing work to begin, the Client represents and warrants that: (a) the Client owns the property or has the legal authority to authorize the work described; (b) the Client has obtained all necessary permits, easements, and approvals required for the work; and (c) the Client has accurately disclosed all known underground utilities, structures, irrigation systems, septic systems, and other features that may be affected by the work.</p>
            <p className="mt-3">The Client agrees to provide the Company with reasonable access to the property during scheduled work hours. If access is denied or delayed due to circumstances within the Client's control, the Company reserves the right to reschedule and may charge a rescheduling fee.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>4. Underground Utilities and Hazards</h2>
            <p>The Client is responsible for locating and marking all underground utilities, irrigation lines, septic systems, and other subsurface features prior to the commencement of work. The Company will call 811 (Tennessee One-Call) for public utility locates when required, but this service does not cover private utilities, irrigation systems, or other private subsurface features.</p>
            <p className="mt-3">The Company shall not be liable for damage to any underground feature that was not disclosed by the Client or marked prior to the start of work.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>5. Scope of Work and Changes</h2>
            <p>The scope of work is defined in the applicable service agreement or work order. Any changes to the scope of work requested by the Client must be agreed upon in writing before additional work is performed. Additional work will be billed at the Company's then-current rates.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>6. Payment Terms</h2>
            <p>Payment terms are as specified in the applicable service agreement or work order. Unless otherwise agreed in writing, payment is due upon completion of work. The Company accepts cash, check, and major credit cards. Returned checks are subject to a returned check fee of $50.00.</p>
            <p className="mt-3">Invoices not paid within thirty (30) days of the due date are subject to a late fee of 1.5% per month (18% per annum) on the outstanding balance. The Client agrees to pay all reasonable costs of collection, including attorneys' fees, incurred by the Company in collecting any overdue amounts.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>7. Cancellation and Rescheduling</h2>
            <p>The Client may cancel or reschedule a scheduled job by providing at least forty-eight (48) hours' advance notice. Cancellations or rescheduling requests made with less than forty-eight (48) hours' notice may be subject to a cancellation fee equal to a reasonable portion of the quoted job price to cover mobilization costs and lost scheduling opportunity, as determined by the Company.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>8. Damage and Liability</h2>
            <p>The Company carries general liability insurance and takes reasonable precautions to protect the Client's property. However, certain types of damage are inherent risks of land clearing and related work, including but not limited to: soil disturbance, ruts from equipment, damage to grass or turf, and incidental damage to vegetation near the work area.</p>
            <p className="mt-3">The Company shall not be liable for: (a) damage to undisclosed or unmarked underground features; (b) damage caused by pre-existing site conditions; (c) incidental or consequential damages; or (d) damage resulting from the Client's failure to comply with these Terms. The Company's total liability for any claim arising out of a specific job shall not exceed the amount paid by the Client for that job.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>9. Debris and Disposal</h2>
            <p>Unless otherwise specified in the service agreement, material cleared from the property (including trees, brush, stumps, and debris) will be mulched in place, chipped, or left on the property in a manner agreed upon with the Client. Removal and off-site disposal of material is available at an additional charge and must be specified in the service agreement.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>10. Weather and Force Majeure</h2>
            <p>The Company reserves the right to reschedule work due to inclement weather, unsafe site conditions, or other circumstances beyond the Company's reasonable control (including but not limited to acts of God, natural disasters, equipment failure, or supply chain disruptions). The Company will make reasonable efforts to notify the Client of any rescheduling as promptly as practicable.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>11. Warranty</h2>
            <p>The Company warrants that all work will be performed in a professional and workmanlike manner consistent with industry standards. If the Client is not satisfied with the work performed, the Client must notify the Company in writing within seven (7) days of completion. The Company's sole obligation under this warranty is to return to the property and correct any deficiencies in the work at no additional charge. This warranty does not cover conditions caused by weather, subsequent use of the property, or actions of third parties.</p>
            <p className="mt-3 uppercase text-sm font-medium" style={{ color: "rgba(240,237,230,0.6)" }}>The Company makes no other warranties, express or implied, including any implied warranty of merchantability or fitness for a particular purpose.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>12. Governing Law and Dispute Resolution</h2>
            <p>These Terms shall be governed by the laws of the State of Tennessee. Any dispute arising out of or relating to these Terms or the services provided by the Company shall first be subject to good-faith negotiation between the parties. If the dispute cannot be resolved through negotiation within thirty (30) days, it shall be resolved by binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules, with the arbitration to be held in Williamson County, Tennessee. Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>13. Entire Agreement</h2>
            <p>These Terms, together with the applicable service agreement or work order, constitute the entire agreement between the Company and the Client with respect to the services described therein and supersede all prior negotiations, representations, warranties, and understandings of the parties. No modification of these Terms shall be binding unless made in writing and signed by both parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: "#F0EDE6" }}>14. Contact Information</h2>
            <p>If you have any questions about these Terms and Conditions, please contact us:</p>
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
              <Link href="/privacy-policy" style={{ color: "#C8873A" }}>Privacy Policy</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
