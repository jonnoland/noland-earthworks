import { describe, expect, it } from "vitest";
import { buildFieldQuoteOwnerEmail } from "./fieldQuoteRouter";
import { buildPortalEmail } from "./opsRouter";
import { buildConfirmationEmailHtml, buildEmailHtml, quoteSchema } from "./quoteRouter";

const request = quoteSchema.parse({
  name: "Morgan Landowner",
  phone: "615-555-0199",
  email: "morgan@example.com",
  service: "forestry-mulching",
  county: "Dickson",
  acreage: "4.5",
  street: "1200 Example Road",
  city: "Vanleer",
  zip: "37181",
  parcelOwner: "Morgan Landowner",
  parcelId: "123-456.00",
  adjustedAcres: 2.75,
  addOns: ["Trail Cutting"],
  message: "Please preserve the mature hardwoods near the driveway.",
  serviceBreakdown: [
    {
      service: "forestry-mulching",
      label: "Forestry Mulching",
      lowCents: 650000,
      highCents: 900000,
      measurement: "2.75 acres",
      calculation: "Work area selected by the customer",
    },
    {
      service: "trail-cutting",
      label: "Trail Cutting",
      lowCents: 120000,
      highCents: 180000,
      measurement: "1,200 linear feet",
      calculation: "Final route and access confirmed during the site visit",
    },
  ],
});

describe("quote email templates", () => {
  it("gives the owner the complete request, itemized estimate basis, and review action", () => {
    const html = buildEmailHtml(request);

    expect(html).toContain("Morgan Landowner");
    expect(html).toContain("1200 Example Road");
    expect(html).toContain("Dickson County");
    expect(html).toContain("Parcel ID");
    expect(html).toContain("123-456.00");
    expect(html).toContain("Forestry Mulching");
    expect(html).toContain("Trail Cutting");
    expect(html).toContain("1,200 linear feet");
    expect(html).toContain("Requested Services & Estimate Basis");
    expect(html).toContain("View in All Quotes");
  });

  it("sends the customer a professional summary without preliminary pricing", () => {
    const html = buildConfirmationEmailHtml(request);

    expect(html).toContain("Your Request Summary");
    expect(html).toContain("Requested Service Details");
    expect(html).toContain("Final route and access confirmed during the site visit");
    expect(html).toContain("final pricing is confirmed after an on-site review");
    expect(html).not.toContain("$6,500");
    expect(html).not.toContain("$9,000");
  });

  it("renders the field notification with contact, conditions, photos, map, and AI review detail", () => {
    const html = buildFieldQuoteOwnerEmail(
      {
        name: "Jordan <Owner>",
        phone: "615-555-0100",
        email: "jordan@example.com",
        address: "93 Halliburton Road, Vanleer, TN 37181",
        lat: 36.238,
        lng: -87.467,
        serviceType: "Forestry Mulching",
        acreage: 5,
        terrainType: "Rolling",
        vegetationDensity: "Heavy",
        accessCondition: "Moderate",
        obstacles: "Fence near driveway",
        message: "Keep the gate area open.",
        photoUrls: ["https://cdn.example.com/photo-1.jpg"],
        source: "field_app",
      },
      {
        score: "marginal",
        summary: "Review the fence line and access before scheduling.",
        flags: ["Fence line requires confirmation"],
        draftResponse: "",
      },
      "https://maps.example.com/snapshot.jpg",
    );

    expect(html).toContain("Jordan &lt;Owner&gt;");
    expect(html).toContain("Open in Google Maps");
    expect(html).toContain("Satellite map of field quote property");
    expect(html).toContain("Vegetation Density");
    expect(html).toContain("Fence line requires confirmation");
    expect(html).toContain("Open All Quotes");
  });

  it("renders the client quote portal email with safe summary details and a clear action", () => {
    const html = buildPortalEmail(
      "Morgan <Client>",
      "Forestry Mulching",
      "1200 Example Road",
      "$8,500",
      "https://nolandearthworks.com/quote/token",
      "I will confirm the driveway access during the site visit.",
    );

    expect(html).toContain("Morgan &lt;Client&gt;");
    expect(html).toContain("Quote Summary");
    expect(html).toContain("Forestry Mulching");
    expect(html).toContain("$8,500");
    expect(html).toContain("Note from Jon");
    expect(html).toContain("Review Your Quote");
    expect(html).toContain("Before you approve");
  });
});
