import { useEffect } from "react";

const SITE_NAME = "Noland Earthworks, LLC";
const DEFAULT_DESCRIPTION =
  "Veteran-owned land clearing and forestry mulching services in Middle & West Tennessee. Free estimates. Licensed & insured. Call 615-406-4819.";

export function usePageTitle(title: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

    // Update or create the meta description tag
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description || DEFAULT_DESCRIPTION;

    return () => {
      document.title = SITE_NAME;
      const el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (el) el.content = DEFAULT_DESCRIPTION;
    };
  }, [title, description]);
}
