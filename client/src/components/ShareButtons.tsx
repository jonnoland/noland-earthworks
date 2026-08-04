/**
 * ShareButtons — reusable social sharing component
 * Renders Facebook, X (Twitter), LinkedIn, and Copy Link buttons.
 * Matches the site's dark grit design language.
 *
 * Usage:
 *   <ShareButtons url="https://nolandearthworks.com/blog/..." title="Post title" />
 *
 * Props:
 *   url    — canonical URL to share (defaults to window.location.href)
 *   title  — text used in share dialogs and copy confirmation
 *   compact — when true, shows icon-only buttons (no labels)
 */
import { useState } from "react";
import { Link2, Check } from "lucide-react";

interface ShareButtonsProps {
  url?: string;
  title?: string;
  compact?: boolean;
  className?: string;
}

// SVG icon components — inline to avoid extra dependencies
function FacebookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

const BTN_BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  padding: "0.45rem 0.85rem",
  border: "1px solid rgba(240,237,230,0.18)",
  backgroundColor: "rgba(240,237,230,0.04)",
  color: "rgba(240,237,230,0.75)",
  fontFamily: "'Lato', sans-serif",
  fontWeight: 700,
  fontSize: "0.75rem",
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  textDecoration: "none",
  cursor: "pointer",
  transition: "border-color 0.15s, color 0.15s, background-color 0.15s",
  whiteSpace: "nowrap" as const,
};

export default function ShareButtons({
  url,
  title = "Noland Earthworks",
  compact = false,
  className = "",
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    url ||
    (typeof window !== "undefined" ? window.location.href : "https://nolandearthworks.com");

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const platforms = [
    {
      key: "facebook",
      label: "Share",
      icon: <FacebookIcon />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      hoverColor: "#1877F2",
    },
    {
      key: "x",
      label: "Post",
      icon: <XIcon />,
      href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      hoverColor: "#000",
    },
    {
      key: "linkedin",
      label: "Share",
      icon: <LinkedInIcon />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      hoverColor: "#0A66C2",
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label="Share this page"
    >
      {!compact && (
        <span
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 700,
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(240,237,230,0.4)",
            marginRight: "0.25rem",
          }}
        >
          Share
        </span>
      )}

      {platforms.map((p) => (
        <a
          key={p.key}
          href={p.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${p.label} on ${p.key === "x" ? "X (Twitter)" : p.key.charAt(0).toUpperCase() + p.key.slice(1)}`}
          style={BTN_BASE}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.borderColor = p.hoverColor;
            el.style.color = "#F0EDE6";
            el.style.backgroundColor = `${p.hoverColor}22`;
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.borderColor = "rgba(240,237,230,0.18)";
            el.style.color = "rgba(240,237,230,0.75)";
            el.style.backgroundColor = "rgba(240,237,230,0.04)";
          }}
        >
          {p.icon}
          {!compact && p.label}
        </a>
      ))}

      {/* Copy link button */}
      <button
        onClick={handleCopy}
        aria-label="Copy link to clipboard"
        style={{
          ...BTN_BASE,
          borderColor: copied ? "#E07B2A" : "rgba(240,237,230,0.18)",
          color: copied ? "#E07B2A" : "rgba(240,237,230,0.75)",
          backgroundColor: copied ? "rgba(224,123,42,0.08)" : "rgba(240,237,230,0.04)",
        }}
        onMouseEnter={(e) => {
          if (!copied) {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.borderColor = "rgba(224,123,42,0.5)";
            el.style.color = "#F0EDE6";
            el.style.backgroundColor = "rgba(224,123,42,0.08)";
          }
        }}
        onMouseLeave={(e) => {
          if (!copied) {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.borderColor = "rgba(240,237,230,0.18)";
            el.style.color = "rgba(240,237,230,0.75)";
            el.style.backgroundColor = "rgba(240,237,230,0.04)";
          }
        }}
      >
        {copied ? <Check size={13} /> : <Link2 size={13} />}
        {!compact && (copied ? "Copied" : "Copy Link")}
      </button>
    </div>
  );
}
