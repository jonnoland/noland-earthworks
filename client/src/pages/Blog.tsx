/*
 * DESIGN: Heavy Equipment Grit — Blog index page
 * Lists all blog articles with title, meta description, and read-more link.
 */
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ArrowRight, Calendar } from "lucide-react";

export const BLOG_POSTS = [
  {
    slug: "cost-of-land-clearing-tennessee",
    title: "How Much Does Land Clearing Cost in Tennessee? (2026 Guide)",
    meta: "Discover the true cost of land clearing and forestry mulching in Middle Tennessee. Learn what factors affect pricing per acre and how to get the best value.",
    date: "April 2026",
    readTime: "5 min read",
    category: "Pricing & Planning",
  },
  {
    slug: "forestry-mulching-vs-bulldozing",
    title: "Forestry Mulching vs. Bulldozing: Which is Better for Your Property?",
    meta: "Compare forestry mulching and traditional bulldozing for land clearing. Learn why mulching is faster, cheaper, and better for your Tennessee property's soil.",
    date: "April 2026",
    readTime: "5 min read",
    category: "Education",
  },
  {
    slug: "signs-you-need-vegetation-management",
    title: "5 Signs It's Time to Invest in Professional Vegetation Management",
    meta: "Is your property overgrown? Discover the top 5 signs that it's time to hire a professional vegetation management service to restore your land.",
    date: "April 2026",
    readTime: "5 min read",
    category: "Property Tips",
  },
  {
    slug: "best-time-to-clear-land-tennessee",
    title: "Best Time of Year to Clear Land in Middle Tennessee",
    meta: "Wondering when to clear land in Tennessee? Learn the best season for forestry mulching and land clearing in Middle Tennessee to save money and get faster results.",
    date: "April 2026",
    readTime: "5 min read",
    category: "Seasonal Tips",
  },
];

export default function Blog() {
  usePageTitle(
    "Land Clearing Resources & Blog | Noland Earthworks",
    "Expert land clearing and forestry mulching guides for Tennessee property owners. Pricing, methods, and tips from Noland Earthworks — veteran-owned and operated."
  );

  return (
    <div style={{ backgroundColor: "#121212", color: "#F0EDE6", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section
        className="relative flex flex-col justify-center overflow-hidden"
        style={{ minHeight: "38vh", backgroundColor: "#0a0a0a", paddingTop: "7rem" }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: "#E07B2A" }}
        />
        <div className="container relative z-10 py-16">
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#E07B2A",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}
          >
            Resources
          </p>
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2rem, 5vw, 3.75rem)",
              lineHeight: 1.05,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "1rem",
            }}
          >
            Land Clearing <span style={{ color: "#E07B2A" }}>Knowledge Base</span>
          </h1>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.05rem",
              color: "rgba(240,237,230,0.75)",
              maxWidth: "560px",
            }}
          >
            Practical guides and expert insight from the team at Noland Earthworks to help you make informed decisions about your land.
          </p>
        </div>
      </section>

      {/* Article grid */}
      <section className="container py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {BLOG_POSTS.map((post) => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: "none" }}
              className="group block"
            >
              <article
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(240,237,230,0.08)",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                className="h-full flex flex-col group-hover:border-[#E07B2A]/40"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,123,42,0.4)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(240,237,230,0.08)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                {/* Category bar */}
                <div
                  style={{
                    backgroundColor: "rgba(224,123,42,0.12)",
                    borderBottom: "1px solid rgba(224,123,42,0.15)",
                    padding: "0.5rem 1.25rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#E07B2A",
                    }}
                  >
                    {post.category}
                  </span>
                </div>

                <div className="flex flex-col flex-1 p-6 gap-4">
                  <h2
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: "1.2rem",
                      lineHeight: 1.25,
                      letterSpacing: "0.02em",
                      color: "#F0EDE6",
                      textTransform: "uppercase",
                    }}
                  >
                    {post.title}
                  </h2>

                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.9rem",
                      lineHeight: 1.65,
                      color: "rgba(240,237,230,0.65)",
                      flexGrow: 1,
                    }}
                  >
                    {post.meta}
                  </p>

                  <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-3">
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
                        {post.date}
                      </span>
                      <span style={{ color: "rgba(240,237,230,0.2)", fontSize: "0.75rem" }}>·</span>
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.4)" }}>
                        {post.readTime}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#E07B2A",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      Read <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </article>
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        className="container pb-20"
        style={{ borderTop: "1px solid rgba(240,237,230,0.08)", paddingTop: "3rem" }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "1.3rem",
                textTransform: "uppercase",
                color: "#F0EDE6",
                marginBottom: "0.25rem",
              }}
            >
              Ready to clear your land?
            </p>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.9rem", color: "rgba(240,237,230,0.6)" }}>
              Get a free, no-obligation estimate from our veteran-owned team.
            </p>
          </div>
          <a
            href="/quote"
            className="btn-amber"
            style={{ textDecoration: "none", whiteSpace: "nowrap" }}
          >
            Get a Free Quote →
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
