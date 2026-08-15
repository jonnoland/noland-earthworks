import { ExternalLink, ImageIcon, MapPin, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";

const GALLERY_SERVICE_TYPES = new Set(["forestry-mulching", "land-management", "brush-hogging", "vegetation-management", "gravel-driveway", "other"]);

type EvidenceContentSectionProps = {
  pageLabel: string;
  county?: string;
  serviceType?: string;
};

/**
 * Shared proof section for county and service pages.
 * It never manufactures testimonials or job stories: it renders only live
 * Google reviews and gallery photos explicitly published from operations.
 */
export default function EvidenceContentSection({ pageLabel, county, serviceType }: EvidenceContentSectionProps) {
  const galleryFilter = serviceType && GALLERY_SERVICE_TYPES.has(serviceType) ? serviceType as "forestry-mulching" | "land-management" | "brush-hogging" | "vegetation-management" | "gravel-driveway" | "other" : "all";
  const { data: reviewData, isLoading: reviewsLoading } = trpc.reviewsLive.getPublic.useQuery();
  const { data: galleryData = [], isLoading: galleryLoading } = trpc.gallery.listPublic.useQuery({ serviceType: galleryFilter });
  const normalizedCounty = county?.toLowerCase().replace(/ county$/, "").trim();
  const projects = (normalizedCounty
    ? galleryData.filter((photo) => photo.county?.toLowerCase().includes(normalizedCounty))
    : galleryData
  ).slice(0, 3);
  const reviews = (reviewData?.reviews ?? []).slice(0, 2);

  return (
    <section className="border-y border-[#E07B2A]/15 bg-[#121212] py-16">
      <div className="container">
        <div className="section-label mb-4">Verified Project Proof</div>
        <h2 className="font-['Oswald'] text-3xl font-bold uppercase tracking-[0.04em] text-[#F0EDE6] sm:text-4xl">Recent work and customer feedback</h2>
        <p className="mt-4 max-w-3xl font-['Lato'] leading-7 text-white/65">This {pageLabel} page shows only details that have been published from the operations record: verified Google reviews and real project photos. No customer testimonial or project result is invented for local search content.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-center gap-3"><Star className="h-5 w-5 text-[#E07B2A]" /><h3 className="font-['Oswald'] text-xl font-semibold uppercase tracking-[0.04em] text-[#F0EDE6]">Verified Google reviews</h3></div>
            {reviewsLoading ? <p className="mt-5 font-['Lato'] text-sm text-white/45">Loading verified reviews…</p> : reviews.length > 0 ? (
              <div className="mt-5 space-y-4">
                {reviews.map((review) => <article key={review.id} className="border-l-2 border-[#E07B2A]/55 pl-4"><div className="flex items-center gap-1 text-[#E07B2A]" aria-label={`${review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-3.5 w-3.5" fill={star <= review.rating ? "currentColor" : "none"} />)}</div><p className="mt-2 font-['Lato'] text-sm leading-6 text-white/75">{review.body}</p><p className="mt-2 font-['Lato'] text-xs text-white/45">{review.reviewerName} · Google Review</p></article>)}
              </div>
            ) : <p className="mt-5 font-['Lato'] text-sm leading-6 text-white/55">Verified Google reviews will appear here only after they are available from the connected business profile.</p>}
            <a href="/reviews" className="mt-5 inline-flex items-center gap-2 font-['Oswald'] text-xs font-semibold uppercase tracking-[0.1em] text-[#E07B2A] hover:text-[#f28c35]">View verified reviews <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>

          <div className="border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-center gap-3"><ImageIcon className="h-5 w-5 text-[#E07B2A]" /><h3 className="font-['Oswald'] text-xl font-semibold uppercase tracking-[0.04em] text-[#F0EDE6]">Recent project gallery</h3></div>
            {galleryLoading ? <p className="mt-5 font-['Lato'] text-sm text-white/45">Loading published project photos…</p> : projects.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">{projects.map((photo) => <article key={photo.id} className="overflow-hidden border border-white/10"><img src={photo.url} alt={photo.title || "Published Noland Earthworks project"} loading="lazy" className="aspect-[4/3] w-full object-cover" /><div className="p-2.5"><p className="line-clamp-2 font-['Lato'] text-xs font-semibold text-white/80">{photo.title || "Published project"}</p><p className="mt-1 flex items-center gap-1 font-['Lato'] text-[11px] text-white/45"><MapPin className="h-3 w-3" />{photo.county || "Tennessee"}</p></div></article>)}</div>
            ) : <p className="mt-5 font-['Lato'] text-sm leading-6 text-white/55">Recent published project photos for this page will appear here when they are added from the gallery. The full gallery contains only real uploaded work.</p>}
            <a href="/gallery" className="mt-5 inline-flex items-center gap-2 font-['Oswald'] text-xs font-semibold uppercase tracking-[0.1em] text-[#E07B2A] hover:text-[#f28c35]">View project gallery <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>
        </div>
      </div>
    </section>
  );
}
