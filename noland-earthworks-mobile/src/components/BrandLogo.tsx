import type { CSSProperties } from "react";

export const NOLAND_EARTHWORKS_LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_783e5c7b.png";

interface BrandLogoProps {
  style?: CSSProperties;
  alt?: string;
}

export default function BrandLogo({
  style,
  alt = "Noland Earthworks",
}: BrandLogoProps) {
  return (
    <img
      src={NOLAND_EARTHWORKS_LOGO_URL}
      alt={alt}
      decoding="async"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        ...style,
      }}
    />
  );
}
