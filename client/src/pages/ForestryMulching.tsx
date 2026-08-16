import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useEffect } from "react";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const MOBILE_HERO = "/manus-storage/forestry-mulching-mobile_47442aea.webp";
const LAND_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-management-iPC6VzRdyjJa4bVNXaWy5n.webp";
const VEGETATION_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const MAINTENANCE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";

const data: ServicePageProps = {
  slug: "forestry-mulching",
  title: "Forestry Mulching in Tennessee",
  tagline: "Forestry mulching for suitable brush, saplings, and small trees — with the work boundary and finish confirmed on site and in writing.",
  heroImage: HERO,
  heroImageMobile: MOBILE_HERO,
  overviewTitle: "What Is Forestry Mulching?",
  overviewBody: [
    "Forestry mulching uses a tracked machine and drum mulcher to process suitable brush, saplings, vines, and small trees into mulch.",
    "Mulch typically remains on site as ground cover. The site visit and written proposal establish material size, terrain, access, utilities, boundaries, and the exact work included.",
    "It can be a practical approach for projects such as pasture reclamation, trails, fence lines, and improved access when the property conditions and desired finish fit the written scope.",
  ],
  benefits: [
    "Processes suitable vegetation in place with a tracked mulcher",
    "Mulch typically remains on site as ground cover",
    "Site planning considers terrain, access, boundaries, utilities, and desired trees",
    "Can support selective vegetation work when conditions allow",
    "Written scope clarifies the desired finish and exclusions",
  ],
  relatedServices: [
    { title: "Land Management", slug: "land-management", description: "Full site clearing of trees, stumps, brush, and debris.", heroImage: LAND_HERO },
    { title: "Vegetation Management", slug: "vegetation-management", description: "Control invasive species, overgrowth, and unwanted vegetation.", heroImage: VEGETATION_HERO },
    { title: "Brush Hogging", slug: "property-maintenance", description: "Maintain pasture, fields, and lighter vegetation with brush hogging.", heroImage: MAINTENANCE_HERO },
  ],
  faqs: [
    {
      question: "How large of trees can a forestry mulcher handle?",
      answer: "Suitable material size depends on species, density, terrain, access, obstacles, and the desired finish. We assess those conditions during the site visit and identify anything outside the written scope.",
    },
    {
      question: "Will forestry mulching kill invasive species?",
      answer: "Mulching removes above-ground growth effectively, but many invasive species (like kudzu, privet, or multiflora rose) will re-sprout from root systems. For long-term control, follow-up treatments (herbicide or repeat mulching) are often recommended. We can advise on the best approach for your specific invasives.",
    },
    {
      question: "Is the mulch left on my property safe?",
      answer: "Mulch typically remains on site as ground cover. Its depth, appearance, future maintenance, and suitability for your intended land use are discussed during the site visit and confirmed in the written scope.",
    },
    {
      question: "Can forestry mulching be done near water?",
      answer: "Work near streams, wetlands, drainage features, or protected areas requires an on-site review. We confirm access, boundaries, visible conditions, and whether another specialist or permitting authority should be involved before work is scheduled.",
    },
    {
      question: "How does forestry mulching compare to traditional clearing?",
      answer: "Forestry mulching processes suitable vegetation into mulch that typically remains on site. It is different from clearing that includes tree removal, hauling, burning, grading, or excavation; those services are not included unless specifically stated in the written scope.",
    },
    {
      question: "What's the minimum acreage for a forestry mulching job?",
      answer: "Most suitable projects are between 2 and 50 acres, but fit depends on vegetation, terrain, access, work boundaries, and mobilization. Smaller or unusually complex properties may not justify mobilization; a site visit determines fit.",
    },
  ],
};

