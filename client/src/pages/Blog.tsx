/*
 * DESIGN: Heavy Equipment Grit — Blog index page
 * Lists all blog articles with title, meta description, and read-more link.
 * Includes category filter chips and a search bar for easy navigation.
 */
import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ArrowRight, Calendar, RefreshCw, Search, X } from "lucide-react";

export const BLOG_POSTS = [
  {
    slug: "cost-of-land-management-tennessee",
    title: "How Much Does Land Management Cost in Tennessee? (2026 Guide)",
    meta: "Discover the true cost of land management and forestry mulching in Middle & West Tennessee. Learn what factors affect pricing per acre and how to get the best value.",
    date: "April 2026",
    lastUpdated: "April 2026",
    readTime: "5 min read",
    category: "Pricing & Planning",
  },
  {
    slug: "forestry-mulching-vs-bulldozing",
    title: "Forestry Mulching vs. Bulldozing: Which Is Right for Your Land?",
    meta: "Comparing forestry mulching and bulldozing for land clearing in Tennessee. Learn the pros, cons, and best use cases for each method before you hire.",
    date: "April 2026",
    lastUpdated: "April 2026",
    readTime: "5 min read",
    category: "Methods & Equipment",
  },
  {
    slug: "signs-its-time-for-vegetation-management",
    title: "5 Signs It's Time for Vegetation Management on Your Property",
    meta: "Not sure if your land needs professional vegetation management? Here are five clear signs it's time to call in a forestry mulcher — and why waiting costs you more.",
    date: "April 2026",
    lastUpdated: "April 2026",
    readTime: "4 min read",
    category: "Property Management",
  },
  {
    slug: "best-time-to-clear-land-tennessee",
    title: "Best Time of Year to Clear Land in Tennessee",
    meta: "Timing your land clearing project right can save you money and get better results. Here's when to schedule forestry mulching and land clearing in Middle Tennessee.",
    date: "April 2026",
    lastUpdated: "April 2026",
    readTime: "4 min read",
    category: "Pricing & Planning",
  },
  {
    slug: "site-prep-before-building-tennessee",
    title: "Site Preparation Before Building in Tennessee: What You Need to Know",
    meta: "Planning to build on raw land in Tennessee? Here's what site preparation actually involves, what forestry mulching covers, and what it doesn't.",
    date: "April 2026",
    lastUpdated: "April 2026",
    readTime: "5 min read",
    category: "Property Management",
  },
  {
    slug: "land-management-developers-farmers-middle-tennessee",
    title: "Land Management for Developers and Farmers in Middle Tennessee",
    meta: "Whether you're developing a subdivision or reclaiming overgrown pasture, here's how Noland Earthworks approaches land management for developers and farmers in Middle Tennessee.",
    date: "April 2026",
    lastUpdated: "April 2026",
    readTime: "5 min read",
    category: "Property Management",
  },
  {
    slug: "forestry-mulching-vs-bush-hogging",
    title: "Forestry Mulching vs. Bush Hogging: What's the Difference?",
    meta: "Bush hogging and forestry mulching are not the same thing. Here's a plain-language breakdown of what each method does, what it costs, and when to use which one.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "5 min read",
    category: "Methods & Equipment",
  },
  {
    slug: "how-to-prepare-for-land-clearing-tennessee",
    title: "How to Prepare for a Land Clearing Job in Tennessee",
    meta: "What to do before the mulcher shows up. A practical checklist for Tennessee property owners to get their land clearing project started on the right foot.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "4 min read",
    category: "Pricing & Planning",
  },
  {
    slug: "pasture-reclamation-tennessee",
    title: "Pasture Reclamation in Tennessee: Getting Your Land Back",
    meta: "Cedar encroachment, invasive species, and overgrown brush are taking over Tennessee pastures. Here's how forestry mulching reclaims productive land without the mess.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "5 min read",
    category: "Property Management",
  },
  {
    slug: "land-management-williamson-county",
    title: "Land Management in Williamson County, TN: What Property Owners Need to Know",
    meta: "Need land management in Williamson County, TN? Noland Earthworks provides forestry mulching and land clearing in Franklin, Brentwood, Spring Hill, Nolensville, and across Williamson County.",
    date: "April 2026",
    lastUpdated: "April 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
  {
    slug: "land-management-davidson-county",
    title: "Land Management in Davidson County, TN: What Property Owners Need to Know",
    meta: "Need land management in Davidson County, TN? Noland Earthworks provides forestry mulching and land clearing in Nashville, Antioch, Hermitage, Bellevue, and across Davidson County.",
    date: "April 2026",
    lastUpdated: "April 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
  {
    slug: "land-management-rutherford-county",
    title: "Land Management in Rutherford County, TN: What Property Owners Need to Know",
    meta: "Need land management in Rutherford County, TN? Noland Earthworks provides forestry mulching and land clearing in Murfreesboro, Smyrna, La Vergne, Eagleville, and across Rutherford County.",
    date: "April 2026",
    lastUpdated: "April 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
  {
    slug: "land-management-maury-county",
    title: "Land Management in Maury County, TN: What Property Owners Need to Know",
    meta: "Need land management in Maury County, TN? Noland Earthworks provides forestry mulching and land clearing in Columbia, Spring Hill, Mount Pleasant, Culleoka, and across Maury County.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
  {
    slug: "land-management-marshall-county",
    title: "Land Management in Marshall County, TN: What Property Owners Need to Know",
    meta: "Need land management in Marshall County, TN? Noland Earthworks provides forestry mulching and land clearing in Lewisburg, Cornersville, Chapel Hill, Petersburg, and across Marshall County.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
  {
    slug: "land-management-lincoln-county",
    title: "Land Management in Lincoln County, TN: What Property Owners Need to Know",
    meta: "Need land management in Lincoln County, TN? Noland Earthworks provides forestry mulching and land clearing in Fayetteville, Mulberry, Flintville, and across Lincoln County.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
  {
    slug: "land-management-wilson-county",
    title: "Land Management in Wilson County, TN: What Property Owners Need to Know",
    meta: "Need land management in Wilson County, TN? Noland Earthworks provides forestry mulching and land clearing in Lebanon, Mount Juliet, Watertown, and across Wilson County.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
  {
    slug: "land-management-montgomery-county",
    title: "Land Management in Montgomery County, TN: What Property Owners Need to Know",
    meta: "Need land management in Montgomery County, TN? Noland Earthworks provides forestry mulching and land clearing in Clarksville and across Montgomery County.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
  {
    slug: "land-management-giles-county",
    title: "Land Management in Giles County, TN: What Property Owners Need to Know",
    meta: "Need land management in Giles County, TN? Noland Earthworks provides forestry mulching and land clearing in Pulaski, Elkton, Lynnville, and across Giles County.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
  {
    slug: "land-management-sumner-county",
    title: "Land Management in Sumner County, TN: What Property Owners Need to Know",
    meta: "Need land management in Sumner County, TN? Noland Earthworks provides forestry mulching and land clearing in Gallatin, Hendersonville, Portland, and across Sumner County.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
  {
    slug: "land-management-bedford-county",
    title: "Land Management in Bedford County, TN: What Property Owners Need to Know",
    meta: "Need land management in Bedford County, TN? Noland Earthworks provides forestry mulching and land clearing in Shelbyville, Bell Buckle, Wartrace, and across Bedford County.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
  {
    slug: "land-management-cheatham-county",
    title: "Land Management in Cheatham County, TN: What Property Owners Need to Know",
    meta: "Need land management in Cheatham County, TN? Noland Earthworks provides forestry mulching and land clearing in Ashland City, Kingston Springs, Pegram, and across Cheatham County.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
  {
    slug: "land-management-lawrence-county",
    title: "Land Management in Lawrence County, TN: What Property Owners Need to Know",
    meta: "Need land management in Lawrence County, TN? Noland Earthworks provides forestry mulching and land clearing in Lawrenceburg, Loretto, Ethridge, St. Joseph, and across Lawrence County.",
    date: "May 2026",
    lastUpdated: "May 2026",
    readTime: "6 min read",
    category: "Local Service Areas",
  },
];

const ALL_CATEGORIES = ["All", ...Array.from(new Set(BLOG_POSTS.map((p) => p.category)))];

export default function Blog() {
  usePageTitle(
    "Land Management Resources & Blog | Noland Earthworks",
    "Expert land management and forestry mulching guides for Tennessee property owners. Pricing, methods, and tips from Noland Earthworks — veteran-owned and operated.",
    "/blog"
  );

  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return BLOG_POSTS.filter((post) => {
      const matchesCategory = activeCategory === "All" || post.category === activeCategory;
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.meta.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

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
            Land Management <span style={{ color: "#E07B2A" }}>Knowledge Base</span>
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
            Practical guides and expert insight from the team at Noland Earthworks to help you make
            informed decisions about your land.
          </p>
        </div>
      </section>

      {/* Filter & Search bar */}
      <section
        className="container"
        style={{ paddingTop: "2.5rem", paddingBottom: "0" }}
      >
        {/* Search input */}
        <div className="relative mb-5" style={{ maxWidth: "420px" }}>
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "rgba(240,237,230,0.35)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            style={{
              width: "100%",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(240,237,230,0.12)",
              color: "#F0EDE6",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.9rem",
              fontWeight: 300,
              padding: "0.65rem 2.5rem 0.65rem 2.25rem",
              outline: "none",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "rgba(224,123,42,0.5)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "rgba(240,237,230,0.12)")
            }
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "rgba(240,237,230,0.4)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((cat) => {
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "0.45rem 1rem",
                  border: active
                    ? "1px solid #E07B2A"
                    : "1px solid rgba(240,237,230,0.15)",
                  backgroundColor: active ? "#E07B2A" : "transparent",
                  color: active ? "#fff" : "rgba(240,237,230,0.6)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,123,42,0.5)";
                    (e.currentTarget as HTMLElement).style.color = "#F0EDE6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(240,237,230,0.15)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(240,237,230,0.6)";
                  }
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Result count */}
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.8rem",
            color: "rgba(240,237,230,0.35)",
            marginTop: "1rem",
          }}
        >
          {filtered.length} {filtered.length === 1 ? "article" : "articles"}
          {activeCategory !== "All" || search ? " found" : " total"}
        </p>
      </section>

      {/* Article grid */}
      <section className="container py-10">
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center"
            style={{ color: "rgba(240,237,230,0.4)" }}
          >
            <Search size={36} style={{ marginBottom: "1rem", opacity: 0.3 }} />
            <p
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: "1.1rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "0.5rem",
                color: "rgba(240,237,230,0.5)",
              }}
            >
              No articles found
            </p>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.875rem" }}>
              Try a different search term or category.
            </p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("All"); }}
              style={{
                marginTop: "1rem",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.8rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#E07B2A",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
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
                  className="h-full flex flex-col"
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

                    <div
                      className="flex items-center justify-between pt-2"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
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
                        {post.lastUpdated && post.lastUpdated !== post.date && (
                          <>
                            <span style={{ color: "rgba(240,237,230,0.2)", fontSize: "0.75rem" }}>·</span>
                            <span
                              style={{
                                fontFamily: "'Lato', sans-serif",
                                fontSize: "0.75rem",
                                color: "rgba(224,123,42,0.85)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                            >
                              <RefreshCw size={11} />
                              Updated {post.lastUpdated}
                            </span>
                          </>
                        )}
                        <span style={{ color: "rgba(240,237,230,0.2)", fontSize: "0.75rem" }}>·</span>
                        <span
                          style={{
                            fontFamily: "'Lato', sans-serif",
                            fontSize: "0.75rem",
                            color: "rgba(240,237,230,0.4)",
                          }}
                        >
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
        )}
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
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.9rem",
                color: "rgba(240,237,230,0.6)",
              }}
            >
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

      <MobileCTABar />
      <Footer />
    </div>
  );
}
