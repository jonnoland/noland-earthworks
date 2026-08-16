import { useState, useEffect, useRef } from "react";
import BlogPostLayout from "@/components/BlogPostLayout";

// Table of contents entries — id must match the h2 id attributes below
const TOC_ITEMS = [
  { id: "two-methods",      label: "The Two Main Methods" },
  { id: "six-variables",   label: "Six Key Cost Variables" },
  { id: "not-included",    label: "What Is Not Included" },
  { id: "accurate-quote",  label: "Getting an Accurate Quote" },
  { id: "best-value",      label: "Why Forestry Mulching Wins" },
];

function TableOfContents() {
  const [activeId, setActiveId] = useState<string>(TOC_ITEMS[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const headings = TOC_ITEMS.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Use the topmost visible heading
          const topmost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActiveId(topmost.target.id);
        }
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((el) => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 96; // account for sticky navbar height
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <aside
      style={{
        position: "sticky",
        top: "6rem",
        width: "220px",
        flexShrink: 0,
        alignSelf: "flex-start",
      }}
      aria-label="Table of contents"
    >
      <div
        style={{
          backgroundColor: "#0d0d0d",
          border: "1px solid rgba(240,237,230,0.08)",
          padding: "1.25rem 1rem",
        }}
      >
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#E07B2A",
            marginBottom: "0.85rem",
          }}
        >
          In This Guide
        </p>
        <nav>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.1rem" }}>
            {TOC_ITEMS.map(({ id, label }) => {
              const isActive = activeId === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => scrollTo(id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.45rem 0.6rem",
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.8rem",
                      lineHeight: 1.4,
                      color: isActive ? "#F0EDE6" : "rgba(240,237,230,0.45)",
                      borderLeft: isActive
                        ? "2px solid #E07B2A"
                        : "2px solid transparent",
                      transition: "color 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "rgba(240,237,230,0.8)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "rgba(240,237,230,0.45)";
                    }}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </aside>
  );
}

export default function CostOfLandClearing() {
  return (
    <BlogPostLayout
      title="What Affects a Land Clearing Proposal in Tennessee? (2026 Guide)"
      pageTitle="Land Clearing Proposal Factors in Tennessee | Noland Earthworks"
      metaDescription="Learn what affects a site-specific Tennessee land clearing proposal, including vegetation, terrain, access, acreage, travel, and the work included in writing."
      date="April 2026"
      dateISO="2026-04-01"
      lastUpdated="July 2026"
      lastUpdatedISO="2026-07-28"
      slug="cost-of-land-management-tennessee"
      readTime="9 min read"
      category="Pricing & Planning"
      keywords={["land clearing cost Tennessee", "forestry mulching cost per acre Tennessee", "how much does land clearing cost", "land management pricing Tennessee", "cost to clear land Tennessee 2026"]}
    >
      {/* Two-column layout: article + sticky TOC */}
      <div
        style={{
          display: "flex",
          gap: "2.5rem",
          alignItems: "flex-start",
        }}
      >
        {/* Main article content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p>
            If you own property in Middle or West Tennessee and need vegetation cleared, the first question is usually: <strong>what will this project require?</strong> A flat, light-brush field on dry ground is a different job from a steep, cedar-choked hillside with wet soil. This guide explains the site conditions that determine a written proposal so you know what to discuss before a site visit.
          </p>

          <h2 id="two-methods">The Two Main Methods and Their Scope Differences</h2>
          <p>
            The method you choose is the single biggest cost driver. There are two primary approaches for most Tennessee land clearing jobs:
          </p>

          <h3>Traditional Clearing (Bulldozing and Hauling)</h3>
          <p>
            Traditional clearing can involve bulldozers, excavators, and hauling equipment to remove trees, stumps, roots, and debris. It may be appropriate when another contractor needs a different construction or excavation scope. Noland Earthworks does not provide that grading, excavation, hauling, or building-pad preparation work.
          </p>

          <h3>Forestry Mulching (Single-Machine Method)</h3>
          <p>
            Forestry mulching uses a tracked machine with a drum mulcher to process brush, saplings, and suitable small trees into mulch. The mulch typically remains on the ground. Material size, density, terrain, utilities, and access are confirmed during a site visit; stump and root extraction below grade is not part of forestry mulching unless a written proposal specifically says otherwise.
          </p>
          <p>
            Forestry mulching can be a practical vegetation-management approach for suitable residential, agricultural, and recreational properties when leaving mulch on site fits the owner’s goal.
          </p>

          <h2 id="six-variables">What Drives the Price: The Six Key Variables</h2>
          <p>
            Within those ranges, here is what moves the number up or down on any specific property:
          </p>

          <h3>1. Vegetation Density and Type</h3>
          <p>
            This is the most direct cost driver. A field of light brush and saplings clears faster than a dense cedar thicket or a stand of mature hardwoods. In Middle Tennessee, eastern red cedar is the most common clearing challenge — it spreads aggressively into idle pastures and can form impenetrable stands on land that was open ground ten years ago. Dense cedar at 6–8 inches diameter requires more time per acre than light brush, which means higher cost.
          </p>
          <p>
            Hardwood timber — oaks, hickories, tulip poplars — takes longer to grind than cedar or brush. If your property has a mix of mature hardwoods and dense understory, expect to be toward the higher end of the range.
          </p>

          <h3>2. Terrain and Slope</h3>
          <p>
            Flat, accessible ground generally allows more efficient work. Steep slopes require slower, more careful machine operation to maintain stability and control. Rocky terrain can slow work and increase wear. These conditions are assessed on site rather than priced from a generic multiplier.
          </p>

          <h3>3. Soil Conditions and Ground Wetness</h3>
          <p>
            Wet ground slows everything down. A tracked forestry mulcher handles wet conditions better than wheeled equipment, but standing water, saturated soils, or bottomland areas still require more careful operation to avoid ground damage. Jobs scheduled during or after heavy rain may need to be delayed or will take longer per acre. Properties with creek frontage or low-lying areas should be assessed during a site visit to understand the wet-ground conditions.
          </p>

          <h3>4. Acreage</h3>
          <p>
            Larger jobs cost less per acre than smaller ones. The mobilization cost — getting the machine to the site — is fixed regardless of acreage. On a 1-acre lot, that mobilization cost is a significant portion of the total. On a 15-acre job, it spreads across more productive hours. As a general rule, jobs under 2 acres carry a higher per-acre cost than jobs of 5 acres or more.
          </p>

          <h3>5. Access and Site Conditions</h3>
          <p>
            A property with a clear, wide access road is straightforward to mobilize. A property with a narrow driveway, low-hanging power lines, a locked gate, or no direct road access takes more time and coordination. Proximity to structures, fences, utilities, or property lines also affects the work — clearing close to a fence line or a building requires more careful, slower operation than open-field work.
          </p>

          <h3>6. Distance from the Contractor's Base</h3>
          <p>
            Travel and mobilization planning can differ by property location. Noland Earthworks is based in Vanleer, Tennessee, and serves listed counties across Middle and West Tennessee. The written proposal confirms any location-specific planning after the property review.
          </p>

          <h2 id="not-included">What Is Not Included in Land Clearing</h2>
          <p>
            This is worth stating clearly because it is a common source of confusion. Land clearing — whether by forestry mulching or traditional methods — removes vegetation. It does not include:
          </p>
          <ul>
            <li><strong>Grading or leveling</strong> — Changing the grade of the land requires a separate contractor with grading equipment.</li>
            <li><strong>Excavation or dirt work</strong> — Digging, filling, or moving large volumes of soil is a separate scope of work.</li>
            <li><strong>Stump grinding to below grade</strong> — Forestry mulching grinds stumps at ground level. If you need stumps removed below grade for construction, that requires additional work.</li>
            <li><strong>Debris hauling</strong> — Forestry mulching leaves mulch on site. If you need the mulch removed, that is a separate cost.</li>
            <li><strong>Seeding or landscaping</strong> — Clearing prepares the ground. Seeding, sodding, or landscaping is a separate project.</li>
          </ul>

          <h2 id="accurate-quote">Getting an Accurate Quote</h2>
          <p>
            The only way to get an accurate quote for a land clearing project is an on-site visit. Phone quotes and online estimates based on acreage alone are not reliable because the variables above — vegetation density, terrain, access, soil conditions — cannot be assessed without seeing the property. Any contractor who gives you a firm price over the phone without visiting the site is either guessing or will find reasons to add costs later.
          </p>
          <p>
            Noland Earthworks reviews site-visit requests the same day or the next morning. If the project is a fit, Jon will arrange a property review and prepare a written scope and quote based on the conditions observed.
          </p>

          <h2 id="best-value">Why Forestry Mulching Delivers the Best Value for Most Tennessee Properties</h2>
          <p>
            For the majority of residential, agricultural, and recreational land clearing projects in Tennessee — pasture reclamation, lot clearing, fence line restoration, trail cutting, acreage cleanup — forestry mulching delivers the best combination of cost, speed, and land health. The single-machine process eliminates the secondary costs of hauling and burning, the mulch layer protects the soil from erosion and returns organic matter as it decomposes, and the tracked platform handles the terrain and soil conditions common across Middle and West Tennessee.
          </p>
          <p>
            The cases where traditional clearing makes more sense are specific: building foundations that require complete stump removal, large timber harvests where the wood has commercial value, or sites that need significant grade changes as part of the clearing scope. For everything else, forestry mulching is the right tool.
          </p>
        </div>

        {/* Sticky table of contents — hidden on mobile */}
        <div className="hidden lg:block">
          <TableOfContents />
        </div>
      </div>
    </BlogPostLayout>
  );
}