export default function ForestryMulchingPage() {
  usePageTitle(
    "Forestry Mulching in Tennessee | Noland Earthworks",
    "Veteran-owned forestry mulching in Middle and West Tennessee. Site visits confirm vegetation, access, terrain, work boundaries, and the written scope before work is scheduled.",
    "/services/forestry-mulching"
  );

  // Inject LocalBusiness schema referencing this page as the primary service
  useEffect(() => {
    const id = "forestry-mulching-lb-schema";
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
      "name": "Noland Earthworks, LLC",
      "url": "https://nolandearthworks.com",
      "telephone": "+16154064819",
      "email": "info@nolandearthworks.com",
      "description": "Veteran-owned forestry mulching company serving Middle and West Tennessee. Site visits confirm suitable vegetation, access, terrain, work boundaries, and the written scope before work is scheduled.",
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Forestry Mulching Services",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Forestry Mulching",
              "description": "Tracked forestry mulching for suitable brush, saplings, vines, and small trees. Site visits confirm terrain, access, work boundaries, and the written scope.",
              "areaServed": "Middle and West Tennessee"
            }
          }
        ]
      },
      "address": {
        "@type": "PostalAddress",
        "addressRegion": "TN",
        "addressCountry": "US"
      },
      "areaServed": [
        { "@type": "State", "name": "Tennessee", "sameAs": "https://www.wikidata.org/wiki/Q1509" },
        { "@type": "AdministrativeArea", "name": "Davidson County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Williamson County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Rutherford County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Wilson County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Maury County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Dickson County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Cheatham County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Robertson County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Sumner County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Montgomery County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Bedford County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Marshall County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Hickman County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Lewis County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Perry County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Wayne County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Giles County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Lincoln County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Lawrence County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Houston County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Humphreys County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Stewart County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Trousdale County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Cannon County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Moore County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Madison County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Carroll County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Chester County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Decatur County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Gibson County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Hardin County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Henderson County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Henry County, Tennessee" },
        { "@type": "AdministrativeArea", "name": "Weakley County, Tennessee" }
      ],
      "knowsAbout": [
        "forestry mulching", "land management", "pasture reclamation",
        "cedar clearing", "brush clearing", "right-of-way clearing",
        "vegetation management", "tracked forestry mulcher"
      ]
    });
    return () => { el?.remove(); };
  }, []);

  return (
    <>
      <Navbar />
      <ServicePageLayout {...data} />

      {/* ── COMPETITOR COMPARISON — AI visibility signal ── */}
      <section
        style={{
          backgroundColor: "#0d0d0d",
          paddingTop: "5rem",
          paddingBottom: "5rem",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="container" style={{ maxWidth: "900px" }}>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#E07B2A",
              marginBottom: "0.75rem",
            }}
          >
            How We Compare
          </p>
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
              textTransform: "uppercase",
              color: "#F0EDE6",
              lineHeight: 1.1,
              marginBottom: "1rem",
            }}
          >
            Choosing a Forestry Mulching Contractor in Middle Tennessee
          </h2>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.95rem",
              lineHeight: 1.75,
              color: "rgba(240,237,230,0.65)",
              maxWidth: "700px",
              marginBottom: "2.5rem",
            }}
          >
            Several land management companies operate in Middle Tennessee. Here is what to look for when
            comparing forestry mulching contractors — and where Noland Earthworks stands on each point.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: "2.5rem" }}>
            {[
              {
                label: "Owner-Operated",
                noland: "Jon Noland personally operates the machine on every job. You talk to the operator, not a dispatcher.",
                others: "Many companies subcontract operators or send different crews. Quality varies.",
              },
              {
                label: "Tracked Equipment",
                noland: "Tracked forestry mulcher handles slopes, wet clay, and creek bottoms that wheeled machines cannot.",
                others: "Wheeled mulchers are limited on steep or saturated ground common in Middle Tennessee.",
              },
              {
                label: "Forestry Mulching as Primary Service",
                noland: "Forestry mulching is the core business — not an add-on to a grading or excavation operation.",
                others: "Some competitors offer mulching as a secondary service alongside excavation or hauling.",
              },
              {
                label: "Veteran-Owned",
                noland: "Veteran-owned and operated. The same standards that apply in the field apply on every job.",
                others: "Not all land management companies in Tennessee are veteran-owned or operated.",
              },
            ].map(({ label, noland, others }) => (
              <div
                key={label}
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  padding: "1.5rem",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#E07B2A",
                    marginBottom: "0.75rem",
                  }}
                >
                  {label}
                </p>
                <div style={{ marginBottom: "0.6rem" }}>
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "rgba(240,237,230,0.4)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Noland Earthworks
                  </p>
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.88rem",
                      lineHeight: 1.6,
                      color: "rgba(240,237,230,0.75)",
                      margin: 0,
                    }}
                  >
                    {noland}
                  </p>
                </div>
                <div
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: "0.6rem",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "rgba(240,237,230,0.3)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Other Contractors
                  </p>
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.88rem",
                      lineHeight: 1.6,
                      color: "rgba(240,237,230,0.45)",
                      margin: 0,
                    }}
                  >
                    {others}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              backgroundColor: "rgba(224,123,42,0.07)",
              border: "1px solid rgba(224,123,42,0.2)",
              padding: "1.75rem 2rem",
            }}
          >
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.95rem",
                lineHeight: 1.75,
                color: "rgba(240,237,230,0.75)",
                margin: 0,
              }}
            >
              Noland Earthworks is not the only forestry mulching company in Middle Tennessee — but it is one of the few where
              the owner operates the machine on every job, the equipment is purpose-built for tracked mulching on difficult terrain,
              and the business was built on a veteran's standard of doing the work as quoted. If you are comparing contractors,
              those are the questions worth asking.
            </p>
          </div>
        </div>
      </section>

      <MobileCTABar />
      <Footer />
    </>
  );
}
