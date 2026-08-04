/**
 * DynamicBlogPost — renders a published seoArticle from the database.
 * Route: /blog/:slug (catch-all, checked after all hardcoded blog routes)
 *
 * Supports:
 * - Full Markdown rendering via react-markdown
 * - FAQPage + Article JSON-LD schema injection
 * - Canonical tag via usePageTitle
 * - Share buttons
 * - CTA strip
 */
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ShareButtons from "@/components/ShareButtons";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { Streamdown } from "streamdown";

const BASE_URL = "https://nolandearthworks.com";

function ArticleSchema({ article }: {
  article: {
    title: string;
    metaDescription: string | null;
    publishedSlug: string | null;
    publishedAt: Date | null;
    bodyMarkdown: string;
    wordCount: number | null;
  }
}) {
  useEffect(() => {
    const id = "dynamic-blog-schema";
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": article.title,
      "description": article.metaDescription ?? "",
      "url": `${BASE_URL}/blog/${article.publishedSlug}`,
      "datePublished": article.publishedAt?.toISOString() ?? new Date().toISOString(),
      "dateModified": article.publishedAt?.toISOString() ?? new Date().toISOString(),
      "author": {
        "@type": "Person",
        "name": "Jon Noland",
        "url": `${BASE_URL}/about`
      },
      "publisher": {
        "@type": "Organization",
        "name": "Noland Earthworks, LLC",
        "url": BASE_URL
      },
      "wordCount": article.wordCount ?? undefined,
    };
    el.textContent = JSON.stringify(schema);
    return () => { el?.remove(); };
  }, [article]);
  return null;
}

export default function DynamicBlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug ?? "";

  const { data: article, isLoading, error } = trpc.blog.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  // Set page title and canonical
  usePageTitle(
    article?.title ?? (isLoading ? "Loading..." : "Article Not Found"),
    article?.metaDescription ?? undefined,
    article?.publishedSlug ? `/blog/${article.publishedSlug}` : undefined
  );

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
        <Navbar />
        <div className="container max-w-3xl mx-auto px-4 py-24 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-700 rounded w-3/4 mx-auto" />
            <div className="h-4 bg-zinc-700 rounded w-1/2 mx-auto" />
            <div className="h-64 bg-zinc-700 rounded mt-8" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!article || error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
        <Navbar />
        <div className="container max-w-3xl mx-auto px-4 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
          <p className="text-zinc-400 mb-8">
            This article may have been moved or is no longer available.
          </p>
          <Link href="/blog" className="text-orange-400 hover:text-orange-300 underline">
            Back to Resources
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const readTime = article.wordCount ? `${Math.ceil(article.wordCount / 200)} min read` : null;
  const publishDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
      <Navbar />
      <ArticleSchema article={article} />

      {/* Hero */}
      <div className="bg-zinc-900 border-b border-zinc-800 py-12">
        <div className="container max-w-3xl mx-auto px-4">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-orange-400 text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Resources
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4" style={{ color: "#F0EDE6" }}>
            {article.title}
          </h1>
          {article.metaDescription && (
            <p className="text-zinc-400 text-lg leading-relaxed mb-6">{article.metaDescription}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
            {publishDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {publishDate}
              </span>
            )}
            {readTime && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {readTime}
              </span>
            )}
            <span className="text-zinc-600">By Jon Noland · Noland Earthworks, LLC</span>
          </div>
        </div>
      </div>

      {/* Article body */}
      <article className="container max-w-3xl mx-auto px-4 py-12">
        <div className="prose prose-invert prose-zinc max-w-none
          prose-headings:font-bold prose-headings:text-[#F0EDE6]
          prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:mb-4
          prose-li:text-zinc-300 prose-li:leading-relaxed
          prose-strong:text-[#F0EDE6]
          prose-a:text-orange-400 prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-l-orange-500 prose-blockquote:text-zinc-400
          prose-code:text-orange-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded
          prose-hr:border-zinc-700">
          <Streamdown>{article.bodyMarkdown}</Streamdown>
        </div>

        {/* Share */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <ShareButtons
            url={`${BASE_URL}/blog/${article.publishedSlug}`}
            title={article.title}
          />
        </div>

        {/* CTA */}
        <div className="mt-10 p-6 rounded-lg border border-orange-500/30 bg-orange-500/5">
          <h3 className="text-xl font-bold mb-2" style={{ color: "#F0EDE6" }}>
            Ready to clear your land?
          </h3>
          <p className="text-zinc-400 mb-4">
            Get a free on-site estimate. No ballpark quotes — Jon walks the property and gives you a straight number.
          </p>
          <a
            href="/quote"
            className="inline-block px-6 py-3 rounded font-bold text-sm uppercase tracking-wide transition-colors"
            style={{ backgroundColor: "#E07B39", color: "#121212" }}
          >
            Schedule a Free Estimate
          </a>
        </div>
      </article>

      <MobileCTABar />
      <Footer />
    </div>
  );
}
