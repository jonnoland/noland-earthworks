/*
 * RelatedPosts — shows 2–3 related blog posts at the bottom of a blog article.
 * Picks posts from BLOG_POSTS that share a category or are from the same
 * "Local Service Areas" group, excluding the current post.
 */
import { ArrowRight } from "lucide-react";
import { BLOG_POSTS } from "@/pages/Blog";

interface RelatedPostsProps {
  currentSlug: string;
  /** Optional override list of slugs to show. Falls back to auto-selection. */
  slugs?: string[];
}

export default function RelatedPosts({ currentSlug, slugs }: RelatedPostsProps) {
  const current = BLOG_POSTS.find((p) => p.slug === currentSlug);

  let related: typeof BLOG_POSTS;

  if (slugs && slugs.length > 0) {
    // Explicit list — respect order, exclude current just in case
    related = slugs
      .filter((s) => s !== currentSlug)
      .map((s) => BLOG_POSTS.find((p) => p.slug === s))
      .filter(Boolean) as typeof BLOG_POSTS;
  } else {
    // Auto-select: same category first, then fill from other categories
    const sameCategory = BLOG_POSTS.filter(
      (p) => p.slug !== currentSlug && p.category === current?.category
    );
    const otherCategory = BLOG_POSTS.filter(
      (p) => p.slug !== currentSlug && p.category !== current?.category
    );
    related = [...sameCategory, ...otherCategory].slice(0, 3);
  }

  if (related.length === 0) return null;

  return (
    <section
      className="container pb-16"
      style={{ maxWidth: "820px" }}
    >
      <div
        style={{
          borderTop: "1px solid rgba(240,237,230,0.08)",
          paddingTop: "2.5rem",
        }}
      >
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#E07B2A",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "1.25rem",
          }}
        >
          Related Articles
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((post) => (
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
                  padding: "1.25rem",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,123,42,0.4)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.35)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(240,237,230,0.08)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#E07B2A",
                    marginBottom: "0.5rem",
                  }}
                >
                  {post.category}
                </p>
                <h3
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    lineHeight: 1.3,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    color: "#F0EDE6",
                    marginBottom: "0.75rem",
                  }}
                >
                  {post.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.72rem",
                      color: "rgba(240,237,230,0.4)",
                    }}
                  >
                    {post.readTime}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#E07B2A",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.2rem",
                    }}
                  >
                    Read <ArrowRight size={11} />
                  </span>
                </div>
              </article>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
