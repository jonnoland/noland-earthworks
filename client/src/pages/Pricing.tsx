import { CheckCircle2, ClipboardCheck, MapPin, Phone, TreePine } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { usePageTitle } from "@/hooks/usePageTitle";

const scopeFactors = [
  {
    title: "Vegetation and terrain",
    detail: "Brush density, tree size, slope, wet ground, rocks, and hidden obstacles all affect how the work must be planned.",
    icon: TreePine,
  },
  {
    title: "Access and work boundary",
    detail: "Gate width, trailer access, utilities, structures, and the exact area you want cleared must be confirmed on site.",
    icon: MapPin,
  },
  {
    title: "Your intended result",
    detail: "A pasture reclaim, trail, fence line, driveway corridor, selective clearing project, and right-of-way each require a different scope.",
    icon: ClipboardCheck,
  },
];

export default function PricingPage() {
  usePageTitle(
    "Request a Site Visit — Noland Earthworks",
    "Request a free on-site visit for forestry mulching and land management in Middle and West Tennessee. Final scope and pricing are confirmed after a property review.",
    "/pricing"
  );

  return (
    <div className="min-h-screen bg-[#121212] text-[#F0EDE6]">
      <Navbar />
      <main>
        <section className="border-b border-orange-400/15 bg-gradient-to-b from-[#1a1a1a] to-[#121212] px-4 pb-16 pt-36 sm:pb-20 sm:pt-44">
          <div className="container max-w-4xl">
            <p className="mb-4 font-['Oswald'] text-xs font-semibold uppercase tracking-[0.2em] text-[#E07B2A]">Project planning</p>
            <h1 className="max-w-3xl font-['Oswald'] text-4xl font-bold uppercase leading-[1.05] sm:text-6xl">
              Start with a <span className="text-[#E07B2A]">site visit.</span>
            </h1>
            <p className="mt-6 max-w-2xl font-['Lato'] text-lg leading-8 text-white/75">
              Every property is different. Jon reviews the work area, vegetation, terrain, access, and your goal before providing a written scope and final price.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="/quote" className="inline-flex min-h-12 items-center justify-center bg-[#E07B2A] px-6 font-['Oswald'] text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#f28c35]">Request a Site Visit</a>
              <a href="tel:6154064819" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/25 px-6 font-['Oswald'] text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:border-[#E07B2A] hover:text-[#E07B2A]"><Phone size={16} /> Call 615-406-4819</a>
            </div>
          </div>
        </section>

        <section className="bg-[#161616] px-4 py-16 sm:py-20">
          <div className="container">
            <div className="max-w-2xl">
              <h2 className="font-['Oswald'] text-3xl font-bold uppercase sm:text-4xl">What Jon reviews before quoting</h2>
              <p className="mt-4 font-['Lato'] leading-7 text-white/65">A site visit prevents surprises and keeps the written scope tied to the land you actually want to use. It is also the right time to identify trees to preserve, work boundaries, access concerns, and services that are outside Noland Earthworks’ scope.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {scopeFactors.map(({ title, detail, icon: Icon }) => (
                <article key={title} className="border border-white/10 bg-white/[0.025] p-6">
                  <Icon className="h-6 w-6 text-[#E07B2A]" aria-hidden="true" />
                  <h3 className="mt-5 font-['Oswald'] text-xl font-semibold uppercase">{title}</h3>
                  <p className="mt-3 font-['Lato'] text-sm leading-6 text-white/65">{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:py-20">
          <div className="container grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <p className="font-['Oswald'] text-xs font-semibold uppercase tracking-[0.2em] text-[#E07B2A]">How to prepare</p>
              <h2 className="mt-3 font-['Oswald'] text-3xl font-bold uppercase sm:text-4xl">Bring the goal. We will build the scope.</h2>
              <ul className="mt-7 space-y-4 font-['Lato'] text-white/75">
                {["Tell us what you want the land to be used for after the work is complete.", "Mark or point out boundaries, utilities, structures, gates, and trees you want to preserve.", "Share access information, timing needs, and any known wet areas or obstacles.", "Use the request form to upload photos or a map pin if that is convenient; those details help prepare for the visit."].map((item) => (
                  <li key={item} className="flex gap-3 leading-6"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#E07B2A]" aria-hidden="true" />{item}</li>
                ))}
              </ul>
            </div>
            <aside className="border border-[#E07B2A]/30 bg-[#E07B2A]/10 p-7">
              <h2 className="font-['Oswald'] text-2xl font-bold uppercase">Services we can discuss on site</h2>
              <p className="mt-4 font-['Lato'] leading-7 text-white/75">Forestry mulching, land management, vegetation management, right-of-way clearing, trail cutting, fence-line clearing, selective clearing, and brush hogging when it fits the work.</p>
              <p className="mt-4 font-['Lato'] text-sm leading-6 text-white/60">Noland Earthworks does not provide grading, excavation, debris hauling, or arborist-scale tree removal.</p>
              <a href="/quote" className="mt-6 inline-flex min-h-11 items-center justify-center bg-[#E07B2A] px-5 font-['Oswald'] text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#f28c35]">Request a Site Visit</a>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
      <MobileCTABar />
    </div>
  );
}
