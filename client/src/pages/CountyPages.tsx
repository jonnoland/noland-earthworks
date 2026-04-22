/*
 * All 12 Middle Tennessee county landing pages — data-driven, single file.
 * Each county gets its own exported component used in App.tsx routing.
 */
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountyPageLayout, { CountyPageProps } from "@/components/CountyPageLayout";
import MobileCTABar from "@/components/MobileCTABar";
import { usePageTitle } from "@/hooks/usePageTitle";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/hero-forestry-golden_b098141c.webp";
const LAND_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";

const COMMON_FAQS = [
  {
    question: "Do you offer free estimates?",
    answer:
      "Yes — every project starts with a free, no-obligation on-site estimate. We'll walk the property with you, discuss your goals, and provide a clear written quote.",
  },
  {
    question: "Are you licensed and insured?",
    answer:
      "Yes. Noland Earthworks is fully insured for general liability and equipment. We're happy to provide proof of insurance before any project begins.",
  },
  {
    question: "How quickly can you start?",
    answer:
      "Scheduling depends on current workload and weather, but we typically can begin most projects within 1–3 weeks of the estimate. Contact us for current availability.",
  },
  {
    question: "What size properties do you work on?",
    answer:
      "We work on properties ranging from a quarter-acre residential lot to hundreds of acres of commercial or agricultural land. Our equipment scales to fit the job.",
  },
];

