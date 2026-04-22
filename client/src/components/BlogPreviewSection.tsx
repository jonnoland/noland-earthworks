import { Link } from "wouter";

const FEATURED_POSTS = [
  {
    slug: "cost-of-land-clearing-tennessee",
    category: "Pricing & Planning",
    title: "How Much Does Land Management Cost in Tennessee? (2026 Guide)",
    excerpt:
      "Discover the true cost of land management and forestry mulching in Middle Tennessee. Learn what factors affect pricing per acre and how to get the best value.",
    readTime: "5 min read",
  },
  {
    slug: "forestry-mulching-vs-bulldozing",
    category: "Education",
    title: "Forestry Mulching vs. Bulldozing: Which is Better for Your Property?",
    excerpt:
      "Compare forestry mulching and traditional bulldozing for land management. Learn why mulching is faster, cheaper, and better for your Tennessee property's soil.",
    readTime: "5 min read",
  },
  {
    slug: "best-time-to-clear-land-tennessee",
    category: "Seasonal Tips",
    title: "Best Time of Year to Clear Land in Middle Tennessee",
    excerpt:
      "Wondering when to clear land in Tennessee? Learn the best season for forestry mulching and land management in Middle Tennessee to save money and get faster results.",
    readTime: "5 min read",
  },
];

export default function BlogPreviewSection() {
  return (
    <section
      className="py-16 px-4"
      style={{ backgroundColor: "#1a1a1a" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <p
              className="text-xs font-bold tracking-widest uppercase mb-2"
              style={{ color: "#E07B2A" }}
            >
              From Our Blog
            </p>
            <h2
              className="text-3xl md:text-4xl font-black uppercase"
              style={{ color: "#F0EDE6" }}
            >
              Land Management{" "}
              <span style={{ color: "#E07B2A" }}>Knowledge Base</span>
            </h2>
          </div>
          <Link
            href="/blog"
            className="text-sm font-bold uppercase tracking-wider border-b-2 pb-0.5 transition-colors"
            style={{ color: "#E07B2A", borderColor: "#E07B2A" }}
          >
            View All Articles →
          </Link>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURED_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-lg overflow-hidden border transition-all duration-200 hover:-translate-y-1"
              style={{
                backgroundColor: "#242424",
                borderColor: "#333",
              }}
            >
              <div className="p-6 flex flex-col flex-1">
                <span
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: "#E07B2A" }}
                >
                  {post.category}
                </span>
                <h3
                  className="text-base font-black uppercase leading-snug mb-3 group-hover:text-[#E07B2A] transition-colors"
                  style={{ color: "#F0EDE6" }}
                >
                  {post.title}
                </h3>
                <p
                  className="text-sm leading-relaxed flex-1"
                  style={{ color: "#9a9a8a" }}
                >
                  {post.excerpt}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#666" }}>
                    {post.readTime}
                  </span>
                  <span
                    className="text-xs font-bold uppercase tracking-wider group-hover:underline"
                    style={{ color: "#E07B2A" }}
                  >
                    Read →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
