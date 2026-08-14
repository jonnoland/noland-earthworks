import { useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";

const services = [
  "Forestry Mulching",
  "Land Management",
  "Vegetation Management",
  "Right-of-Way Clearing",
  "Trail Cutting",
  "Fence Line Clearing",
  "Selective Clearing",
  "Brush Hogging",
  "Not sure — I need a site visit",
];

const initialForm = {
  name: "",
  phone: "",
  email: "",
  service: "",
  street: "",
  county: "",
  acreage: "",
  message: "",
  preferredContact: "call",
  timing: "",
};

function fieldClassName(hasError = false) {
  return `mt-2 w-full border bg-white/[0.04] px-3 py-3 font-['Lato'] text-base text-white outline-none transition placeholder:text-white/35 focus:border-[#E07B2A] ${hasError ? "border-red-400" : "border-white/15"}`;
}

export default function QuotePage() {
  usePageTitle(
    "Request a Site Visit — Noland Earthworks",
    "Request a site visit for forestry mulching and land management in Middle and West Tennessee. Final scope and pricing are confirmed after a property review.",
    "/quote"
  );

  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submitRequest = trpc.quote.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setError("");
    },
    onError: (mutationError) => setError(mutationError.message || "Something went wrong. Please call 615-406-4819 and we will help.")
  });

  const update = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: "" }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Please enter your name.";
    if (!/[0-9]{7,}/.test(form.phone.replace(/\D/g, ""))) nextErrors.phone = "Please enter a phone number we can use.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Please enter a valid email address.";
    if (!form.service) nextErrors.service = "Please select the type of work you need.";
    if (!form.county.trim()) nextErrors.county = "Please tell us the county where the property is located.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    submitRequest.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      service: form.service,
      county: form.county.trim(),
      acreage: form.acreage.trim(),
      street: form.street.trim(),
      state: "TN",
      message: [
        form.message.trim(),
        `Preferred contact: ${form.preferredContact}.`,
        form.timing ? `Preferred timing: ${form.timing}.` : "",
      ].filter(Boolean).join("\n"),
      addOns: [],
      estimatedRange: "",
      serviceBreakdown: [],
    });
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#F0EDE6]">
      <Navbar />
      <main className="px-4 pb-16 pt-32 sm:pt-40">
        <div className="container grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <section className="lg:sticky lg:top-32">
            <p className="font-['Oswald'] text-xs font-semibold uppercase tracking-[0.2em] text-[#E07B2A]">Start here</p>
            <h1 className="mt-4 font-['Oswald'] text-4xl font-bold uppercase leading-[1.04] sm:text-6xl">Request a <span className="text-[#E07B2A]">site visit.</span></h1>
            <p className="mt-6 max-w-xl font-['Lato'] text-lg leading-8 text-white/75">Tell Jon what you want to accomplish and where the property is. He will review the request, contact you, and confirm the scope on site before preparing a written quote.</p>
            <div className="mt-8 border border-[#E07B2A]/30 bg-[#E07B2A]/10 p-5">
              <div className="flex gap-3"><ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#E07B2A]" aria-hidden="true" /><p className="font-['Lato'] text-sm leading-6 text-white/80">No online pricing or automated final quote. A property review is required because vegetation, access, terrain, boundaries, and obstacles must be confirmed.</p></div>
            </div>
            <div className="mt-7 border-t border-white/10 pt-6 font-['Lato'] text-sm text-white/65">
              <p className="font-semibold text-white">What happens next</p>
              <ol className="mt-3 space-y-2 leading-6"><li>1. Jon reviews your request.</li><li>2. He contacts you to confirm the property and visit.</li><li>3. After the visit, you receive a written scope and quote.</li></ol>
              <a className="mt-5 inline-flex items-center gap-2 text-[#E07B2A] hover:text-[#f28c35]" href="tel:6154064819"><Phone size={16} /> Prefer to call? 615-406-4819</a>
            </div>
          </section>

          <section className="border border-white/10 bg-[#191919] p-5 sm:p-8">
            {submitted ? (
              <div className="py-8 text-center" role="status">
                <CheckCircle2 className="mx-auto h-12 w-12 text-[#E07B2A]" aria-hidden="true" />
                <h2 className="mt-5 font-['Oswald'] text-3xl font-bold uppercase">Request received.</h2>
                <p className="mx-auto mt-4 max-w-lg font-['Lato'] leading-7 text-white/70">Thank you. Jon will review the property details and contact you about the next step. Final scope and pricing are confirmed after the site visit.</p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><a href="/" className="inline-flex min-h-11 items-center justify-center border border-white/20 px-5 font-['Oswald'] text-xs font-semibold uppercase tracking-[0.12em] text-white">Back to Home</a><button type="button" onClick={() => { setSubmitted(false); setForm(initialForm); }} className="min-h-11 bg-[#E07B2A] px-5 font-['Oswald'] text-xs font-semibold uppercase tracking-[0.12em] text-white">Submit Another Request</button></div>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="mb-7"><p className="font-['Oswald'] text-xs font-semibold uppercase tracking-[0.18em] text-[#E07B2A]">Site Visit Request</p><h2 className="mt-2 font-['Oswald'] text-3xl font-bold uppercase">A few details to get started</h2><p className="mt-3 font-['Lato'] text-sm leading-6 text-white/60">Required fields are marked with an asterisk.</p></div>
                {error && <p role="alert" className="mb-5 flex gap-2 border border-red-400/35 bg-red-400/10 p-3 font-['Lato'] text-sm text-red-200"><AlertCircle className="h-5 w-5 shrink-0" />{error}</p>}
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Name *<input name="name" autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} className={fieldClassName(Boolean(errors.name))} />{errors.name && <span className="mt-1 block font-['Lato'] normal-case tracking-normal text-red-300">{errors.name}</span>}</label>
                  <label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Phone *<input name="phone" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} className={fieldClassName(Boolean(errors.phone))} />{errors.phone && <span className="mt-1 block font-['Lato'] normal-case tracking-normal text-red-300">{errors.phone}</span>}</label>
                </div>
                <label className="mt-5 block font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Email *<input name="email" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={fieldClassName(Boolean(errors.email))} />{errors.email && <span className="mt-1 block font-['Lato'] normal-case tracking-normal text-red-300">{errors.email}</span>}</label>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Type of work *<select name="service" value={form.service} onChange={(e) => update("service", e.target.value)} className={fieldClassName(Boolean(errors.service))}><option value="" className="bg-[#191919]">Select a service</option>{services.map((service) => <option key={service} value={service} className="bg-[#191919]">{service}</option>)}</select>{errors.service && <span className="mt-1 block font-['Lato'] normal-case tracking-normal text-red-300">{errors.service}</span>}</label>
                  <label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">County *<input name="county" value={form.county} onChange={(e) => update("county", e.target.value)} className={fieldClassName(Boolean(errors.county))} placeholder="Example: Dickson County" />{errors.county && <span className="mt-1 block font-['Lato'] normal-case tracking-normal text-red-300">{errors.county}</span>}</label>
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-[1.5fr_0.5fr]"><label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Property address <span className="text-white/40">(optional)</span><input name="street" autoComplete="street-address" value={form.street} onChange={(e) => update("street", e.target.value)} className={fieldClassName()} placeholder="Street address or road name" /></label><label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Approx. size <span className="text-white/40">(optional)</span><input name="acreage" inputMode="decimal" value={form.acreage} onChange={(e) => update("acreage", e.target.value)} className={fieldClassName()} placeholder="Acres" /></label></div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Best way to reach you<select value={form.preferredContact} onChange={(e) => update("preferredContact", e.target.value)} className={fieldClassName()}><option value="call" className="bg-[#191919]">Call</option><option value="text" className="bg-[#191919]">Text</option><option value="email" className="bg-[#191919]">Email</option></select></label><label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Preferred timing <span className="text-white/40">(optional)</span><input value={form.timing} onChange={(e) => update("timing", e.target.value)} className={fieldClassName()} placeholder="Example: This month" /></label></div>
                <label className="mt-5 block font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">What would you like to accomplish?<textarea name="message" value={form.message} onChange={(e) => update("message", e.target.value.slice(0, 1200))} className={`${fieldClassName()} min-h-32 resize-y`} placeholder="Describe the work area, vegetation, access, goals, concerns, or anything Jon should know before the visit." /><span className="mt-1 block text-right font-['Lato'] normal-case tracking-normal text-white/40">{form.message.length}/1200</span></label>
                <p className="mt-6 font-['Lato'] text-xs leading-5 text-white/45">By submitting, you ask Noland Earthworks to review this site-visit request and contact you about the project. Your details may be stored in the native operations system and used with service providers for email, SMS/phone, mapping, AI-assisted internal drafting, hosting/storage, and payment if work is approved. See the <a className="text-[#E07B2A] underline" href="/privacy-policy">Privacy Policy</a>.</p>
                <button type="submit" disabled={submitRequest.isPending} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#E07B2A] px-6 font-['Oswald'] text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#f28c35] disabled:cursor-not-allowed disabled:opacity-60">{submitRequest.isPending ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending request</> : "Request a Site Visit"}</button>
              </form>
            )}
          </section>
        </div>
      </main>
      <Footer />
      <MobileCTABar />
    </div>
  );
}
