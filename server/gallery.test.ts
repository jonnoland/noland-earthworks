import { describe, expect, it } from "vitest";
import { resolveGalleryItems } from "@/lib/gallery";

describe("resolveGalleryItems", () => {
  const sample = [
    {
      id: 1,
      title: "Cedar cleared",
      description: "4 acres in Maury County",
      imageUrl: "https://cdn.example.com/photo.jpg",
      service: "forestry_mulching",
      county: "Maury",
      acreage: "4 acres",
      photoType: "after",
      featured: true,
    },
  ];

  it("maps DB items to display format", () => {
    const { items, usingFallback } = resolveGalleryItems(sample);
    expect(usingFallback).toBe(false);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Cedar cleared");
    expect(items[0].service).toBe("Forestry Mulching");
    expect(items[0].county).toBe("Maury County, TN");
    expect(items[0].image).toBe("https://cdn.example.com/photo.jpg");
  });

  it("falls back to stock images when empty", () => {
    const { items, usingFallback } = resolveGalleryItems([]);
    expect(usingFallback).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].isFallback).toBe(true);
  });

  it("filters featured items", () => {
    const mixed = [
      ...sample,
      {
        id: 2,
        title: "Draft",
        description: null,
        imageUrl: "https://cdn.example.com/2.jpg",
        service: "land_clearing",
        county: null,
        acreage: null,
        photoType: "before",
        featured: false,
      },
    ];
    const { items, usingFallback } = resolveGalleryItems(mixed, { featuredOnly: true });
    expect(usingFallback).toBe(false);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(1);
  });
});
