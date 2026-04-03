/*
 * All 12 Middle Tennessee county landing pages — data-driven, single file.
 * Each county gets its own exported component used in App.tsx routing.
 */
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountyPageLayout, { CountyPageProps } from "@/components/CountyPageLayout";
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
    intro: [
      "Noland Earthworks provides professional land clearing and forestry mulching services throughout Davidson County, Tennessee. Whether you own a residential lot in the Nashville suburbs, a rural acreage in the county's outer areas, or a commercial development site, our veteran-owned team delivers efficient, reliable land services at competitive rates.",
      "Davidson County's rapid growth has created strong demand for land clearing and site preparation services. We work with homeowners, developers, farmers, and property managers to clear overgrown lots, prepare building sites, manage vegetation along fence lines and waterways, and restore neglected land to productive use.",
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
    intro: [
      "Noland Earthworks serves Williamson County, Tennessee with professional forestry mulching, land clearing, and vegetation management services. As one of the fastest-growing counties in the nation, Williamson County sees constant demand for land preparation — from new home construction in Franklin and Brentwood to rural acreage clearing in Fairview and College Grove.",
      "Our veteran-owned team understands the unique landscape of Williamson County — rolling hills, cedar glades, and dense hardwood forests that require experienced operators and the right equipment. We use modern forestry mulching machines that clear efficiently while protecting the topsoil and natural contours of your land.",
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
    intro: [
      "Noland Earthworks provides land clearing and forestry mulching services throughout Rutherford County, Tennessee. From Murfreesboro's expanding suburbs to the rural farmland around Smyrna and LaVergne, we help property owners clear, prepare, and manage their land efficiently.",
      "Rutherford County's mix of residential development and agricultural land makes it an ideal fit for our services. We work with homebuilders preparing new lots, farmers reclaiming overgrown pasture, and homeowners clearing wooded acreage for personal use. Our single-pass forestry mulching process is particularly effective on the cedar and hardwood growth common throughout the county.",
      "Call or submit a quote request online for a free estimate on your Rutherford County property.",
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
      ...COMMON_FAQS,
    ],
  },
  "wilson-county": {
    county: "Wilson County",
    state: "Tennessee",
    slug: "wilson-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks serves Wilson County, Tennessee with professional land clearing, forestry mulching, and vegetation management. Lebanon, Mount Juliet, and the surrounding communities have seen significant growth, and our team is equipped to handle the full range of land preparation needs that come with it.",
      "Wilson County's landscape includes a mix of cedar glades, hardwood forests, and open farmland. Our forestry mulching equipment is well-suited to the dense cedar growth common in the area, clearing it efficiently without the need for separate hauling or burning operations.",
      "We offer free on-site estimates for all Wilson County projects — contact us today to schedule yours.",
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
      ...COMMON_FAQS,
    ],
  },
  "sumner-county": {
    county: "Sumner County",
    state: "Tennessee",
    slug: "sumner-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks provides land clearing and forestry mulching services throughout Sumner County, Tennessee. From Hendersonville's lakeside properties to the rural farmland around Gallatin and Portland, we help property owners clear and manage their land with professional-grade equipment and veteran work ethic.",
      "Sumner County's proximity to Nashville has driven strong residential growth, creating demand for lot clearing, site preparation, and vegetation management. Our team handles everything from small residential lots to large rural acreage, using forestry mulching to clear efficiently with minimal environmental impact.",
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
    intro: [
      "Noland Earthworks serves Robertson County, Tennessee with professional land clearing, forestry mulching, and vegetation management services. Springfield, White House, and the surrounding rural communities rely on our veteran-owned team for efficient, reliable land services.",
      "Robertson County's agricultural heritage means many of our clients are farmers reclaiming overgrown pasture, clearing fence lines, or managing invasive species on their property. Our forestry mulching equipment handles dense brush and small trees in a single pass, returning land to productive use quickly and cost-effectively.",
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
    intro: [
      "Noland Earthworks provides land clearing and forestry mulching services throughout Cheatham County, Tennessee. Ashland City and the surrounding communities along the Cumberland River corridor benefit from our professional land services, delivered by a veteran-owned team with the work ethic and integrity you deserve.",
      "Cheatham County's wooded terrain and river bottomland make forestry mulching an ideal solution for many land clearing projects. Our equipment handles the dense hardwood and cedar growth common in the area, clearing efficiently while preserving the natural contours of the land.",
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
    intro: [
      "Noland Earthworks serves Dickson County, Tennessee with professional forestry mulching, land clearing, and vegetation management. Dickson, Charlotte, and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services.",
      "Dickson County's mix of residential properties and agricultural land creates diverse land clearing needs. Whether you're preparing a building site, reclaiming overgrown pasture, or managing invasive vegetation along fence lines and waterways, our team has the equipment and experience to get the job done right.",
      "We offer free estimates throughout Dickson County — contact us today to schedule your site visit.",
    ],
    nearbyAreas: [
      "Dickson", "Charlotte", "White Bluff", "Burns", "Slayden",
      "Vanleer", "Bon Aqua", "Nunnelly", "Pinewood",
    ],
    faqs: [
      {
        question: "Do you serve Dickson and White Bluff?",
        answer:
          "Yes — Dickson and White Bluff are both active service areas in Dickson County. We work throughout the county on all types of land clearing projects.",
      },
      ...COMMON_FAQS,
    ],
  },
  "maury-county": {
    county: "Maury County",
    state: "Tennessee",
    slug: "maury-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks provides land clearing and forestry mulching services throughout Maury County, Tennessee. Columbia and the surrounding communities benefit from our professional land services, delivered with the precision and reliability of a veteran-owned operation.",
      "Maury County's rich agricultural landscape and growing residential development create strong demand for land clearing and site preparation. Our forestry mulching equipment handles everything from overgrown fence lines to dense woodland, returning land to productive use efficiently and cost-effectively.",
      "Contact us for a free estimate on your Maury County property — we serve the entire county.",
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
      ...COMMON_FAQS,
    ],
  },
  "wayne-county": {
    county: "Wayne County",
    state: "Tennessee",
    slug: "wayne-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides land clearing and forestry mulching services throughout Wayne County, Tennessee. Waynesboro and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Wayne County's heavily wooded terrain and agricultural land make forestry mulching an ideal solution for property owners looking to clear land without the cost and disruption of traditional clearing methods. Our single-pass mulching process handles dense hardwood and brush growth efficiently, leaving a clean mulch layer that protects the soil.",
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
          "Yes — Waynesboro and all of Wayne County are in our service area. We work on residential, agricultural, and commercial land clearing projects throughout the county.",
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
      "Noland Earthworks serves Cannon County, Tennessee with professional forestry mulching, land clearing, and vegetation management services. Woodbury and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Cannon County's rural character and mix of hardwood forest and agricultural land make it a strong fit for our forestry mulching services. We help property owners clear overgrown land, reclaim pasture, manage invasive species, and prepare sites for construction or recreational use.",
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
      "Noland Earthworks provides land clearing and forestry mulching services throughout Bedford County, Tennessee. Shelbyville and the surrounding communities trust our veteran-owned team for efficient, professional land services at competitive rates.",
      "Bedford County's mix of horse farms, agricultural land, and growing residential development creates strong demand for land clearing and site preparation. Our forestry mulching equipment handles the dense cedar and hardwood growth common in the area, clearing efficiently while preserving the natural landscape.",
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
    intro: [
      "Noland Earthworks serves Montgomery County, Tennessee with professional land clearing, forestry mulching, and vegetation management services. Clarksville and the surrounding communities benefit from our veteran-owned land services — delivered with the work ethic and integrity you deserve.",
      "Montgomery County's rapid growth, driven by Fort Campbell and Clarksville's expanding suburbs, has created strong demand for land clearing and site preparation. We work with homeowners, developers, and farmers throughout the county to clear lots, prepare building sites, and manage overgrown vegetation.",
      "Contact us for a free estimate on your Montgomery County property — we're proud to serve the military community and all residents of the Clarksville area.",
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
      ...COMMON_FAQS,
    ],
  },
  "lewis-county": {
    county: "Lewis County",
    state: "Tennessee",
    slug: "lewis-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides professional land clearing and forestry mulching services throughout Lewis County, Tennessee. Hohenwald and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Lewis County's forested hills and agricultural land make it an ideal fit for our forestry mulching services. Whether you need to clear overgrown pasture, manage invasive species, or prepare a site for construction, our equipment handles the job in a single pass with minimal soil disturbance.",
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
          "Yes — Hohenwald and all of Lewis County are in our service area. We work on residential, agricultural, and commercial land clearing projects throughout the county.",
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
      "Noland Earthworks serves Perry County, Tennessee with professional forestry mulching, land clearing, and vegetation management services. Linden and the surrounding rural communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Perry County's rugged terrain along the Buffalo River corridor and its heavily wooded hillsides make forestry mulching the most practical and cost-effective land clearing solution for most properties. Our equipment handles steep slopes and dense hardwood growth that traditional clearing methods struggle with.",
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
      "Noland Earthworks provides land clearing and forestry mulching services throughout Benton County, Tennessee. Camden and the surrounding communities trust our veteran-owned team for efficient, professional land services at competitive rates.",
      "Benton County's lakefront properties along Kentucky Lake and Barkley Lake, combined with its agricultural and rural land, create diverse land clearing needs. We work with lakefront property owners, farmers, and developers to clear land, manage vegetation, and prepare sites for a wide range of uses.",
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
      "Noland Earthworks serves Hickman County, Tennessee with professional land clearing, forestry mulching, and vegetation management services. Centerville and the surrounding communities benefit from our veteran-owned land services — delivered with the work ethic and integrity you deserve.",
      "Hickman County's rolling hills, cedar glades, and mixed hardwood forests are well-suited to our forestry mulching equipment. We help property owners clear overgrown land, reclaim pasture, manage invasive cedar, and prepare sites for residential or agricultural use.",
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
      "Noland Earthworks provides land clearing and forestry mulching services throughout Houston County, Tennessee. Erin and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Houston County's rural character, wooded terrain, and agricultural land make it a strong fit for our forestry mulching services. We help property owners clear overgrown lots, reclaim pasture, manage fence lines, and prepare sites for construction or recreational use.",
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
      "Noland Earthworks serves Humphreys County, Tennessee with professional forestry mulching, land clearing, and vegetation management services. Waverly and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Humphreys County's mix of river bottomland along the Tennessee River, rolling hills, and agricultural land creates diverse land clearing needs. Our forestry mulching equipment is well-suited to the dense brush, willow, and hardwood growth common in the area.",
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
          "Yes — Waverly and all of Humphreys County are in our service area. We work on residential, agricultural, and commercial land clearing projects throughout the county.",
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
      "Noland Earthworks provides land clearing and forestry mulching services throughout Stewart County, Tennessee. Dover and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Stewart County's proximity to Land Between the Lakes and its heavily forested terrain make forestry mulching the most practical land clearing solution for most properties. We work with hunters, recreational landowners, farmers, and developers throughout the county.",
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
          "Yes — Dover and all of Stewart County are in our service area. We work on residential, recreational, agricultural, and commercial land clearing projects throughout the county.",
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
      "Noland Earthworks provides professional land clearing and forestry mulching services throughout Marshall County, Tennessee. Lewisburg and the surrounding communities rely on our veteran-owned team for efficient, dependable land services at competitive rates.",
      "Marshall County's rolling farmland, cedar thickets, and wooded creek bottoms are ideal terrain for our forestry mulching equipment. We help property owners clear overgrown fields, reclaim pasture, manage fence lines, and prepare sites for construction or agricultural use.",
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
      "Noland Earthworks serves Giles County, Tennessee with professional forestry mulching, land clearing, and vegetation management services. Pulaski and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Giles County's diverse landscape — from open farmland to dense hardwood forests — creates a wide range of land clearing needs. Our modern forestry mulching equipment handles everything from light brush to mature timber in a single efficient pass.",
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
          "Yes — Pulaski and all of Giles County are in our service area. We work on residential, agricultural, and commercial land clearing projects throughout the county.",
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
      "Noland Earthworks provides land clearing and forestry mulching services throughout Lincoln County, Tennessee. Fayetteville and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Lincoln County's agricultural heritage and wooded terrain make it a natural fit for our forestry mulching services. We help farmers, developers, and property owners clear land efficiently while preserving topsoil and minimizing environmental impact.",
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
      "Noland Earthworks provides professional land clearing and forestry mulching services throughout Moore County, Tennessee. Lynchburg and the surrounding communities rely on our veteran-owned team for efficient, dependable land services.",
      "Moore County — home to the famous Jack Daniel's Distillery — features rolling hills, cedar glades, and wooded creek bottoms that benefit from professional forestry mulching. We help property owners manage overgrowth, clear building sites, and restore land to productive use.",
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
          "Yes — Lynchburg and all of Moore County are in our service area. We provide free estimates and work on land clearing projects of all sizes throughout the county.",
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
      "Noland Earthworks serves Lawrence County, Tennessee with professional forestry mulching, land clearing, and vegetation management services. Lawrenceburg and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Lawrence County's heavily wooded terrain, rolling hills, and agricultural land make it ideal for our forestry mulching services. We work with property owners, farmers, and developers to clear land efficiently while protecting the natural landscape.",
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
          "Yes — Lawrenceburg and all of Lawrence County are in our service area. We work on residential, agricultural, and commercial land clearing projects throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "dekalb-county": {
    county: "DeKalb County",
    state: "Tennessee",
    slug: "dekalb-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides land clearing and forestry mulching services throughout DeKalb County, Tennessee. Smithville and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "DeKalb County's scenic landscape along Center Hill Lake, combined with its wooded hills and agricultural land, creates diverse land clearing needs. Our forestry mulching equipment is well-suited to the dense brush and hardwood growth common in the area.",
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
  "smith-county": {
    county: "Smith County",
    state: "Tennessee",
    slug: "smith-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks provides professional land clearing and forestry mulching services throughout Smith County, Tennessee. Carthage and the surrounding communities rely on our veteran-owned team for efficient, dependable land services at competitive rates.",
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
      "Noland Earthworks serves Trousdale County, Tennessee with professional forestry mulching, land clearing, and vegetation management services. Hartsville and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Trousdale County — Tennessee's smallest county by area — features rolling farmland and wooded creek bottoms that benefit from professional land clearing. Our forestry mulching equipment handles overgrown fields, fence lines, and wooded areas efficiently.",
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
          "Yes — Hartsville and all of Trousdale County are in our service area. We provide free estimates and work on land clearing projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "macon-county": {
    county: "Macon County",
    state: "Tennessee",
    slug: "macon-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks provides land clearing and forestry mulching services throughout Macon County, Tennessee. Lafayette and the surrounding rural communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
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
  "jackson-county": {
    county: "Jackson County",
    state: "Tennessee",
    slug: "jackson-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides professional land clearing and forestry mulching services throughout Jackson County, Tennessee. Gainesboro and the surrounding communities rely on our veteran-owned team for efficient, dependable land services at competitive rates.",
      "Jackson County's scenic landscape along the Cumberland River and its heavily wooded terrain make forestry mulching the most practical land clearing solution for most properties. We work with hunters, recreational landowners, farmers, and developers throughout the county.",
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
          "Yes — Gainesboro and all of Jackson County are in our service area. We provide free estimates and work on land clearing projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "clay-county": {
    county: "Clay County",
    state: "Tennessee",
    slug: "clay-county",
    heroImage: HERO,
    intro: [
      "Noland Earthworks serves Clay County, Tennessee with professional forestry mulching, land clearing, and vegetation management services. Celina and the surrounding communities benefit from our veteran-owned land services, delivered with precision and reliability.",
      "Clay County's rugged terrain along Dale Hollow Lake and its heavily forested hills make forestry mulching the most efficient land clearing method for most properties. We work with recreational landowners, hunters, farmers, and developers throughout the county.",
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
          "Yes — Celina and all of Clay County are in our service area. We provide free estimates and work on land clearing projects of all sizes throughout the county.",
      },
      ...COMMON_FAQS,
    ],
  },
  "putnam-county": {
    county: "Putnam County",
    state: "Tennessee",
    slug: "putnam-county",
    heroImage: LAND_HERO,
    intro: [
      "Noland Earthworks provides land clearing and forestry mulching services throughout Putnam County, Tennessee. Cookeville and the surrounding communities trust our veteran-owned team for efficient, reliable land services at competitive rates.",
      "Putnam County's rapid growth and diverse landscape — from the Cookeville urban fringe to rural farmland and wooded hills — creates strong demand for professional land clearing and site preparation. Our modern equipment handles everything from residential lots to large commercial sites.",
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
function createCountyPage(slug: string, pageTitle: string) {
  return function CountyPage() {
    usePageTitle(pageTitle);
    const data = countyData[slug];
    return (
      <>
        <Navbar />
        <CountyPageLayout {...data} />
        <Footer />
      </>
    );
  };
}

export const DavidsonCountyPage = createCountyPage(
  "davidson-county",
  "Land Clearing & Forestry Mulching in Davidson County, TN | Noland Earthworks"
);
export const WilliamsonCountyPage = createCountyPage(
  "williamson-county",
  "Land Clearing & Forestry Mulching in Williamson County, TN | Noland Earthworks"
);
export const RutherfordCountyPage = createCountyPage(
  "rutherford-county",
  "Land Clearing & Forestry Mulching in Rutherford County, TN | Noland Earthworks"
);
export const WilsonCountyPage = createCountyPage(
  "wilson-county",
  "Land Clearing & Forestry Mulching in Wilson County, TN | Noland Earthworks"
);
export const SumnerCountyPage = createCountyPage(
  "sumner-county",
  "Land Clearing & Forestry Mulching in Sumner County, TN | Noland Earthworks"
);
export const RobertsonCountyPage = createCountyPage(
  "robertson-county",
  "Land Clearing & Forestry Mulching in Robertson County, TN | Noland Earthworks"
);
export const CheathamCountyPage = createCountyPage(
  "cheatham-county",
  "Land Clearing & Forestry Mulching in Cheatham County, TN | Noland Earthworks"
);
export const DicksonCountyPage = createCountyPage(
  "dickson-county",
  "Land Clearing & Forestry Mulching in Dickson County, TN | Noland Earthworks"
);
export const MauryCountyPage = createCountyPage(
  "maury-county",
  "Land Clearing & Forestry Mulching in Maury County, TN | Noland Earthworks"
);
export const WayneCountyPage = createCountyPage(
  "wayne-county",
  "Land Clearing & Forestry Mulching in Wayne County, TN | Noland Earthworks"
);
export const CannonCountyPage = createCountyPage(
  "cannon-county",
  "Land Clearing & Forestry Mulching in Cannon County, TN | Noland Earthworks"
);
export const BedfordCountyPage = createCountyPage(
  "bedford-county",
  "Land Clearing & Forestry Mulching in Bedford County, TN | Noland Earthworks"
);
export const MontgomeryCountyPage = createCountyPage(
  "montgomery-county",
  "Land Clearing & Forestry Mulching in Montgomery County, TN | Noland Earthworks"
);
export const LewisCountyPage = createCountyPage(
  "lewis-county",
  "Land Clearing & Forestry Mulching in Lewis County, TN | Noland Earthworks"
);
export const PerryCountyPage = createCountyPage(
  "perry-county",
  "Land Clearing & Forestry Mulching in Perry County, TN | Noland Earthworks"
);
export const BentonCountyPage = createCountyPage(
  "benton-county",
  "Land Clearing & Forestry Mulching in Benton County, TN | Noland Earthworks"
);
export const HickmanCountyPage = createCountyPage(
  "hickman-county",
  "Land Clearing & Forestry Mulching in Hickman County, TN | Noland Earthworks"
);
export const HoustonCountyPage = createCountyPage(
  "houston-county",
  "Land Clearing & Forestry Mulching in Houston County, TN | Noland Earthworks"
);
export const HumphreysCountyPage = createCountyPage(
  "humphreys-county",
  "Land Clearing & Forestry Mulching in Humphreys County, TN | Noland Earthworks"
);
export const StewartCountyPage = createCountyPage(
  "stewart-county",
  "Land Clearing & Forestry Mulching in Stewart County, TN | Noland Earthworks"
);
export const MarshallCountyPage = createCountyPage(
  "marshall-county",
  "Land Clearing & Forestry Mulching in Marshall County, TN | Noland Earthworks"
);
export const GilesCountyPage = createCountyPage(
  "giles-county",
  "Land Clearing & Forestry Mulching in Giles County, TN | Noland Earthworks"
);
export const LincolnCountyPage = createCountyPage(
  "lincoln-county",
  "Land Clearing & Forestry Mulching in Lincoln County, TN | Noland Earthworks"
);
export const MooreCountyPage = createCountyPage(
  "moore-county",
  "Land Clearing & Forestry Mulching in Moore County, TN | Noland Earthworks"
);
export const LawrenceCountyPage = createCountyPage(
  "lawrence-county",
  "Land Clearing & Forestry Mulching in Lawrence County, TN | Noland Earthworks"
);
export const DeKalbCountyPage = createCountyPage(
  "dekalb-county",
  "Land Clearing & Forestry Mulching in DeKalb County, TN | Noland Earthworks"
);
export const SmithCountyPage = createCountyPage(
  "smith-county",
  "Land Clearing & Forestry Mulching in Smith County, TN | Noland Earthworks"
);
export const TrousdaleCountyPage = createCountyPage(
  "trousdale-county",
  "Land Clearing & Forestry Mulching in Trousdale County, TN | Noland Earthworks"
);
export const MaconCountyPage = createCountyPage(
  "macon-county",
  "Land Clearing & Forestry Mulching in Macon County, TN | Noland Earthworks"
);
export const JacksonCountyPage = createCountyPage(
  "jackson-county",
  "Land Clearing & Forestry Mulching in Jackson County, TN | Noland Earthworks"
);
export const ClayCountyPage = createCountyPage(
  "clay-county",
  "Land Clearing & Forestry Mulching in Clay County, TN | Noland Earthworks"
);
export const PutnamCountyPage = createCountyPage(
  "putnam-county",
  "Land Clearing & Forestry Mulching in Putnam County, TN | Noland Earthworks"
);
