/*
 * Shared layout for individual blog post pages.
 * Renders hero, article body, and a CTA footer.
 */
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ArrowLeft, Calendar } from "lucide-react";

export interface BlogPostProps {
  title: string;
  pageTitle: string;
  metaDescription?: string;
  date: string;
  readTime: string;
  category: string;
  children: React.ReactNode;
}

export default function BlogPostLayout({
  title,
  pageTitle,
  metaDescription,
  date,
  readTime,
  category,
  children,
}: BlogPostProps) {
  usePageTitle(pageTitle, metaDescription);

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

          <div className="flex items-center gap-3 mb-4">
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
            <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.4)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Calendar size={11} /> {date}
            </span>
            <span style={{ color: "rgba(240,237,230,0.2)" }}>·</span>
            <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.4)" }}>{readTime}</span>
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
            }}
          >
            {title}
          </h1>
        </div>
      </section>

      {/* Article body */}
      <article className="container py-14" style={{ maxWidth: "820px" }}>
        <div className="blog-content">
          {children}
        </div>
      </article>

      {/* CTA */}
      <section
        className="container pb-20"
        style={{ borderTop: "1px solid rgba(240,237,230,0.08)", paddingTop: "3rem", maxWidth: "820px" }}
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
            Contact Noland Earthworks today for a free, no-obligation on-site estimate anywhere in Middle Tennessee.
          </p>
          <a href="/quote" className="btn-amber" style={{ textDecoration: "none" }}>
            Get a Free Quote →
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