const countyData: Record<string, CountyPageProps> = {
  "davidson-county": {
    county: "Davidson County",
    state: "Tennessee",
    slug: "davidson-county",
    heroImage: HERO,
    nearbyCounties: [
      { name: "Williamson County", slug: "williamson-county" },
      { name: "Wilson County", slug: "wilson-county" },
      { name: "Sumner County", slug: "sumner-county" },
      { name: "Robertson County", slug: "robertson-county" },
      { name: "Cheatham County", slug: "cheatham-county" },
    ],
    intro: [
      "Noland Earthworks provides professional land management and forestry mulching services throughout Davidson County, Tennessee. Whether you own a residential lot in the Nashville suburbs, a rural acreage in the county's outer areas, or a commercial development site, our veteran-owned team delivers efficient, reliable land services at competitive rates.",
      "Davidson County's rapid growth has created strong demand for land management and site preparation services. We work with homeowners, developers, farmers, and property managers to clear overgrown lots, prepare building sites, manage vegetation along fence lines and waterways, and restore neglected land to productive use.",
      "Right-of-way clearing is a consistent need across Davidson County, from utility corridors along I-40, I-65, and I-24 to fence-line reclamation on outer rural acreage and driveway clearing for new development sites on the county's expanding edges. Our forestry mulching equipment cuts a clean, defined corridor in a single pass without disturbing the surrounding land — no hauling, no burning, no soil compaction on either side of the line. Visit our Right-of-Way Clearing service page for pricing details, or call for a free on-site estimate.",
      "Our forestry mulching equipment handles everything from light brush to dense woodland in a single pass — no hauling, no burning, minimal soil disturbance. Contact us today for a free on-site estimate anywhere in Davidson County.",
    ],
    nearbyAreas: [
      "Nashville", "Antioch", "Bellevue", "Donelson", "Hermitage",
      "Madison", "Old Hickory", "Goodlettsville", "Bordeaux", "Joelton",
    ],
    faqs: [
      {
        question: "Do you serve all of Nashville and Davidson County?",
        answer:
          "Yes — we serve all areas of Davidson County including Nashville proper, Antioch, Hermitage, Madison, Bellevue, and all surrounding communities.",
      },
      ...COMMON_FAQS,
    ],
  },
  "williamson-county": {
    county: "Williamson County",
    state: "Tennessee",
    slug: "williamson-county",
    heroImage: LAND_HERO,
    nearbyCounties: [
      { name: "Davidson County", slug: "davidson-county" },
      { name: "Maury County", slug: "maury-county" },
      { name: "Rutherford County", slug: "rutherford-county" },
      { name: "Cheatham County", slug: "cheatham-county" },
      { name: "Dickson County", slug: "dickson-county" },
    ],
    intro: [
      "Noland Earthworks serves Williamson County, Tennessee with professional forestry mulching, land management, and vegetation management services. As one of the fastest-growing counties in the nation, Williamson County sees constant demand for land preparation — from new home construction in Franklin and Brentwood to rural acreage clearing in Fairview and College Grove.",
      "Our veteran-owned team understands the unique landscape of Williamson County — rolling hills, cedar glades, and dense hardwood forests that require experienced operators and the right equipment. We use modern forestry mulching machines that clear efficiently while protecting the topsoil and natural contours of your land.",
      "Right-of-way clearing is in high demand across Williamson County as the road network expands to serve new subdivisions and rural properties. Cedar glade terrain near Leiper's Fork and College Grove frequently requires driveway corridors cut through dense cedar and hardwood, while utility easements along the county's expanding road network need regular maintenance to stay open. Our forestry mulching equipment handles these corridors cleanly and efficiently. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Whether you need a small residential lot cleared or a large agricultural property managed, we provide free estimates and transparent pricing throughout Williamson County.",
    ],
    nearbyAreas: [
      "Franklin", "Brentwood", "Spring Hill", "Nolensville", "Fairview",
      "Thompson's Station", "College Grove", "Arrington", "Leiper's Fork", "Triune",
    ],
    faqs: [
      {
        question: "Do you work in Franklin and Brentwood?",
        answer:
          "Yes — Franklin and Brentwood are two of our most active service areas in Williamson County. We handle everything from residential lot clearing to large acreage projects.",
      },
      ...COMMON_FAQS,
    ],
  },
  "rutherford-county": {
    county: "Rutherford County",
    state: "Tennessee",
    slug: "rutherford-county",
    heroImage: HERO,
    nearbyCounties: [
      { name: "Davidson County", slug: "davidson-county" },
      { name: "Williamson County", slug: "williamson-county" },
      { name: "Wilson County", slug: "wilson-county" },
      { name: "Cannon County", slug: "cannon-county" },
      { name: "Bedford County", slug: "bedford-county" },
    ],
    intro: [
      "Rutherford County's dynamic mix of booming suburban areas like Murfreesboro and expansive rural farmland requires a versatile approach to land management. Noland Earthworks delivers top-tier forestry mulching and land management services tailored to the specific needs of Rutherford County property owners.",
      "Our advanced mulching equipment efficiently processes heavy brush and trees, leaving a smooth, walkable surface that is immediately ready for use. This environmentally conscious method eliminates the need for burning and hauling, making it the perfect solution for both residential lot preparation and large-scale agricultural clearing.",      "Right-of-way clearing is a growing need in Rutherford County as suburban development pushes into rural land near Eagleville and Rockvale. Agricultural fence lines need periodic reclamation from encroaching cedar and brush, utility easements along the I-24 corridor require maintenance, and new driveway corridors must be cut through wooded acreage for rural residential builds. Our forestry mulching equipment handles all of these in a single pass without disturbing the surrounding land. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We are committed to helping you reclaim your land, improve property value, and maintain clear, safe access across your Rutherford County property.",
    ],
    nearbyAreas: [
      "Murfreesboro", "Smyrna", "LaVergne", "Eagleville", "Lascassas",
      "Rockvale", "Christiana", "Readyville", "Walter Hill", "Blackman",
    ],
    faqs: [
      {
        question: "Do you serve Murfreesboro and Smyrna?",
        answer:
          "Yes — Murfreesboro and Smyrna are core service areas for us in Rutherford County. We also serve all surrounding communities throughout the county.",
      },
      {
        question: "Can you prepare a residential lot for new construction in the Murfreesboro area?",
        answer:
          "Yes — residential lot clearing for new construction is one of our most common projects in Rutherford County. We clear trees, stumps, brush, and undergrowth and leave a smooth, graded surface ready for your builder. Our forestry mulching process is faster and less disruptive than traditional clearing, which is a major advantage in Rutherford County's fast-moving real estate market.",
      },
      {
        question: "Do you clear large agricultural tracts in the rural parts of Rutherford County?",
        answer:
          "Absolutely. The rural areas of Rutherford County — including Eagleville, Lascassas, and Rockvale — have significant demand for large-scale pasture reclamation and agricultural clearing. We work efficiently on multi-acre tracts and can clear overgrown fields, fence lines, and wooded areas to return land to productive agricultural use.",
      },
      {
        question: "How does forestry mulching improve property value in Rutherford County?",
        answer:
          "Cleared, accessible land consistently appraises higher and sells faster than overgrown property. In Rutherford County's competitive real estate market, a professionally cleared lot signals to buyers and developers that the land is ready to use. Our process also eliminates the liability of dead trees and dense brush, which can be a concern for insurance and financing.",
      },
      ...COMMON_FAQS,
    ],
  },
  "wilson-county": {
    county: "Wilson County",
    state: "Tennessee",
    slug: "wilson-county",
    heroImage: LAND_HERO,
    nearbyCounties: [
      { name: "Davidson County", slug: "davidson-county" },
      { name: "Rutherford County", slug: "rutherford-county" },
      { name: "Sumner County", slug: "sumner-county" },
      { name: "Trousdale County", slug: "trousdale-county" },
      { name: "Macon County", slug: "macon-county" },
    ],
    intro: [
      "Wilson County is experiencing rapid growth, and whether you are developing a new residential lot in Mt. Juliet or managing agricultural land in Lebanon, Noland Earthworks provides the professional land management services you need.",
      "Our forestry mulching services are specifically tailored to the diverse terrain of Wilson County, offering an eco-friendly alternative to traditional bulldozing and burning. By turning brush, undergrowth, and small trees directly into nutrient-rich mulch, we help prevent soil erosion — a critical factor for properties near the Cumberland River or local creeks.",
      "Right-of-way clearing is a growing need in Wilson County as residential development pushes into rural land along the Cumberland River bottomland near Lebanon and new corridors open up in the Mt. Juliet and Providence areas. We clear utility easements along US-70, private driveway corridors through wooded acreage, and fence lines on rural farmland throughout the county — cutting a clean path without disturbing the surrounding land. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We also offer comprehensive vegetation management and property maintenance to keep your fence lines clear and your acreage accessible year-round. As a veteran-owned business, we pride ourselves on delivering precise, on-time results for every Wilson County project.",
    ],
    nearbyAreas: [
      "Lebanon", "Mount Juliet", "Watertown", "Gladeville", "Statesville",
      "Green Hill", "Norene", "Laguardo", "Tuckers Cross Roads", "Providence",
    ],
    faqs: [
      {
        question: "Do you serve Lebanon and Mount Juliet?",
        answer:
          "Yes — Lebanon and Mount Juliet are both active service areas in Wilson County. We work throughout the county on projects of all sizes.",
      },
      {
        question: "Can you clear land near the Cumberland River without causing erosion?",
        answer:
          "Absolutely. Forestry mulching is one of the best methods for properties near waterways like the Cumberland River. Rather than leaving bare soil exposed, our mulching process creates a protective ground cover that holds the soil in place, dramatically reducing the risk of erosion and sediment runoff into nearby creeks and streams.",
      },
      {
        question: "My Wilson County lot has a lot of cedar trees — can you handle that?",
        answer:
          "Yes — cedar is one of the most common trees we clear in Wilson County, and our forestry mulchers are built for it. We can process cedar stands of any density in a single pass, grinding trees and stumps down to a mulch layer without the need for separate hauling or burning.",
      },
      {
        question: "Do you work on new residential lots in Mt. Juliet and the Providence area?",
        answer:
          "Yes. New residential lot clearing is a core part of our work in Wilson County. Whether you're preparing a site for a new home build or clearing a wooded lot you've owned for years, we provide fast, clean results and can typically schedule an estimate within a week.",
      },
      ...COMMON_FAQS,
    ],
  },
  "sumner-county": {
    county: "Sumner County",
    state: "Tennessee",
    slug: "sumner-county",
    heroImage: HERO,
    nearbyCounties: [
      { name: "Davidson County", slug: "davidson-county" },
      { name: "Wilson County", slug: "wilson-county" },
      { name: "Robertson County", slug: "robertson-county" },
      { name: "Trousdale County", slug: "trousdale-county" },
      { name: "Macon County", slug: "macon-county" },
    ],
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout Sumner County, Tennessee. From Hendersonville's lakeside properties to the rural farmland around Gallatin and Portland, we help property owners clear and manage their land with professional-grade equipment and veteran work ethic.",
      "Sumner County's proximity to Nashville has driven strong residential growth, creating demand for lot clearing, site preparation, and vegetation management. Our team handles everything from small residential lots to large rural acreage, using forestry mulching to clear efficiently with minimal environmental impact.",
      "Right-of-way clearing is a consistent need in Sumner County, where lakeside properties on Old Hickory Lake near Gallatin and Hendersonville require access road clearing through wooded shoreline terrain and agricultural fence lines near Portland and Westmoreland need periodic reclamation from encroaching brush. We also maintain utility easements along US-31E and cut driveway corridors for rural residential builds throughout the county. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Contact us for a free estimate on your Sumner County property — we're typically available within a few weeks.",
    ],
    nearbyAreas: [
      "Hendersonville", "Gallatin", "Portland", "Goodlettsville", "White House",
      "Millersville", "Westmoreland", "Bethpage", "Cottontown", "Mitchellville",
    ],
    faqs: [
      {
        question: "Do you serve Hendersonville and Gallatin?",
        answer:
          "Yes — Hendersonville and Gallatin are both active service areas for us in Sumner County. We serve all communities throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "robertson-county": {
    county: "Robertson County",
    state: "Tennessee",
    slug: "robertson-county",
    heroImage: LAND_HERO,
    nearbyCounties: [
      { name: "Davidson County", slug: "davidson-county" },
      { name: "Sumner County", slug: "sumner-county" },
      { name: "Cheatham County", slug: "cheatham-county" },
      { name: "Montgomery County", slug: "montgomery-county" },
    ],
    intro: [
      "Noland Earthworks serves Robertson County, Tennessee with professional land management, forestry mulching, and vegetation management services. Springfield, White House, and the surrounding rural communities rely on our veteran-owned team for efficient, reliable land services.",
      "Robertson County's agricultural heritage means many of our clients are farmers reclaiming overgrown pasture, clearing fence lines, or managing invasive species on their property. Our forestry mulching equipment handles dense brush and small trees in a single pass, returning land to productive use quickly and cost-effectively.",
      "Right-of-way clearing is a natural fit for Robertson County's agricultural landscape, where fence lines frequently become overgrown with invasive hedge and cedar and utility easements along US-41 need periodic reclamation. We also clear private driveway corridors through wooded land near Adams and Cedar Hill, and access roads on rural farm properties throughout the county. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free estimates throughout Robertson County — call or request a quote online today.",
    ],
    nearbyAreas: [
      "Springfield", "White House", "Greenbrier", "Cross Plains", "Adams",
      "Cedar Hill", "Coopertown", "Orlinda", "Ridgetop", "Turnersville",
    ],
    faqs: [
      {
        question: "Do you serve Springfield and White House?",
        answer:
          "Yes — Springfield and White House are both service areas in Robertson County. We work throughout the county on residential, agricultural, and commercial projects.",
      },
      ...COMMON_FAQS,
    ],
  },
  "cheatham-county": {
    county: "Cheatham County",
    state: "Tennessee",
    slug: "cheatham-county",
    heroImage: HERO,
    nearbyCounties: [
      { name: "Davidson County", slug: "davidson-county" },
      { name: "Dickson County", slug: "dickson-county" },
      { name: "Robertson County", slug: "robertson-county" },
      { name: "Williamson County", slug: "williamson-county" },
    ],
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout Cheatham County, Tennessee. Ashland City and the surrounding communities along the Cumberland River corridor benefit from our professional land services, delivered by a veteran-owned team with the work ethic and integrity you deserve.",
      "Cheatham County's wooded terrain and river bottomland make forestry mulching an ideal solution for many land management projects. Our equipment handles the dense hardwood and cedar growth common in the area, clearing efficiently while preserving the natural contours of the land.",
      "Right-of-way clearing is a frequent request in Cheatham County, where Cumberland River bottomland easements near Ashland City need periodic maintenance, wooded hillside driveways in Kingston Springs and Pegram require corridors cut through dense hardwood, and utility corridors along TN-12 need regular clearing. Fence-line reclamation on rural properties throughout the county is another common job for our forestry mulching equipment. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Contact us for a free on-site estimate anywhere in Cheatham County.",
    ],
    nearbyAreas: [
      "Ashland City", "Kingston Springs", "Pegram", "Pleasant View",
      "Chapmansboro", "Marrowbone", "Sycamore", "Harpeth",
    ],
    faqs: [
      {
        question: "Do you serve Ashland City and Kingston Springs?",
        answer:
          "Yes — Ashland City and Kingston Springs are both service areas in Cheatham County. We serve all communities throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "dickson-county": {
    county: "Dickson County",
    state: "Tennessee",
    slug: "dickson-county",
    heroImage: LAND_HERO,
    nearbyCounties: [
      { name: "Cheatham County", slug: "cheatham-county" },
      { name: "Montgomery County", slug: "montgomery-county" },
      { name: "Williamson County", slug: "williamson-county" },
      { name: "Hickman County", slug: "hickman-county" },
      { name: "Houston County", slug: "houston-county" },
    ],
    intro: [
      "Located right in our backyard, Dickson County is a core service area for Noland Earthworks. We have extensive experience navigating the local terrain, from the dense forests near Montgomery Bell State Park to the developing residential areas around Dickson and White Bluff.",
      "Our forestry mulching services provide a fast, single-step process to clear underbrush, small trees, and invasive vegetation, turning them into a beneficial mulch layer. This method is not only cost-effective but also preserves the root systems of the mature trees you want to keep.",
      "Whether you require lot clearing for a new build, right-of-way clearing for utilities, or routine property maintenance to keep your land pristine, our local expertise ensures your Dickson County project is completed to the highest standards.",
      "Right-of-way clearing is one of the most common requests we receive in Dickson County. The county's rural road network, active development corridors, and working farms generate consistent demand for driveway clearing, fence-line maintenance, utility easement work, and access road reclamation. Our forestry mulching equipment cuts a clean, defined corridor in a single pass — no hauling, no burning, no soil disturbance on either side of the line. If you need a ROW opened or maintained anywhere in Dickson County, visit our Right-of-Way Clearing service page or call us for a free on-site estimate.",
    ],
    nearbyAreas: [
      "Dickson", "Charlotte", "White Bluff", "Burns", "Slayden",
      "Vanleer", "Bon Aqua", "Nunnelly", "Pinewood",
    ],
    faqs: [
      {
        question: "Do you serve Dickson and White Bluff?",
        answer:
          "Yes — Dickson and White Bluff are both active service areas in Dickson County. We work throughout the county on all types of land management projects.",
      },
      {
        question: "Do you clear land near Montgomery Bell State Park?",
        answer:
          "Yes. We're very familiar with the terrain in and around the Montgomery Bell area. Properties near the park often feature dense mixed hardwood and cedar growth, and our forestry mulchers handle it efficiently. We're careful to work within any applicable buffer zones and can advise on best practices for clearing near protected or sensitive areas.",
      },
      {
        question: "Can you do right-of-way clearing for utilities or driveways in Dickson County?",
        answer:
          "Absolutely — right-of-way clearing is one of our most common jobs in Dickson County. Whether you need a utility corridor cleared, a new driveway cut through wooded land, or an existing access road widened, we can handle it quickly and cleanly with our forestry mulching equipment.",
      },
      {
        question: "How soon can you start a project in Dickson County?",
        answer:
          "Because Dickson County is our home base, we're often able to schedule estimates and start projects faster here than in more distant counties. In most cases, we can have someone out for a free estimate within a few days and begin work within 1–2 weeks, depending on current scheduling.",
      },
      ...COMMON_FAQS,
    ],
  },
  "maury-county": {
    county: "Maury County",
    state: "Tennessee",
    slug: "maury-county",
    heroImage: HERO,
    nearbyCounties: [
      { name: "Williamson County", slug: "williamson-county" },
      { name: "Hickman County", slug: "hickman-county" },
      { name: "Lewis County", slug: "lewis-county" },
      { name: "Lawrence County", slug: "lawrence-county" },
      { name: "Giles County", slug: "giles-county" },
    ],
    intro: [
      "As Columbia and the surrounding areas of Maury County continue to expand, the demand for responsible land development has never been higher. Noland Earthworks is proud to offer premier forestry mulching and land management services throughout Maury County.",
      "Our approach is designed to maximize the usable space on your property while minimizing environmental impact. Forestry mulching is ideal for clearing hunting lanes, creating riding trails, or preparing a site for construction without the need for costly hauling or burning. We understand the unique soil and vegetation characteristics of the region, allowing us to provide targeted property maintenance and brush clearing solutions.",
      "Right-of-way clearing is a regular request in Maury County, particularly on equestrian and horse farm properties near Columbia and Hampshire where fence-line corridors must be kept clear and driveway access through dense cedar and hardwood needs to be maintained. We also clear utility easements along US-412 and open access roads for rural residential builds throughout the county. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Trust our experienced, veteran-owned team to transform your overgrown Maury County property into a clean, accessible, and beautiful landscape.",
    ],
    nearbyAreas: [
      "Columbia", "Spring Hill", "Mount Pleasant", "Culleoka", "Santa Fe",
      "Theta", "Hampshire", "Bigbyville", "Williamsport",
    ],
    faqs: [
      {
        question: "Do you serve Columbia and Spring Hill in Maury County?",
        answer:
          "Yes — Columbia and the Maury County portion of Spring Hill are both service areas for us. We work throughout the county on residential and agricultural projects.",
      },
      {
        question: "Can you clear hunting lanes and food plots on my Maury County property?",
        answer:
          "Yes — this is one of our most popular requests in Maury County. We can cut precise hunting lanes, open up food plot areas, and thin timber stands to improve wildlife habitat. Forestry mulching is ideal for this type of work because it leaves a clean, navigable ground surface without the mess of slash piles or burn debris.",
      },
      {
        question: "Is forestry mulching safe for the soil on Maury County farmland?",
        answer:
          "Yes. Unlike bulldozing or traditional clearing, forestry mulching leaves the topsoil intact and deposits a layer of organic mulch that actually improves soil health over time. For Maury County's agricultural land, this means you can return the property to productive use — whether for crops, pasture, or livestock — much faster than with conventional clearing methods.",
      },
      {
        question: "Do you create riding trails or equestrian paths in Maury County?",
        answer:
          "Absolutely. Maury County has a strong equestrian community, and we regularly clear riding trails and access paths for horse properties. Our mulchers create smooth, debris-free trails through wooded areas, and we can work around existing trees and terrain features to design a trail that fits your property.",
      },
      ...COMMON_FAQS,
    ],
  },
  "wayne-county": {
    county: "Wayne County",
    state: "Tennessee",
    slug: "wayne-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout Wayne County, Tennessee. Waynesboro and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Wayne County's heavily wooded terrain and agricultural land make forestry mulching an ideal solution for property owners looking to clear land without the cost and disruption of traditional clearing methods. Our single-pass mulching process handles dense hardwood and brush growth efficiently, leaving a clean mulch layer that protects the soil.",
      "Right-of-way clearing is a regular need in Wayne County, where the Tennessee River corridor near Clifton generates demand for easement maintenance along creek bottoms and heavily wooded rural driveways require corridors cut through dense hardwood. Fence-line reclamation on agricultural land and access roads for hunting properties in Wayne County's remote forested terrain are also common jobs for our forestry mulching equipment. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free on-site estimates throughout Wayne County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Waynesboro", "Clifton", "Collinwood", "Lutts", "Cypress Inn",
      "Iron City", "Leoma", "Newburg",
    ],
    faqs: [
      {
        question: "Do you serve Waynesboro and Wayne County?",
        answer:
          "Yes — Waynesboro and all of Wayne County are in our service area. We work on residential, agricultural, and commercial land management projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "cannon-county": {
    county: "Cannon County",
    state: "Tennessee",
    slug: "cannon-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks serves Cannon County, Tennessee with professional forestry mulching, land management, and vegetation management services. Woodbury and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Cannon County's rural character and mix of hardwood forest and agricultural land make it a strong fit for our forestry mulching services. We help property owners clear overgrown land, reclaim pasture, manage invasive species, and prepare sites for construction or recreational use.",
      "Right-of-way clearing is a steady need in Cannon County, where rural agricultural properties near Woodbury require fence-line reclamation from encroaching cedar and brush and driveway corridors must be cut through wooded hillsides for rural residential builds. Access roads for hunting and recreational properties in Cannon County's forested terrain are another common job for our forestry mulching equipment. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Contact us for a free estimate on your Cannon County property — we serve the entire county.",
    ],
    nearbyAreas: [
      "Woodbury", "Auburntown", "Bradyville", "Gassaway",
      "Readyville", "Short Mountain",
    ],
    faqs: [
      {
        question: "Do you serve Woodbury and Cannon County?",
        answer:
          "Yes — Woodbury and all of Cannon County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "bedford-county": {
    county: "Bedford County",
    state: "Tennessee",
    slug: "bedford-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout Bedford County, Tennessee. Shelbyville and the surrounding communities trust our veteran-owned team for efficient, professional land services at competitive rates.",
      "Bedford County's mix of horse farms, agricultural land, and growing residential development creates strong demand for land management and site preparation. Our forestry mulching equipment handles the dense cedar and hardwood growth common in the area, clearing efficiently while preserving the natural landscape.",
      "Right-of-way clearing is a consistent need in Bedford County's horse farm country, where equestrian properties near Shelbyville, Wartrace, and Bell Buckle require fence-line corridors kept clear and driveway access through dense cedar and hardwood maintained. We also clear utility easements along US-231 and open access roads for rural residential and agricultural builds throughout the county. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free on-site estimates for all Bedford County projects — contact us today to schedule yours.",
    ],
    nearbyAreas: [
      "Shelbyville", "Wartrace", "Bell Buckle", "Normandy",
      "Unionville", "Flat Creek", "Rover",
    ],
    faqs: [
      {
        question: "Do you serve Shelbyville and Bedford County?",
        answer:
          "Yes — Shelbyville and all of Bedford County are in our service area. We work on residential, agricultural, and commercial projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "montgomery-county": {
    county: "Montgomery County",
    state: "Tennessee",
    slug: "montgomery-county",
    heroImage: HERO,
    nearbyCounties: [
      { name: "Robertson County", slug: "robertson-county" },
      { name: "Dickson County", slug: "dickson-county" },
      { name: "Cheatham County", slug: "cheatham-county" },
      { name: "Houston County", slug: "houston-county" },
    ],
    intro: [
      "From Clarksville to the rural outskirts, Montgomery County property owners trust Noland Earthworks for efficient, high-quality land management and forestry mulching. The rolling hills and dense woodlands of Montgomery County require specialized equipment and expertise to clear safely without damaging the underlying topsoil.",
      "Our state-of-the-art forestry mulchers can quickly eliminate invasive species, clear overgrown brush, and prepare lots for new construction or agricultural use. Unlike traditional clearing methods that leave unsightly burn piles and disturbed earth, our process leaves behind a protective layer of mulch that suppresses weeds and retains soil moisture.",
      "Right-of-way clearing is a consistent need in Montgomery County, from utility easements along US-41A and US-79 to private driveway corridors cut through wooded land near Cunningham and Palmyra and fence-line reclamation on agricultural properties throughout the county. We also serve the Fort Campbell community with access road clearing and easement maintenance on rural properties near the base. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Whether you need a single acre cleared for a new home site or extensive vegetation management for a large farm, our veteran-led team delivers reliable service across all of Montgomery County.",
    ],
    nearbyAreas: [
      "Clarksville", "Oak Grove", "Sango", "Cunningham",
      "Palmyra", "Woodlawn", "Southside", "Fredonia",
    ],
    faqs: [
      {
        question: "Do you serve Clarksville and Montgomery County?",
        answer:
          "Yes — Clarksville and all of Montgomery County are in our service area. We're proud to serve the Fort Campbell military community and all property owners in the area.",
      },
      {
        question: "Do you work with active-duty military and veterans near Fort Campbell?",
        answer:
          "Yes, and it's something we take pride in. Noland Earthworks is a veteran-owned business, and we're honored to serve the Fort Campbell community. We understand the demands of military life and work around your schedule to get your property cleared efficiently and professionally.",
      },
      {
        question: "Can you clear invasive species like kudzu or privet from my Montgomery County property?",
        answer:
          "Absolutely. Invasive vegetation is a major issue throughout Montgomery County, and forestry mulching is one of the most effective ways to address it. Our equipment grinds invasive shrubs, vines, and undergrowth down to the root zone in a single pass, and the resulting mulch layer helps suppress regrowth while protecting the soil.",
      },
      {
        question: "Do you handle large rural properties and farms in the Clarksville area?",
        answer:
          "Yes — large acreage is our specialty. Whether you need fence lines cleared, overgrown pasture reclaimed, or a multi-acre woodland thinned for agricultural use, we have the equipment and crew to handle it efficiently. We provide free on-site estimates for all farm and rural property projects in Montgomery County.",
      },
      ...COMMON_FAQS,
    ],
  },
  "lewis-county": {
    county: "Lewis County",
    state: "Tennessee",
    slug: "lewis-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides professional land management and forestry mulching services throughout Lewis County, Tennessee. Hohenwald and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Lewis County's forested hills and agricultural land make it an ideal fit for our forestry mulching services. Whether you need to clear overgrown pasture, manage invasive species, or prepare a site for construction, our equipment handles the job in a single pass with minimal soil disturbance.",
      "Right-of-way clearing is a common request in Lewis County, where remote rural properties near Hohenwald, Buffalo, and Summertown require driveway corridors cut through dense hardwood and fence lines reclaimed from multi-year brush encroachment. Access roads for hunting and recreational properties in Lewis County's heavily forested hills are another frequent job — our forestry mulching equipment handles these tight, wooded corridors without the soil disturbance of traditional dozer work. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free on-site estimates throughout Lewis County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Hohenwald", "Gordonsburg", "Newburg", "Napier",
      "Buffalo", "Summertown",
    ],
    faqs: [
      {
        question: "Do you serve Hohenwald and Lewis County?",
        answer:
          "Yes — Hohenwald and all of Lewis County are in our service area. We work on residential, agricultural, and commercial land management projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "perry-county": {
    county: "Perry County",
    state: "Tennessee",
    slug: "perry-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks serves Perry County, Tennessee with professional forestry mulching, land management, and vegetation management services. Linden and the surrounding rural communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Perry County's rugged terrain along the Buffalo River corridor and its heavily wooded hillsides make forestry mulching the most practical and cost-effective land management solution for most properties. Our equipment handles steep slopes and dense hardwood growth that traditional clearing methods struggle with.",
      "Right-of-way clearing along the Buffalo River corridor and throughout Perry County's rural road network is a specialty we bring to every job here. Private landowners need driveways cut through steep, wooded hillsides; farmers need fence lines reclaimed from multi-year brush encroachment; and rural property owners need easements maintained along creek bottoms and ridge lines. Our mulching equipment handles the tight, sloped corridors common in Perry County without the soil disturbance that traditional dozer work causes on these hillsides. Visit our Right-of-Way Clearing service page or call for a free estimate.",
      "Contact us for a free estimate on your Perry County property — we serve the entire county.",
    ],
    nearbyAreas: [
      "Linden", "Lobelville", "Decaturville", "Parsons",
      "Beardstown", "Flatwoods",
    ],
    faqs: [
      {
        question: "Do you serve Linden and Perry County?",
        answer:
          "Yes — Linden and all of Perry County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "benton-county": {
    county: "Benton County",
    state: "Tennessee",
    slug: "benton-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout Benton County, Tennessee. Camden and the surrounding communities trust our veteran-owned team for efficient, professional land services at competitive rates.",
      "Benton County's lakefront properties along Kentucky Lake and Barkley Lake, combined with its agricultural and rural land, create diverse land management needs. We work with lakefront property owners, farmers, and developers to clear land, manage vegetation, and prepare sites for a wide range of uses.",
      "Right-of-way clearing is a frequent need in Benton County, particularly for lakefront property owners along Kentucky Lake and Barkley Lake who need access roads cut through wooded shoreline terrain and fence lines maintained on agricultural land near Camden. We also clear utility easements along TN-70 and open private driveway corridors for rural residential properties throughout the county. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free on-site estimates for all Benton County projects — contact us today to schedule yours.",
    ],
    nearbyAreas: [
      "Camden", "Big Sandy", "Holladay", "Henrietta",
      "Bruceton", "Trezevant",
    ],
    faqs: [
      {
        question: "Do you serve Camden and Benton County?",
        answer:
          "Yes — Camden and all of Benton County are in our service area. We work on residential, lakefront, agricultural, and commercial projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "hickman-county": {
    county: "Hickman County",
    state: "Tennessee",
    slug: "hickman-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks serves Hickman County, Tennessee with professional land management, forestry mulching, and vegetation management services. Centerville and the surrounding communities benefit from our veteran-owned land services — delivered with the work ethic and integrity you deserve.",
      "Hickman County's rolling hills, cedar glades, and mixed hardwood forests are well-suited to our forestry mulching equipment. We help property owners clear overgrown land, reclaim pasture, manage invasive cedar, and prepare sites for residential or agricultural use.",
      "Right-of-way clearing is a regular need in Hickman County, where cedar glade terrain near Centerville and Lyles generates consistent demand for fence-line reclamation from invasive cedar and driveway corridors cut through wooded hillsides for rural residential builds. We also clear utility easements along TN-48 and open access roads for rural and recreational properties throughout the county. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Contact us for a free estimate on your Hickman County property — we're proud to serve the entire county.",
    ],
    nearbyAreas: [
      "Centerville", "Bon Aqua", "Dickson", "Nunnelly",
      "Lyles", "Primm Springs", "Pleasantville",
    ],
    faqs: [
      {
        question: "Do you serve Centerville and Hickman County?",
        answer:
          "Yes — Centerville and all of Hickman County are in our service area. We work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "houston-county": {
    county: "Houston County",
    state: "Tennessee",
    slug: "houston-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout Houston County, Tennessee. Erin and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Houston County's rural character, wooded terrain, and agricultural land make it a strong fit for our forestry mulching services. We help property owners clear overgrown lots, reclaim pasture, manage fence lines, and prepare sites for construction or recreational use.",
      "Right-of-way clearing is in steady demand in Houston County, where rural properties near Erin, Tennessee Ridge, and Cumberland City regularly need fence lines reclaimed from encroaching brush, utility easements along TN-149 maintained, and private driveway corridors opened through wooded terrain. Our forestry mulching equipment handles these jobs efficiently in a single pass without disturbing the surrounding land. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free on-site estimates throughout Houston County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Erin", "Tennessee Ridge", "Vanleer", "Slayden",
      "Dotsonville", "Cumberland City",
    ],
    faqs: [
      {
        question: "Do you serve Erin and Houston County?",
        answer:
          "Yes — Erin and all of Houston County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "humphreys-county": {
    county: "Humphreys County",
    state: "Tennessee",
    slug: "humphreys-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks serves Humphreys County, Tennessee with professional forestry mulching, land management, and vegetation management services. Waverly and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Humphreys County's mix of river bottomland along the Tennessee River, rolling hills, and agricultural land creates diverse land management needs. Our forestry mulching equipment is well-suited to the dense brush, willow, and hardwood growth common in the area.",
      "Right-of-way clearing is particularly relevant in Humphreys County, where river bottomland easements, pipeline corridors, and rural access roads frequently become overgrown with willow, cottonwood, and invasive brush. We clear utility easements, private driveway corridors, and fence-line ROWs throughout the county — cutting a clean, defined path without disturbing the surrounding land. Recurring annual maintenance contracts are available to keep your corridor open year after year. Learn more on our Right-of-Way Clearing service page or call for a free estimate.",
      "Contact us for a free estimate on your Humphreys County property — we serve the entire county.",
    ],
    nearbyAreas: [
      "Waverly", "McEwen", "New Johnsonville", "Waverly",
      "Hurricane Mills", "Bakerville",
    ],
    faqs: [
      {
        question: "Do you serve Waverly and Humphreys County?",
        answer:
          "Yes — Waverly and all of Humphreys County are in our service area. We work on residential, agricultural, and commercial land management projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "stewart-county": {
    county: "Stewart County",
    state: "Tennessee",
    slug: "stewart-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout Stewart County, Tennessee. Dover and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Stewart County's proximity to Land Between the Lakes and its heavily forested terrain make forestry mulching the most practical land management solution for most properties. We work with hunters, recreational landowners, farmers, and developers throughout the county.",
      "Right-of-way clearing is in high demand in Stewart County, where hunting properties, rural homesteads, and farm operations regularly need access roads cut through dense timber, fence lines reclaimed from encroaching brush, and private easements maintained. The county's heavily wooded character means corridors can close back in quickly — our recurring maintenance contracts keep your ROW open season after season without the cost of a full reclamation each time. See our Right-of-Way Clearing service page for pricing details, or call for a free on-site estimate.",
      "We offer free on-site estimates throughout Stewart County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Dover", "Cumberland City", "Indian Mound", "Big Rock",
      "Bumpus Mills", "Erin",
    ],
    faqs: [
      {
        question: "Do you serve Dover and Stewart County?",
        answer:
          "Yes — Dover and all of Stewart County are in our service area. We work on residential, recreational, agricultural, and commercial land management projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "marshall-county": {
    county: "Marshall County",
    state: "Tennessee",
    slug: "marshall-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks provides professional land management and forestry mulching services throughout Marshall County, Tennessee. Lewisburg and the surrounding communities rely on our veteran-owned team for efficient, dependable land services at competitive rates.",
      "Marshall County's rolling farmland, cedar thickets, and wooded creek bottoms are ideal terrain for our forestry mulching equipment. We help property owners clear overgrown fields, reclaim pasture, manage fence lines, and prepare sites for construction or agricultural use.",
      "Right-of-way clearing is a regular request in Marshall County, where rolling farmland near Lewisburg, Chapel Hill, and Petersburg generates consistent demand for fence-line reclamation from cedar thickets and brush and driveway clearing for rural residential builds. We also clear utility easements along US-431 and maintain access roads on agricultural properties throughout the county. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free on-site estimates throughout Marshall County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Lewisburg", "Cornersville", "Chapel Hill", "Petersburg",
      "Farmington", "Belfast",
    ],
    faqs: [
      {
        question: "Do you serve Lewisburg and Marshall County?",
        answer:
          "Yes — Lewisburg and all of Marshall County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "giles-county": {
    county: "Giles County",
    state: "Tennessee",
    slug: "giles-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks serves Giles County, Tennessee with professional forestry mulching, land management, and vegetation management services. Pulaski and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Giles County's diverse landscape — from open farmland to dense hardwood forests — creates a wide range of land management needs. Our modern forestry mulching equipment handles everything from light brush to mature timber in a single efficient pass.",
      "Right-of-way clearing is a steady need in Giles County, where agricultural and equestrian properties near Pulaski, Lynnville, and Minor Hill require fence-line reclamation from encroaching brush, driveway corridors cut through hardwood for rural builds, and utility easements along US-64 maintained. Our forestry mulching equipment handles these corridors cleanly in a single pass without disturbing the surrounding farmland or pasture. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Contact us for a free estimate on your Giles County property — we serve the entire county and surrounding areas.",
    ],
    nearbyAreas: [
      "Pulaski", "Elkton", "Lynnville", "Minor Hill",
      "Prospect", "Ardmore",
    ],
    faqs: [
      {
        question: "Do you serve Pulaski and Giles County?",
        answer:
          "Yes — Pulaski and all of Giles County are in our service area. We work on residential, agricultural, and commercial land management projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "lincoln-county": {
    county: "Lincoln County",
    state: "Tennessee",
    slug: "lincoln-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout Lincoln County, Tennessee. Fayetteville and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Lincoln County's agricultural heritage and wooded terrain make it a natural fit for our forestry mulching services. We help farmers, developers, and property owners clear land efficiently while preserving topsoil and minimizing environmental impact.",
      "Right-of-way clearing is a consistent need across Lincoln County's agricultural landscape, where fence lines near Fayetteville, Flintville, and Kelso regularly become overgrown with encroaching brush and cedar and utility easements along US-64 and TN-50 need periodic maintenance. We also cut driveway corridors through wooded land for rural residential and farm builds throughout the county. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free on-site estimates throughout Lincoln County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Fayetteville", "Flintville", "Kelso", "Mulberry",
      "Petersburg", "Elora",
    ],
    faqs: [
      {
        question: "Do you serve Fayetteville and Lincoln County?",
        answer:
          "Yes — Fayetteville and all of Lincoln County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "moore-county": {
    county: "Moore County",
    state: "Tennessee",
    slug: "moore-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides professional land management and forestry mulching services throughout Moore County, Tennessee. Lynchburg and the surrounding communities rely on our veteran-owned team for efficient, dependable land services.",
      "Moore County — home to the famous Jack Daniel's Distillery — features rolling hills, cedar glades, and wooded creek bottoms that benefit from professional forestry mulching. We help property owners manage overgrowth, clear building sites, and restore land to productive use.",
      "Right-of-way clearing is a regular need in Moore County, where agricultural properties near Lynchburg and Mulberry require fence-line reclamation from encroaching cedar and brush and driveway corridors cut through wooded hillsides for rural residential builds. Access roads for hunting and recreational properties in Moore County's wooded terrain are another common job for our forestry mulching equipment. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free on-site estimates throughout Moore County — contact us today to discuss your project.",
    ],
    nearbyAreas: [
      "Lynchburg", "Tullahoma", "Shelbyville", "Fayetteville",
      "Estill Springs", "Mulberry",
    ],
    faqs: [
      {
        question: "Do you serve Lynchburg and Moore County?",
        answer:
          "Yes — Lynchburg and all of Moore County are in our service area. We provide free estimates and work on land management projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "lawrence-county": {
    county: "Lawrence County",
    state: "Tennessee",
    slug: "lawrence-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks serves Lawrence County, Tennessee with professional forestry mulching, land management, and vegetation management services. Lawrenceburg and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Lawrence County's heavily wooded terrain, rolling hills, and agricultural land make it ideal for our forestry mulching services. We work with property owners, farmers, and developers to clear land efficiently while protecting the natural landscape.",
      "Right-of-way clearing is a frequent request in Lawrence County, where heavily wooded hills near Lawrenceburg, Loretto, and Ethridge require remote rural driveway corridors cut through dense hardwood, fence lines reclaimed from multi-year brush encroachment, and utility easements along US-43 maintained. Access roads for hunting properties in Lawrence County's forested terrain are also a common job for our mulching equipment. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Contact us for a free estimate on your Lawrence County property — we serve the entire county and surrounding areas.",
    ],
    nearbyAreas: [
      "Lawrenceburg", "Loretto", "Ethridge", "St. Joseph",
      "Iron City", "Summertown",
    ],
    faqs: [
      {
        question: "Do you serve Lawrenceburg and Lawrence County?",
        answer:
          "Yes — Lawrenceburg and all of Lawrence County are in our service area. We work on residential, agricultural, and commercial land management projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "carroll-county": {
    county: "Carroll County",
    state: "Tennessee",
    slug: "carroll-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks serves Carroll County, Tennessee with professional forestry mulching, land management, and vegetation management services. McKenzie and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Carroll County's rural landscape, mixed hardwood forests, and agricultural land make it ideal for our forestry mulching services. We work with property owners, farmers, and developers to clear land efficiently while protecting the natural environment.",
      "Right-of-way clearing is a common need in Carroll County, where agricultural properties near McKenzie, Huntingdon, and Hollow Rock require fence-line reclamation from encroaching brush, driveway corridors cut through mixed hardwood for rural residential builds, and utility easements along US-70 maintained. Our forestry mulching equipment handles these corridors efficiently in a single pass without disturbing the surrounding farmland. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Contact us for a free estimate on your Carroll County property — we serve the entire county and surrounding areas.",
    ],
    nearbyAreas: [
      "McKenzie", "Huntingdon", "Hollow Rock", "Atwood",
      "Bruceton", "Trezevant",
    ],
    faqs: [
      {
        question: "Do you serve McKenzie and Carroll County?",
        answer:
          "Yes — McKenzie and all of Carroll County are in our service area. We work on residential, agricultural, and commercial land management projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "chester-county": {
    county: "Chester County",
    state: "Tennessee",
    slug: "chester-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout Chester County, Tennessee. Henderson and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Chester County's rolling terrain, wooded hills, and agricultural land create diverse land management needs. Our forestry mulching equipment handles dense brush and hardwood growth common in West Tennessee's transitional landscape.",
      "Right-of-way clearing is a common need in Chester County, where rolling terrain near Henderson, Enville, and Jacks Creek requires fence-line reclamation on agricultural land, driveway corridors cut through wooded hills for rural residential builds, and access roads opened for hunting and recreational properties. Our forestry mulching equipment handles these corridors cleanly without disturbing the surrounding land. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free on-site estimates throughout Chester County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Henderson", "Enville", "Jacks Creek", "Silerton",
      "Pinson",
    ],
    faqs: [
      {
        question: "Do you serve Henderson and Chester County?",
        answer:
          "Yes — Henderson and all of Chester County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "decatur-county": {
    county: "Decatur County",
    state: "Tennessee",
    slug: "decatur-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks serves Decatur County, Tennessee with professional forestry mulching, land management, and vegetation management services. Decaturville and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Decatur County's wooded terrain along the Tennessee River, combined with its agricultural land and rural character, creates strong demand for land management services. Our equipment handles everything from light brush to dense woodland in a single pass.",
      "Right-of-way clearing is a regular need in Decatur County, where the Tennessee River corridor near Decaturville and Bath Springs generates demand for easement maintenance along creek bottoms and wooded hillside driveway clearing. Fence-line reclamation on agricultural land and access roads for hunting properties in Decatur County's forested terrain are also common jobs for our forestry mulching equipment. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Contact us for a free estimate on your Decatur County property — we serve the entire county and surrounding areas.",
    ],
    nearbyAreas: [
      "Decaturville", "Parsons", "Bath Springs", "Scotts Hill",
    ],
    faqs: [
      {
        question: "Do you serve Decaturville and Decatur County?",
        answer:
          "Yes — Decaturville and all of Decatur County are in our service area. We work on residential, agricultural, and commercial land management projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "gibson-county": {
    county: "Gibson County",
    state: "Tennessee",
    slug: "gibson-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides professional land management and forestry mulching services throughout Gibson County, Tennessee. Trenton and the surrounding communities rely on our veteran-owned team for efficient, dependable land services at competitive rates.",
      "Gibson County's flat to gently rolling farmland, wooded fence lines, and rural properties make it a strong fit for our forestry mulching and land management services. We help property owners clear overgrown lots, reclaim pasture, and prepare sites for construction.",
      "Right-of-way clearing is a consistent need across Gibson County's flat West Tennessee farmland, where row-crop and livestock operations near Trenton, Milan, and Humboldt require fence-line reclamation from encroaching brush and utility easements along US-45W maintained. We also cut driveway corridors for rural residential builds near Dyer and Kenton and open access roads on agricultural properties throughout the county. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free on-site estimates throughout Gibson County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Trenton", "Milan", "Humboldt", "Medina",
      "Dyer", "Kenton",
    ],
    faqs: [
      {
        question: "Do you serve Trenton and Gibson County?",
        answer:
          "Yes — Trenton and all of Gibson County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "hardin-county": {
    county: "Hardin County",
    state: "Tennessee",
    slug: "hardin-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks serves Hardin County, Tennessee with professional forestry mulching, land management, and vegetation management services. Savannah and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Hardin County's heavily wooded terrain along the Tennessee River, combined with its agricultural land and rural character, makes it ideal for our forestry mulching services. We work with property owners, farmers, and developers to clear land efficiently.",
      "Right-of-way clearing is a regular need in Hardin County, where the Tennessee River corridor near Savannah and Counce generates demand for easement maintenance along creek bottoms and wooded hillside driveway clearing. Fence-line reclamation on agricultural land near Crump and Adamsville and access roads for hunting properties adjacent to Shiloh National Military Park are also common jobs for our forestry mulching equipment. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Contact us for a free estimate on your Hardin County property — we serve the entire county and surrounding areas.",
    ],
    nearbyAreas: [
      "Savannah", "Counce", "Crump", "Saltillo",
      "Adamsville",
    ],
    faqs: [
      {
        question: "Do you serve Savannah and Hardin County?",
        answer:
          "Yes — Savannah and all of Hardin County are in our service area. We work on residential, agricultural, and commercial land management projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "henderson-county": {
    county: "Henderson County",
    state: "Tennessee",
    slug: "henderson-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout Henderson County, Tennessee. Lexington and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Henderson County's rolling terrain, mixed forests, and agricultural land create diverse land management needs. Our forestry mulching equipment is well-suited to the dense brush and hardwood growth common in the area.",
      "Right-of-way clearing is a regular need in Henderson County, where rolling terrain near Lexington, Sardis, and Natchez requires fence-line reclamation on agricultural land, driveway corridors cut through mixed hardwood for rural residential builds, and utility easements along US-412 maintained. Our forestry mulching equipment handles these jobs efficiently without the soil disturbance of traditional dozer work. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free on-site estimates throughout Henderson County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Lexington", "Sardis", "Natchez", "Reagan",
      "Darden",
    ],
    faqs: [
      {
        question: "Do you serve Lexington and Henderson County?",
        answer:
          "Yes — Lexington and all of Henderson County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "henry-county": {
    county: "Henry County",
    state: "Tennessee",
    slug: "henry-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks serves Henry County, Tennessee with professional forestry mulching, land management, and vegetation management services. Paris and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Henry County's wooded terrain around Kentucky Lake, combined with its agricultural land and rural character, creates strong demand for land management services. Our equipment handles everything from light brush to dense woodland in a single pass.",
      "Right-of-way clearing is a frequent need in Henry County, where Kentucky Lake shoreline easements near Paris, Springville, and Buchanan require access road clearing through wooded terrain and fence-line reclamation on agricultural land. We also maintain utility corridors along US-79 and cut private driveway corridors for rural residential builds near Puryear and Henry. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Contact us for a free estimate on your Henry County property — we serve the entire county and surrounding areas.",
    ],
    nearbyAreas: [
      "Paris", "Puryear", "Springville", "Buchanan",
      "Henry",
    ],
    faqs: [
      {
        question: "Do you serve Paris and Henry County?",
        answer:
          "Yes — Paris and all of Henry County are in our service area. We work on residential, agricultural, and commercial land management projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "madison-county": {
    county: "Madison County",
    state: "Tennessee",
    slug: "madison-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides professional land management and forestry mulching services throughout Madison County, Tennessee. Jackson and the surrounding communities rely on our veteran-owned team for efficient, dependable land services at competitive rates.",
      "Madison County's mix of urban fringe, agricultural land, and wooded rural areas creates diverse land management needs. We work with property owners, developers, and farmers to clear overgrown lots, prepare building sites, and manage vegetation.",
      "Right-of-way clearing is a growing need in Madison County as Jackson's urban fringe expands into rural land. Utility easements along US-45 and I-40 require regular maintenance, fence lines on agricultural properties near Denmark and Three Way need periodic reclamation from encroaching brush, and driveway corridors must be cut through wooded land for new rural residential builds throughout the county. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "We offer free on-site estimates throughout Madison County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Jackson", "Medina", "Humboldt", "Oakfield",
      "Denmark", "Three Way",
    ],
    faqs: [
      {
        question: "Do you serve Jackson and Madison County?",
        answer:
          "Yes — Jackson and all of Madison County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "weakley-county": {
    county: "Weakley County",
    state: "Tennessee",
    slug: "weakley-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks serves Weakley County, Tennessee with professional forestry mulching, land management, and vegetation management services. Dresden and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Weakley County's flat to rolling farmland, wooded areas, and rural properties make it a strong fit for our forestry mulching and land management services. We help property owners clear overgrown lots, reclaim pasture, and prepare sites for construction.",
      "Right-of-way clearing is a steady need across Weakley County's flat West Tennessee farmland, where row-crop farms near Dresden, Martin, and Greenfield require fence-line reclamation from encroaching brush and utility easements along US-45E maintained. We also cut driveway corridors for rural residential builds near Sharon and Gleason and open access roads on agricultural properties throughout the county. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Contact us for a free estimate on your Weakley County property — we serve the entire county and surrounding areas.",
    ],
    nearbyAreas: [
      "Dresden", "Martin", "Greenfield", "Sharon",
      "Gleason", "Palmersville",
    ],
    faqs: [
      {
        question: "Do you serve Dresden and Weakley County?",
        answer:
          "Yes — Dresden and all of Weakley County are in our service area. We work on residential, agricultural, and commercial land management projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "dekalb-county-removed": {
    county: "DeKalb County",
    state: "Tennessee",
    slug: "dekalb-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout DeKalb County, Tennessee. Smithville and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "DeKalb County's scenic landscape along Center Hill Lake, combined with its wooded hills and agricultural land, creates diverse land management needs. Our forestry mulching equipment is well-suited to the dense brush and hardwood growth common in the area.",
      "We offer free on-site estimates throughout DeKalb County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Smithville", "Alexandria", "Liberty", "Dowelltown",
      "Temperance Hall", "Dismal",
    ],
    faqs: [
      {
        question: "Do you serve Smithville and DeKalb County?",
        answer:
          "Yes — Smithville and all of DeKalb County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "smith-county-removed": {
    county: "Smith County",
    state: "Tennessee",
    slug: "smith-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks provides professional land management and forestry mulching services throughout Smith County, Tennessee. Carthage and the surrounding communities rely on our veteran-owned team for efficient, dependable land services at competitive rates.",
      "Smith County's rural character, wooded terrain along the Cumberland River, and agricultural land make it a strong fit for our forestry mulching services. We help property owners clear overgrown lots, reclaim pasture, manage fence lines, and prepare sites for construction.",
      "We offer free on-site estimates throughout Smith County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Carthage", "Gordonsville", "Riddleton", "South Carthage",
      "Elmwood", "Monoville",
    ],
    faqs: [
      {
        question: "Do you serve Carthage and Smith County?",
        answer:
          "Yes — Carthage and all of Smith County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "trousdale-county": {
    county: "Trousdale County",
    state: "Tennessee",
    slug: "trousdale-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks serves Trousdale County, Tennessee with professional forestry mulching, land management, and vegetation management services. Hartsville and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Trousdale County — Tennessee's smallest county by area — features rolling farmland and wooded creek bottoms that benefit from professional land management. Our forestry mulching equipment handles overgrown fields, fence lines, and wooded areas efficiently.",
      "Right-of-way clearing is a steady need in Trousdale County, where rolling farmland near Hartsville and Bethpage requires fence-line reclamation from encroaching brush on agricultural land and utility easements along TN-25 need periodic maintenance. We also cut driveway corridors for rural residential builds near Castalian Springs and Riddleton. Visit our Right-of-Way Clearing service page or call for a free on-site estimate.",
      "Contact us for a free estimate on your Trousdale County property — we serve the entire county.",
    ],
    nearbyAreas: [
      "Hartsville", "Bethpage", "Riddleton", "Castalian Springs",
      "Westmoreland", "Gallatin",
    ],
    faqs: [
      {
        question: "Do you serve Hartsville and Trousdale County?",
        answer:
          "Yes — Hartsville and all of Trousdale County are in our service area. We provide free estimates and work on land management projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "macon-county-removed": {
    county: "Macon County",
    state: "Tennessee",
    slug: "macon-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout Macon County, Tennessee. Lafayette and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Macon County's rolling hills, cedar thickets, and agricultural land make it ideal for our forestry mulching services. We help farmers, developers, and property owners clear land efficiently while preserving topsoil and minimizing disruption to the surrounding environment.",
      "We offer free on-site estimates throughout Macon County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Lafayette", "Red Boiling Springs", "Westmoreland", "Hartsville",
      "Scottsville", "Celina",
    ],
    faqs: [
      {
        question: "Do you serve Lafayette and Macon County?",
        answer:
          "Yes — Lafayette and all of Macon County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "jackson-county-removed": {
    county: "Jackson County",
    state: "Tennessee",
    slug: "jackson-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides professional land management and forestry mulching services throughout Jackson County, Tennessee. Gainesboro and the surrounding communities rely on our veteran-owned team for efficient, dependable land services at competitive rates.",
      "Jackson County's scenic landscape along the Cumberland River and its heavily wooded terrain make forestry mulching the most practical land management solution for most properties. We work with hunters, recreational landowners, farmers, and developers throughout the county.",
      "We offer free on-site estimates throughout Jackson County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Gainesboro", "Granville", "Dodson Branch", "Whitleyville",
      "Cookeville", "Celina",
    ],
    faqs: [
      {
        question: "Do you serve Gainesboro and Jackson County?",
        answer:
          "Yes — Gainesboro and all of Jackson County are in our service area. We provide free estimates and work on land management projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "clay-county-removed": {
    county: "Clay County",
    state: "Tennessee",
    slug: "clay-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks serves Clay County, Tennessee with professional forestry mulching, land management, and vegetation management services. Celina and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Clay County's rugged terrain along Dale Hollow Lake and its heavily forested hills make forestry mulching the most efficient land management method for most properties. We work with recreational landowners, hunters, farmers, and developers throughout the county.",
      "Contact us for a free estimate on your Clay County property — we serve the entire county and surrounding areas.",
    ],
    nearbyAreas: [
      "Celina", "Red Boiling Springs", "Moss", "Hermitage Springs",
      "Gainesboro", "Lafayette",
    ],
    faqs: [
      {
        question: "Do you serve Celina and Clay County?",
        answer:
          "Yes — Celina and all of Clay County are in our service area. We provide free estimates and work on land management projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "putnam-county-removed": {
    county: "Putnam County",
    state: "Tennessee",
    slug: "putnam-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides land management and forestry mulching services throughout Putnam County, Tennessee. Cookeville and the surrounding communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Putnam County's rapid growth and diverse landscape — from the Cookeville urban fringe to rural farmland and wooded hills — creates strong demand for professional land management and site preparation. Our modern equipment handles everything from residential lots to large commercial sites.",
      "We offer free on-site estimates throughout Putnam County — call or submit a quote request online today.",
    ],
    nearbyAreas: [
      "Cookeville", "Algood", "Baxter", "Monterey",
      "Elmwood", "Burgess Falls",
    ],
    faqs: [
      {
        question: "Do you serve Cookeville and Putnam County?",
        answer:
          "Yes — Cookeville and all of Putnam County are in our service area. We provide free estimates and work on projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
};

// Factory function to create county page components
function createCountyPage(slug: string, pageTitle: string, metaDesc?: string) {
  return function CountyPage() {
    usePageTitle(pageTitle, metaDesc, `/service-areas/${slug}`);
    const data = countyData[slug];
    return (
      <>
        <Navbar />
        <CountyPageLayout {...data} />
        <MobileCTABar />
        <Footer />
      </>
    );
  };
}

export const DavidsonCountyPage = createCountyPage(
  "davidson-county",
  "Land Management & Forestry Mulching in Davidson County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Davidson County, TN. Serving Nashville and all surrounding areas. Free estimates. Call 615-406-4819."
);
export const WilliamsonCountyPage = createCountyPage(
  "williamson-county",
  "Land Management & Forestry Mulching in Williamson County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Williamson County, TN. Serving Franklin, Brentwood, Spring Hill, and Nolensville. Free estimates."
);
export const RutherfordCountyPage = createCountyPage(
  "rutherford-county",
  "Reliable Land Management & Vegetation Management in Rutherford County, TN | Noland Earthworks",
  "Top-rated land management and forestry mulching in Rutherford County, TN. Serving Murfreesboro, Smyrna, LaVergne, and surrounding areas. Free estimates."
);
export const WilsonCountyPage = createCountyPage(
  "wilson-county",
  "Expert Land Management & Forestry Mulching in Wilson County, TN | Noland Earthworks",
  "Expert forestry mulching and land management in Wilson County, TN. Serving Lebanon, Mt. Juliet, and surrounding areas. Veteran-owned. Free estimates."
);
export const SumnerCountyPage = createCountyPage(
  "sumner-county",
  "Land Management & Forestry Mulching in Sumner County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Sumner County, TN. Serving Hendersonville, Gallatin, Portland, and surrounding communities. Free estimates."
);
export const RobertsonCountyPage = createCountyPage(
  "robertson-county",
  "Land Management & Forestry Mulching in Robertson County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Robertson County, TN. Serving Springfield, White House, Greenbrier, and surrounding areas. Free estimates."
);
export const CheathamCountyPage = createCountyPage(
  "cheatham-county",
  "Land Management & Forestry Mulching in Cheatham County, TN | Noland Earthworks",
  "Professional forestry mulching and land management in Cheatham County, TN. Serving Ashland City, Kingston Springs, and surrounding areas. Free estimates."
);
export const DicksonCountyPage = createCountyPage(
  "dickson-county",
  "Dickson County's Trusted Forestry Mulching & Land Management Experts | Noland Earthworks",
  "Trusted forestry mulching and land management in Dickson County, TN. Single-pass mulching near Montgomery Bell State Park and surrounding areas. Free estimates."
);
export const MauryCountyPage = createCountyPage(
  "maury-county",
  "Top-Rated Land Management Services in Maury County, TN | Noland Earthworks",
  "Top-rated land management and forestry mulching in Maury County, TN. Serving Columbia, Spring Hill, and surrounding areas. Veteran-owned. Free estimates."
);
export const WayneCountyPage = createCountyPage(
  "wayne-county",
  "Land Management & Forestry Mulching in Wayne County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Wayne County, TN. Serving Waynesboro and surrounding communities. Veteran-owned. Free estimates."
);
export const CannonCountyPage = createCountyPage(
  "cannon-county",
  "Land Management & Forestry Mulching in Cannon County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Cannon County, TN. Serving Woodbury and surrounding areas. Licensed, insured. Free estimates."
);
export const BedfordCountyPage = createCountyPage(
  "bedford-county",
  "Land Management & Forestry Mulching in Bedford County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Bedford County, TN. Serving Shelbyville and surrounding communities. Veteran-owned. Free estimates."
);
export const MontgomeryCountyPage = createCountyPage(
  "montgomery-county",
  "Professional Forestry Mulching & Land Management in Montgomery County, TN | Noland Earthworks",
  "Professional forestry mulching and land management in Montgomery County, TN. Serving Clarksville and surrounding areas. Veteran-owned. Free estimates."
);
export const LewisCountyPage = createCountyPage(
  "lewis-county",
  "Land Management & Forestry Mulching in Lewis County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Lewis County, TN. Serving Hohenwald and surrounding areas. Licensed, insured. Free estimates."
);
export const PerryCountyPage = createCountyPage(
  "perry-county",
  "Land Management & Forestry Mulching in Perry County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Perry County, TN. Serving Linden and surrounding communities. Veteran-owned. Free estimates."
);
export const BentonCountyPage = createCountyPage(
  "benton-county",
  "Land Management & Forestry Mulching in Benton County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Benton County, TN. Serving Camden and surrounding areas. Licensed, insured. Free estimates."
);
export const HickmanCountyPage = createCountyPage(
  "hickman-county",
  "Land Management & Forestry Mulching in Hickman County, TN | Noland Earthworks",
  "Professional forestry mulching and land management in Hickman County, TN. Serving Centerville and surrounding areas. Veteran-owned. Free estimates."
);
export const HoustonCountyPage = createCountyPage(
  "houston-county",
  "Land Management & Forestry Mulching in Houston County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Houston County, TN. Serving Erin and surrounding communities. Licensed, insured. Free estimates."
);
export const HumphreysCountyPage = createCountyPage(
  "humphreys-county",
  "Land Management & Forestry Mulching in Humphreys County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Humphreys County, TN. Serving Waverly and surrounding areas. Veteran-owned. Free estimates."
);
export const StewartCountyPage = createCountyPage(
  "stewart-county",
  "Land Management & Forestry Mulching in Stewart County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Stewart County, TN. Serving Dover and surrounding communities. Licensed, insured. Free estimates."
);
export const MarshallCountyPage = createCountyPage(
  "marshall-county",
  "Land Management & Forestry Mulching in Marshall County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Marshall County, TN. Serving Lewisburg and surrounding areas. Veteran-owned. Free estimates."
);
export const GilesCountyPage = createCountyPage(
  "giles-county",
  "Land Management & Forestry Mulching in Giles County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Giles County, TN. Serving Pulaski and surrounding communities. Licensed, insured. Free estimates."
);
export const LincolnCountyPage = createCountyPage(
  "lincoln-county",
  "Land Management & Forestry Mulching in Lincoln County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Lincoln County, TN. Serving Fayetteville and surrounding areas. Veteran-owned. Free estimates."
);
export const MooreCountyPage = createCountyPage(
  "moore-county",
  "Land Management & Forestry Mulching in Moore County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Moore County, TN. Serving Lynchburg and surrounding communities. Licensed, insured. Free estimates."
);
export const LawrenceCountyPage = createCountyPage(
  "lawrence-county",
  "Land Management & Forestry Mulching in Lawrence County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Lawrence County, TN. Serving Lawrenceburg and surrounding areas. Veteran-owned. Free estimates."
);
export const DeKalbCountyPage = createCountyPage(
  "dekalb-county",
  "Land Management & Forestry Mulching in DeKalb County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in DeKalb County, TN. Serving Smithville and surrounding communities. Licensed, insured. Free estimates."
);
export const SmithCountyPage = createCountyPage(
  "smith-county",
  "Land Management & Forestry Mulching in Smith County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Smith County, TN. Serving Carthage and surrounding areas. Veteran-owned. Free estimates."
);
export const TrousdaleCountyPage = createCountyPage(
  "trousdale-county",
  "Land Management & Forestry Mulching in Trousdale County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Trousdale County, TN. Serving Hartsville and surrounding communities. Licensed, insured. Free estimates."
);
export const CarrollCountyPage = createCountyPage(
  "carroll-county",
  "Land Management & Forestry Mulching in Carroll County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Carroll County, TN. Serving Huntingdon and surrounding areas. Veteran-owned. Free estimates."
);
export const ChesterCountyPage = createCountyPage(
  "chester-county",
  "Land Management & Forestry Mulching in Chester County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Chester County, TN. Serving Henderson and surrounding communities. Licensed, insured. Free estimates."
);
export const DecaturCountyPage = createCountyPage(
  "decatur-county",
  "Land Management & Forestry Mulching in Decatur County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Decatur County, TN. Serving Decaturville and surrounding areas. Veteran-owned. Free estimates."
);
export const GibsonCountyPage = createCountyPage(
  "gibson-county",
  "Land Management & Forestry Mulching in Gibson County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Gibson County, TN. Serving Trenton and surrounding communities. Licensed, insured. Free estimates."
);
export const HardinCountyPage = createCountyPage(
  "hardin-county",
  "Land Management & Forestry Mulching in Hardin County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Hardin County, TN. Serving Savannah and surrounding areas. Veteran-owned. Free estimates."
);
export const HendersonCountyPage = createCountyPage(
  "henderson-county",
  "Land Management & Forestry Mulching in Henderson County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Henderson County, TN. Serving Lexington and surrounding communities. Licensed, insured. Free estimates."
);
export const HenryCountyPage = createCountyPage(
  "henry-county",
  "Land Management & Forestry Mulching in Henry County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Henry County, TN. Serving Paris and surrounding areas. Veteran-owned. Free estimates."
);
export const MadisonCountyPage = createCountyPage(
  "madison-county",
  "Land Management & Forestry Mulching in Madison County, TN | Noland Earthworks",
  "Veteran-owned land management and forestry mulching in Madison County, TN. Serving Jackson and surrounding communities. Licensed, insured. Free estimates."
);
export const WeakleyCountyPage = createCountyPage(
  "weakley-county",
  "Land Management & Forestry Mulching in Weakley County, TN | Noland Earthworks",
  "Professional land management and forestry mulching in Weakley County, TN. Serving Dresden and surrounding areas. Veteran-owned. Free estimates."
);
