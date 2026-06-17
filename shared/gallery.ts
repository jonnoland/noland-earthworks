/** Gallery service labels and fallback imagery when no DB items are published. */

export const GALLERY_SERVICES = [
  { value: "forestry_mulching", label: "Forestry Mulching" },
  { value: "land_clearing", label: "Land Clearing" },
  { value: "vegetation_management", label: "Vegetation Management" },
] as const;

export type GalleryService = (typeof GALLERY_SERVICES)[number]["value"];

export const GALLERY_PHOTO_TYPES = [
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "in_progress", label: "In Progress" },
  { value: "general", label: "General" },
] as const;

export type GalleryPhotoType = (typeof GALLERY_PHOTO_TYPES)[number]["value"];

export function galleryServiceLabel(service: string): string {
  return GALLERY_SERVICES.find((s) => s.value === service)?.label ?? service;
}

export function galleryPhotoTypeLabel(photoType: string): string {
  return GALLERY_PHOTO_TYPES.find((p) => p.value === photoType)?.label ?? photoType;
}

export type GalleryDbItem = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
  service: string;
  county: string | null;
  acreage: string | null;
  photoType: string;
  featured: boolean;
};

export type GalleryDisplayItem = {
  id: number | string;
  title: string;
  description: string;
  image: string;
  service: string;
  county: string;
  acreage?: string;
  photoType?: string;
  featured?: boolean;
  isFallback?: boolean;
};

const IMG_OVERGROWN_BRUSH = "/manus-storage/dense-foliage-bushes_2efa77a3.jpg";
const IMG_FORESTRY_MACHINE = "/manus-storage/forestry-mulcher-machine_f900a315.jpg";
const IMG_CLEARED_LAND = "/manus-storage/open-land-treeline_3c257c04.jpg";
const IMG_FENCE_LINE = "/manus-storage/overgrown-fence-line_3a74b356.jpg";
const IMG_OPEN_PASTURE = "/manus-storage/open-pasture-1_cbdb13b4.jpg";
const IMG_OVERGROWN_PATH = "/manus-storage/overgrown-pathway_df75b768.jpg";
const IMG_CLEARED_STUMPS = "/manus-storage/cleared-pasture-stumps_3bcc4b70.jpg";

/** Stock imagery shown when no published gallery items exist yet. */
export const FALLBACK_GALLERY_ITEMS: GalleryDisplayItem[] = [
  {
    id: "fallback-1",
    title: "Dense Brush and Understory",
    county: "Middle Tennessee",
    service: "Forestry Mulching",
    acreage: "Example",
    image: IMG_OVERGROWN_BRUSH,
    description:
      "Thick invasive growth and tangled brush — the kind of property that has gotten away from its owner. A forestry mulcher handles this in a single pass.",
    isFallback: true,
  },
  {
    id: "fallback-2",
    title: "Forestry Mulcher at Work",
    county: "Middle Tennessee",
    service: "Forestry Mulching",
    acreage: "Example",
    image: IMG_FORESTRY_MACHINE,
    description:
      "A tracked forestry mulcher working through heavy timber and brush. No debris piles left behind — everything is ground into a mulch layer on the ground.",
    isFallback: true,
  },
  {
    id: "fallback-3",
    title: "Cleared Land with Tree Line",
    county: "Middle Tennessee",
    service: "Land Clearing",
    acreage: "Example",
    image: IMG_CLEARED_LAND,
    description:
      "Open, accessible ground after clearing. The tree line is preserved at the property edge. Mulch layer left in place to control erosion and suppress regrowth.",
    isFallback: true,
  },
  {
    id: "fallback-4",
    title: "Overgrown Fence Line",
    county: "Middle Tennessee",
    service: "Vegetation Management",
    acreage: "Example",
    image: IMG_FENCE_LINE,
    description:
      "Fence lines that haven't seen daylight in years are one of the most common jobs. The mulcher clears the brush without damaging the fence posts.",
    isFallback: true,
  },
  {
    id: "fallback-5",
    title: "Open Pasture Reclaimed",
    county: "Middle Tennessee",
    service: "Land Clearing",
    acreage: "Example",
    image: IMG_OPEN_PASTURE,
    description:
      "Pasture returned to productive use. Cedar encroachment and invasive species cleared. Ground cover left intact to prevent erosion.",
    isFallback: true,
  },
  {
    id: "fallback-6",
    title: "Overgrown Property Access",
    county: "Middle Tennessee",
    service: "Vegetation Management",
    acreage: "Example",
    image: IMG_OVERGROWN_PATH,
    description:
      "Overgrown access paths and property boundaries cleared and opened up. No hauling required — mulch stays on the ground.",
    isFallback: true,
  },
  {
    id: "fallback-7",
    title: "Reclaimed Pasture Land",
    county: "Middle Tennessee",
    service: "Land Clearing",
    acreage: "Example",
    image: IMG_CLEARED_STUMPS,
    description:
      "Land cleared and returned to open pasture. Stumps left in place or ground down depending on the landowner's needs.",
    isFallback: true,
  },
];
