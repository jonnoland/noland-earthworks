import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, MapPin, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServiceAreaMiniMap from "@/components/ServiceAreaMiniMap";
import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatUsPhoneInput, validateSiteVisitRequest } from "@shared/siteVisitValidation";
import { isServedCounty, normalizeCountyName, SERVICE_AREA_COUNTIES } from "@shared/serviceAreas";

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
  city: "",
  state: "TN",
  zip: "",
  county: "",
  acreage: "",
  message: "",
  preferredContact: "call",
  smsConsent: false,
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
  const [addressFocused, setAddressFocused] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [appliedPlaceId, setAppliedPlaceId] = useState("");
  const [addressAreaNote, setAddressAreaNote] = useState("");
  const [currentCoordinates, setCurrentCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "resolving">("idle");
  const addressFieldRef = useRef<HTMLInputElement>(null);
  const addressInput = form.street.trim();
  const addressSuggestions = trpc.quote.placesAutocomplete.useQuery(
    { input: addressInput || "x" },
    { enabled: addressFocused && addressInput.length >= 3, staleTime: 60_000 }
  );
  const selectedAddress = trpc.quote.placeDetails.useQuery(
    { placeId: selectedPlaceId || "x" },
    { enabled: Boolean(selectedPlaceId), staleTime: 5 * 60_000 }
  );
  const currentLocationAddress = trpc.quote.reverseGeocode.useQuery(
    { lat: currentCoordinates?.lat ?? 0, lng: currentCoordinates?.lng ?? 0 },
    { enabled: Boolean(currentCoordinates), staleTime: 0 }
  );

  const applyResolvedAddress = (place: { formattedAddress: string; street: string; city: string; state: string; zip: string; county: string }) => {
    const normalizedPlaceCounty = normalizeCountyName(place.county);
    const countyIsServed = isServedCounty(place.county);
    setForm((current) => ({ ...current, street: place.street || place.formattedAddress, city: place.city || current.city, state: place.state || "TN", zip: place.zip || current.zip, county: countyIsServed ? normalizedPlaceCounty : current.county }));
    setAddressAreaNote(place.county && !countyIsServed ? `This address appears to be in ${normalizedPlaceCounty}, which is outside the current listed service area.` : "");
    if (countyIsServed) setErrors((current) => ({ ...current, county: "" }));
  };

  useEffect(() => {
    if (!selectedPlaceId || appliedPlaceId === selectedPlaceId || !selectedAddress.data?.formattedAddress) return;
    applyResolvedAddress(selectedAddress.data);
    setAddressFocused(false);
    setAppliedPlaceId(selectedPlaceId);
  }, [appliedPlaceId, selectedAddress.data, selectedPlaceId]);

  useEffect(() => {
    if (!currentCoordinates || !currentLocationAddress.data?.formattedAddress) return;
    applyResolvedAddress(currentLocationAddress.data);
    setCurrentCoordinates(null);
    setLocationStatus("idle");
  }, [currentCoordinates, currentLocationAddress.data]);

  useEffect(() => {
    if (!currentCoordinates || currentLocationAddress.isFetching || !currentLocationAddress.data || currentLocationAddress.data.formattedAddress) return;
    setLocationError("We could not turn your current location into an address. You can still type or select the property address manually.");
    setCurrentCoordinates(null);
    setLocationStatus("idle");
  }, [currentCoordinates, currentLocationAddress.data, currentLocationAddress.isFetching]);

  const useCurrentLocation = () => {
    setLocationError("");
    setAddressAreaNote("");
    if (!navigator.geolocation) {
      setLocationError("This browser cannot provide location. You can still type or select the property address manually.");
      return;
    }
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("resolving");
      },
      () => {
        setLocationStatus("idle");
        setLocationError("Your location was not shared. You can still type or select the property address manually below.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  };

  const isResolvingLocation = locationStatus !== "idle" || currentLocationAddress.isFetching;

  const submitRequest = trpc.quote.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setError("");
    },
    onError: (mutationError) => setError(mutationError.message || "Something went wrong. Please call 615-406-4819 and we will help.")
  });

  const update = (field: keyof typeof initialForm, value: string | boolean) => {
    const normalizedValue = field === "phone" && typeof value === "string" ? formatUsPhoneInput(value) : value;
    setForm((current) => ({ ...current, [field]: normalizedValue }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validateField = (field: keyof typeof initialForm) => {
    const fieldErrors = validateSiteVisitRequest(form);
    setErrors((current) => ({ ...current, [field]: fieldErrors[field] ?? "" }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateSiteVisitRequest(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    submitRequest.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      smsConsent: form.smsConsent,
      service: form.service,
      county: form.county.trim(),
      acreage: form.acreage.trim(),
      street: form.street.trim(),
      city: form.city.trim(),
      state: form.state,
      zip: form.zip.trim(),
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
                  <label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Name *<input name="name" autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} onBlur={() => validateField("name")} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "site-visit-name-error" : undefined} className={fieldClassName(Boolean(errors.name))} placeholder="Your name" />{errors.name ? <span id="site-visit-name-error" className="mt-1 block font-['Lato'] normal-case tracking-normal text-red-300">{errors.name}</span> : <span className="mt-1 block font-['Lato'] normal-case tracking-normal text-white/40">This is how Jon will address you.</span>}</label>
                  <label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Phone *<input name="phone" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} onBlur={() => validateField("phone")} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "site-visit-phone-error" : undefined} className={fieldClassName(Boolean(errors.phone))} placeholder="(615) 406-4819" />{errors.phone ? <span id="site-visit-phone-error" className="mt-1 block font-['Lato'] normal-case tracking-normal text-red-300">{errors.phone}</span> : <span className="mt-1 block font-['Lato'] normal-case tracking-normal text-white/40">A 10-digit number for the visit follow-up.</span>}</label>
                </div>
                <label className="mt-5 block font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Email *<input type="email" name="email" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => update("email", e.target.value)} onBlur={() => validateField("email")} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "site-visit-email-error" : undefined} className={fieldClassName(Boolean(errors.email))} placeholder="name@example.com" />{errors.email ? <span id="site-visit-email-error" className="mt-1 block font-['Lato'] normal-case tracking-normal text-red-300">{errors.email}</span> : <span className="mt-1 block font-['Lato'] normal-case tracking-normal text-white/40">Your written scope and quote are sent here after the visit.</span>}</label>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Type of work *<select name="service" value={form.service} onChange={(e) => update("service", e.target.value)} className={fieldClassName(Boolean(errors.service))}><option value="" className="bg-[#191919]">Select a service</option>{services.map((service) => <option key={service} value={service} className="bg-[#191919]">{service}</option>)}</select>{errors.service && <span className="mt-1 block font-['Lato'] normal-case tracking-normal text-red-300">{errors.service}</span>}</label>
                  <label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">County *<select name="county" value={form.county} onChange={(e) => { update("county", e.target.value); setAddressAreaNote(""); }} onBlur={() => validateField("county")} aria-invalid={Boolean(errors.county)} className={fieldClassName(Boolean(errors.county))}><option value="" className="bg-[#191919]">Select a service-area county</option>{SERVICE_AREA_COUNTIES.map((county) => <option key={county} value={county} className="bg-[#191919]">{county}</option>)}</select>{errors.county ? <span className="mt-1 block font-['Lato'] normal-case tracking-normal text-red-300">{errors.county}</span> : <span className="mt-1 block font-['Lato'] normal-case tracking-normal text-white/40">Required. We currently schedule site visits in the listed Middle and West Tennessee counties.</span>}</label>
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-[1.5fr_0.5fr]">
                  <div className="relative"><div className="flex items-end justify-between gap-3"><label className="min-w-0 flex-1 font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Property address <span className="text-white/40">(optional)</span><input ref={addressFieldRef} name="street" autoComplete="street-address" value={form.street} onFocus={() => setAddressFocused(true)} onBlur={() => window.setTimeout(() => setAddressFocused(false), 160)} onChange={(e) => { update("street", e.target.value); setSelectedPlaceId(""); setAppliedPlaceId(""); setAddressAreaNote(""); }} className={fieldClassName()} placeholder="Start typing the property address" /><span className="mt-1 block font-['Lato'] normal-case tracking-normal text-white/40">Choose a suggested address to fill County, City, and ZIP when available.</span></label><button type="button" onClick={useCurrentLocation} disabled={isResolvingLocation} aria-busy={isResolvingLocation} className="mb-0.5 inline-flex min-h-11 shrink-0 items-center gap-2 border border-[#E07B2A]/60 px-3 font-['Oswald'] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#f0ede6] transition hover:bg-[#E07B2A]/15 disabled:opacity-60">{isResolvingLocation ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Finding address…</> : "Use my location"}</button></div>{addressFocused && addressInput.length >= 3 && (addressSuggestions.isFetching || (addressSuggestions.data?.suggestions.length ?? 0) > 0) && <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto border border-white/20 bg-[#171717] shadow-xl">{addressSuggestions.isFetching ? <p className="px-3 py-3 font-['Lato'] text-sm text-white/55">Finding addresses…</p> : addressSuggestions.data?.suggestions.map((suggestion) => <button key={suggestion.placeId} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setSelectedPlaceId(suggestion.placeId)} className="flex w-full items-start gap-2 border-b border-white/10 px-3 py-3 text-left font-['Lato'] text-sm text-white/80 transition hover:bg-white/10"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#E07B2A]" />{suggestion.description}</button>)}</div>}{locationError && <div role="status" className="mt-2 border border-amber-400/35 bg-amber-400/10 p-3 font-['Lato'] text-xs leading-5 text-amber-100"><p>{locationError}</p><button type="button" onClick={() => addressFieldRef.current?.focus()} className="mt-2 font-semibold text-[#f6ad68] underline underline-offset-2">Enter the property address manually</button></div>}{addressAreaNote && <div role="status" className="mt-2 border border-amber-400/35 bg-amber-400/10 p-3 font-['Lato'] text-xs leading-5 text-amber-100"><p className="font-semibold">This property appears to be outside our standard service area.</p><p className="mt-1">{addressAreaNote} Jon may still be able to discuss a custom quote or add the property to a future-service waitlist.</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1"><a href="tel:6154064819" className="font-semibold text-[#f6ad68] underline underline-offset-2">Call about a custom quote</a><a href="mailto:quotes@nolandearthworks.com?subject=Custom%20quote%20or%20waitlist%20request" className="font-semibold text-[#f6ad68] underline underline-offset-2">Request custom quote / waitlist</a></div></div>}</div>
                  <aside className="border border-[#E07B2A]/25 bg-[#E07B2A]/5 p-3 font-['Lato'] text-xs leading-5 text-white/65"><p className="font-['Oswald'] text-xs font-semibold uppercase tracking-[0.12em] text-[#E07B2A]">Service area</p><p className="mt-1">We schedule on-site visits in 35 listed Middle and West Tennessee counties.</p><div className="mt-3"><ServiceAreaMiniMap /></div><details className="mt-2"><summary className="cursor-pointer font-semibold text-white/85">View supported counties</summary><ul className="mt-2 columns-2 gap-3 text-[11px] leading-5 text-white/55">{SERVICE_AREA_COUNTIES.map((county) => <li key={`reference-${county}`}>{county.replace(" County", "")}</li>)}</ul></details></aside>
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_0.55fr_0.45fr]">
                  <label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">City <span className="text-white/40">(from address)</span><input name="city" autoComplete="address-level2" value={form.city} onChange={(e) => update("city", e.target.value)} className={fieldClassName()} placeholder="City" /></label>
                  <label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">ZIP <span className="text-white/40">(from address)</span><input name="zip" autoComplete="postal-code" inputMode="numeric" value={form.zip} onChange={(e) => update("zip", e.target.value)} className={fieldClassName()} placeholder="ZIP" /></label>
                  <label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Approx. size <span className="text-white/40">(optional)</span><input name="acreage" inputMode="decimal" value={form.acreage} onChange={(e) => update("acreage", e.target.value)} className={fieldClassName()} placeholder="Acres" /></label>
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Best way to reach you<select value={form.preferredContact} onChange={(e) => update("preferredContact", e.target.value)} className={fieldClassName()}><option value="call" className="bg-[#191919]">Call</option><option value="text" className="bg-[#191919]">Text</option><option value="email" className="bg-[#191919]">Email</option></select></label><label className="font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">Preferred timing <span className="text-white/40">(optional)</span><input value={form.timing} onChange={(e) => update("timing", e.target.value)} className={fieldClassName()} placeholder="Example: This month" /></label></div>
                <label className="mt-5 block font-['Oswald'] text-xs uppercase tracking-[0.12em] text-white/65">What would you like to accomplish?<textarea name="message" value={form.message} onChange={(e) => update("message", e.target.value.slice(0, 1200))} className={`${fieldClassName()} min-h-32 resize-y`} placeholder="Describe the work area, vegetation, access, goals, concerns, or anything Jon should know before the visit." /><span className="mt-1 block text-right font-['Lato'] normal-case tracking-normal text-white/40">{form.message.length}/1200</span></label>
                {form.preferredContact === "text" && <label className="mt-5 flex cursor-pointer items-start gap-3 border border-white/10 bg-white/[0.03] p-4 font-['Lato'] text-xs leading-5 text-white/65"><input type="checkbox" checked={form.smsConsent} onChange={(e) => update("smsConsent", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#E07B2A]" /><span>I agree to receive project-related text messages at the number provided, including site-visit, scheduling, weather, service, proposal, invoice, and payment updates. Consent is not required to request service. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help.</span></label>}
                {errors.smsConsent && <p className="mt-2 font-['Lato'] text-xs text-red-300">{errors.smsConsent}</p>}
                <p className="mt-6 font-['Lato'] text-xs leading-5 text-white/45">By submitting, you ask Noland Earthworks to review this Site Visit Request and contact you about the project. We create a native request and client record, and use service providers for email, phone/SMS, hosting and storage, analytics, and AI-assisted internal request organization. If work is approved, payment details are handled by Stripe; Noland Earthworks does not intend to store your payment-card number. Do not include sensitive information that is not needed for your request. See the <a className="text-[#E07B2A] underline" href="/privacy-policy">Privacy Policy</a>.</p>
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
