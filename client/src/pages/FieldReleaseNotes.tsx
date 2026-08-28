import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";

export default function FieldReleaseNotes() {
  const { data: release, isLoading } = trpc.fieldQuote.latestVersion.useQuery(undefined, { staleTime: 5 * 60 * 1000, retry: 1 });
  const version = release?.version ?? "0.4.14";

  usePageTitle(`Noland Field v${version} Release Notes`, "Noland Field update notes and Android installation information for Noland Earthworks.", "/field-release-notes");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
      <Navbar />
      <main>
        <section className="py-20 text-center" style={{ backgroundColor: "#1A1A1A", borderBottom: "1px solid rgba(224,123,42,0.22)" }}>
          <div className="container max-w-3xl mx-auto px-5">
            <p style={{ color: "#E07B2A", fontFamily: "'Oswald', sans-serif", fontSize: "0.86rem", letterSpacing: "0.15em", margin: "0 0 0.6rem" }}>NOLAND FIELD</p>
            <h1 style={{ color: "#F0EDE6", fontFamily: "'Oswald', sans-serif", fontSize: "clamp(2.5rem, 6vw, 4rem)", letterSpacing: "0.02em", lineHeight: 1, margin: 0 }}>v{version} Release Notes</h1>
            <p style={{ color: "rgba(240,237,230,0.68)", fontFamily: "'Lato', sans-serif", fontSize: "1rem", lineHeight: 1.6, margin: "1rem auto 0", maxWidth: 620 }}>This update keeps your field estimate workflow connected to the saved Operations pricing basis when service is unreliable.</p>
          </div>
        </section>

        <section className="container max-w-3xl mx-auto px-5 py-14" style={{ fontFamily: "'Lato', sans-serif" }}>
          {isLoading ? <p style={{ color: "rgba(240,237,230,0.65)", lineHeight: 1.7 }}>Loading the current release details…</p> : (
            <>
              <div style={{ borderLeft: "4px solid #E07B2A", background: "rgba(224,123,42,0.09)", borderRadius: "0 10px 10px 0", padding: "1.25rem 1.35rem", marginBottom: "2.25rem" }}>
                <h2 style={{ color: "#F0EDE6", fontFamily: "'Oswald', sans-serif", fontSize: "1.6rem", margin: "0 0 0.55rem" }}>What changed</h2>
                <p style={{ color: "rgba(240,237,230,0.80)", lineHeight: 1.7, margin: 0 }}>{release?.notes ?? "Release details are temporarily unavailable. Please refresh this page."}</p>
              </div>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ color: "#F0EDE6", fontFamily: "'Oswald', sans-serif", fontSize: "1.8rem", borderBottom: "2px solid rgba(224,123,42,0.30)", paddingBottom: "0.55rem", marginBottom: "1rem" }}>Highlights</h2>
                {release?.highlights?.length ? (
                  <ul style={{ color: "rgba(240,237,230,0.82)", lineHeight: 1.8, paddingLeft: "1.35rem", margin: 0 }}>
                    {release.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
                  </ul>
                ) : <p style={{ color: "rgba(240,237,230,0.65)", lineHeight: 1.7 }}>Release highlights are temporarily unavailable. Please refresh this page.</p>}
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ color: "#F0EDE6", fontFamily: "'Oswald', sans-serif", fontSize: "1.8rem", borderBottom: "2px solid rgba(224,123,42,0.30)", paddingBottom: "0.55rem", marginBottom: "1rem" }}>Install the update</h2>
                <ol style={{ color: "rgba(240,237,230,0.82)", lineHeight: 1.85, paddingLeft: "1.35rem", margin: 0 }}>
                  <li>Open <strong style={{ color: "#F0EDE6" }}>Profile</strong> in Noland Field and select <strong style={{ color: "#F0EDE6" }}>Download Update</strong>.</li>
                  <li>Keep the app open while the signed package downloads. The progress bar reports the actual transfer.</li>
                  <li>When Android opens the installer, approve the update. If the installer does not open, locate the saved Noland Field APK in your device files.</li>
                </ol>
              </section>

              {release?.downloadUrl && <a href={release.downloadUrl} style={{ display: "inline-block", background: "#E07B2A", color: "#14110E", fontFamily: "'Oswald', sans-serif", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.06em", padding: "0.9rem 1.15rem", textDecoration: "none" }}>DOWNLOAD NOLAND FIELD v{version}</a>}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
