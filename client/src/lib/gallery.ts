import {
  FALLBACK_GALLERY_ITEMS,
  galleryServiceLabel,
  type GalleryDbItem,
  type GalleryDisplayItem,
} from "@shared/gallery";

export function mapGalleryItem(item: GalleryDbItem): GalleryDisplayItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    image: item.imageUrl,
    service: galleryServiceLabel(item.service),
    county: item.county ? `${item.county} County, TN` : "Tennessee",
    acreage: item.acreage ?? undefined,
    photoType: item.photoType,
    featured: item.featured,
    isFallback: false,
  };
}

export function resolveGalleryItems(
  dbItems: GalleryDbItem[] | undefined,
  options?: { featuredOnly?: boolean; limit?: number }
): { items: GalleryDisplayItem[]; usingFallback: boolean } {
  let source = dbItems ?? [];
  if (options?.featuredOnly) {
    source = source.filter((i) => i.featured);
  }
  if (options?.limit) {
    source = source.slice(0, options.limit);
  }

  if (source.length === 0) {
    const fallback = options?.featuredOnly
      ? FALLBACK_GALLERY_ITEMS.slice(0, options.limit ?? 3)
      : options?.limit
        ? FALLBACK_GALLERY_ITEMS.slice(0, options.limit)
        : FALLBACK_GALLERY_ITEMS;
    return { items: fallback, usingFallback: true };
  }

  return { items: source.map(mapGalleryItem), usingFallback: false };
}
