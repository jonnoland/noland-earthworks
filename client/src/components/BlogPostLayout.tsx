/*
 * Shared layout for individual blog post pages.
 * Renders hero, article body, and a CTA footer.
 */
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ArrowLeft, Calendar, RefreshCw } from "lucide-react";

export interface BlogPostProps {
  title: string;
  pageTitle: string;
  metaDescription?: string;
  date: string;             // e.g. "March 2025" — original publish date
  dateISO?: string;         // e.g. "2025-03-01" for schema
  lastUpdated?: string;     // e.g. "April 2026" — shown when content was revised
  lastUpdatedISO?: string;  // e.g. "2026-04-12" for schema / OG
  readTime: string;
  category: string;
  slug: string;             // e.g. "cost-of-land-clearing-tennessee"
  children: React.ReactNode;
}

export default function BlogPostLayout({
  title,
  pageTitle,
  metaDescription,
  date,
  dateISO,
  lastUpdated,
  lastUpdatedISO,
  readTime,
  category,
  slug,
  children,
}: BlogPostProps) {
  usePageTitle(pageTitle, metaDescription, `/blog/${slug}`);

  // Inject article:modified_time Open Graph meta tag
  useEffect(() => {
    const modifiedDate = lastUpdatedISO ?? dateISO;
    if (!modifiedDate) return;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta("article:published_time", dateISO ?? modifiedDate);
    setMeta("article:modified_time", modifiedDate);
    setMeta("og:type", "article");

    return () => {
      // Reset to website on unmount
      const ogType = document.querySelector<HTMLMetaElement>('meta[property="og:type"]');
      if (ogType) ogType.content = "website";
      const pubTime = document.querySelector<HTMLMetaElement>('meta[property="article:published_time"]');
      if (pubTime) pubTime.remove();
      const modTime = document.querySelector<HTMLMetaElement>('meta[property="article:modified_time"]');
      if (modTime) modTime.remove();
    };
  }, [dateISO, lastUpdatedISO]);

  // Inject Article JSON-LD schema for Google rich results
  useEffect(() => {
    const id = `article-schema-${slug}`;
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: metaDescription ?? "",
      datePublished: dateISO ?? "",
      dateModified: lastUpdatedISO ?? dateISO ?? "",
      author: {
        "@type": "Organization",
        name: "Noland Earthworks",
        url: "https://www.nolandearthworks.com",
      },
      publisher: {
        "@type": "Organization",
        name: "Noland Earthworks",
        url: "https://www.nolandearthworks.com",
        logo: {
          "@type": "ImageObject",
          url: "https://www.nolandearthworks.com/logo.png",
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `https://www.nolandearthworks.com/blog/${slug}`,
      },
    });
    return () => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, [slug, title, metaDescription, dateISO, lastUpdatedISO]);

  return (
    <div style={{ backgroundColor: "#121212", color: "#F0EDE6", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section
        style={{
          backgroundColor: "#0a0a0a",
          paddingTop: "8rem",
          paddingBottom: "3rem",
          borderBottom: "1px solid rgba(224,123,42,0.15)",
          position: "relative",
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: "#E07B2A" }}
        />
        <div className="container" style={{ maxWidth: "820px" }}>
          <a
            href="/blog"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(240,237,230,0.5)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              marginBottom: "1.25rem",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#E07B2A")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,237,230,0.5)")}
          >
            <ArrowLeft size={13} /> Back to Resources
          </a>

          <div className="flex items-center gap-3 mb-4" style={{ flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#E07B2A",
                backgroundColor: "rgba(224,123,42,0.12)",
                padding: "0.2rem 0.6rem",
                border: "1px solid rgba(224,123,42,0.2)",
              }}
            >
              {category}
            </span>

            {/* Original publish date */}
            <span
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.75rem",
                color: "rgba(240,237,230,0.4)",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <Calendar size={11} />
              <time dateTime={dateISO}>{date}</time>
            </span>

            {/* Last updated badge — only shown when content has been revised */}
            {lastUpdated && lastUpdated !== date && (
              <>
                <span style={{ color: "rgba(240,237,230,0.2)" }}>·</span>
                <span
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.75rem",
                    color: "rgba(224,123,42,0.85)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                  title="This article has been reviewed and updated for accuracy"
                >
                  <RefreshCw size={11} />
                  Updated{" "}
                  <time dateTime={lastUpdatedISO}>{lastUpdated}</time>
                </span>
              </>
            )}

            <span style={{ color: "rgba(240,237,230,0.2)" }}>·</span>
            <span
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.75rem",
                color: "rgba(240,237,230,0.4)",
              }}
            >
              {readTime}
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 4.5vw, 3rem)",
              lineHeight: 1.1,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "1.25rem",
            }}
          >
            {title}
          </h1>

          {/* Author byline */}
          <div className="flex items-center gap-3" style={{ marginTop: "0.5rem" }}>
            <div
              className="flex items-center justify-center w-9 h-9 flex-shrink-0"
              style={{
                backgroundColor: "#E07B2A",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "#fff",
              }}
            >
              N
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  letterSpacing: "0.04em",
                  color: "#F0EDE6",
                }}
              >
                Noland Earthworks Team
              </div>
              <div
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.72rem",
                  color: "rgba(240,237,230,0.45)",
                  letterSpacing: "0.05em",
                }}
              >
                Veteran-owned land clearing &amp; forestry mulching specialists, Middle Tennessee
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Article body */}
      <article className="container py-14" style={{ maxWidth: "820px" }}>
        <div className="blog-content">{children}</div>
      </article>

      {/* CTA */}
      <section
        className="container pb-20"
        style={{
          borderTop: "1px solid rgba(240,237,230,0.08)",
          paddingTop: "3rem",
          maxWidth: "820px",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(224,123,42,0.07)",
            border: "1px solid rgba(224,123,42,0.2)",
            padding: "2rem",
          }}
        >
          <p
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "1.3rem",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "0.5rem",
            }}
          >
            Ready to get started?
          </p>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.95rem",
              color: "rgba(240,237,230,0.7)",
              marginBottom: "1.25rem",
            }}
          >
            Contact Noland Earthworks today for a free, no-obligation on-site estimate anywhere in
            Middle Tennessee.
          </p>
          <a href="/quote" className="btn-amber" style={{ textDecoration: "none" }}>
            Get a Free Quote →
          </a>
        </div>
      </section>

      <MobileCTABar />
      <Footer />
    </div>
  );
}
