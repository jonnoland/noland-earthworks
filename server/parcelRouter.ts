import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { normalizeTennesseeParcelId, validateTennesseeParcelId } from "../shared/tennesseeParcelId";

const TN_PARCEL_QUERY_URL = "https://services1.arcgis.com/YuVBSS7Y1of2Qud1/arcgis/rest/services/Tennessee_Property_Boundaries_Public_Use/FeatureServer/0/query";

type ArcGisParcelFeature = {
  attributes?: Record<string, unknown>;
  centroid?: { x?: number; y?: number };
};

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

export { normalizeTennesseeParcelId } from "../shared/tennesseeParcelId";

export function buildTennesseeParcelWhere(county: string, parcelId: string): string {
  const cleanCounty = county.replace(/\s+county$/i, "").trim().replace(/'/g, "''");
  const normalizedParcelId = normalizeTennesseeParcelId(parcelId);
  const parcelPattern = normalizedParcelId.split("").join("%");
  return `COUNTY_NAME = '${cleanCounty}' AND PARCELID LIKE '%${parcelPattern}%'`;
}

export function buildExactTennesseeParcelWhere(county: string, parcelId: string): string {
  const cleanCounty = county.replace(/\s+county$/i, "").trim().replace(/'/g, "''");
  const exactParcelId = parcelId.trim().replace(/'/g, "''");
  return `COUNTY_NAME = '${cleanCounty}' AND PARCELID = '${exactParcelId}'`;
}

async function queryTennesseeParcels(where: string, resultRecordCount: number, timeoutMs: number) {
  const params = new URLSearchParams({
    where,
    outFields: "PARCELID,COUNTY_NAME,ADDRESS,CITY,ZIP,OWNER,OWNER2,DEEDAC,LINK_TPAD,LINK_TPV",
    returnGeometry: "false",
    returnCentroid: "true",
    outSR: "4326",
    resultRecordCount: String(resultRecordCount),
    f: "json",
  });
  const response = await fetch(`${TN_PARCEL_QUERY_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Tennessee parcel service returned ${response.status}`);
  const payload = await response.json() as { error?: { message?: string }; features?: ArcGisParcelFeature[] };
  if (payload.error) throw new Error(payload.error.message || "Tennessee parcel service could not complete the lookup");
  return payload.features ?? [];
}

function formatPropertyAddress(attributes: Record<string, unknown>): string | null {
  const street = cleanText(attributes.ADDRESS);
  const city = cleanText(attributes.CITY);
  const zip = cleanText(attributes.ZIP);
  const locality = [city, "TN", zip].filter(Boolean).join(" ");
  return [street, locality].filter(Boolean).join(", ") || null;
}

function mapFeature(feature: ArcGisParcelFeature) {
  const attributes = feature.attributes ?? {};
  const deedAcreage = typeof attributes.DEEDAC === "number" && attributes.DEEDAC > 0
    ? attributes.DEEDAC
    : null;

  return {
    parcelId: cleanText(attributes.PARCELID) ?? "",
    county: cleanText(attributes.COUNTY_NAME) ?? "",
    address: formatPropertyAddress(attributes),
    owner: [cleanText(attributes.OWNER), cleanText(attributes.OWNER2)].filter(Boolean).join(" / ") || null,
    deedAcreage,
    centroid: typeof feature.centroid?.x === "number" && typeof feature.centroid?.y === "number"
      ? { lng: feature.centroid.x, lat: feature.centroid.y }
      : null,
    propertyViewerUrl: cleanText(attributes.LINK_TPV),
    assessmentDataUrl: cleanText(attributes.LINK_TPAD),
  };
}

export const parcelRouter = router({
  /**
   * Looks up a Tennessee parcel by county and Parcel ID through the Tennessee
   * Comptroller’s public Property Boundaries service. The returned property
   * fields are reference information only and remain editable in the quote.
   */
  lookup: protectedProcedure
    .input(z.object({
      county: z.string().trim().min(2).max(40).regex(/^[A-Za-z .'-]+$/, "Enter a Tennessee county name."),
      parcelId: z.string().trim().min(3).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Operations access required" });
      }

      const parcelValidation = validateTennesseeParcelId(input.parcelId);
      if (!parcelValidation.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: parcelValidation.error });
      }

      try {
        let features = await queryTennesseeParcels(
          buildExactTennesseeParcelWhere(input.county, input.parcelId),
          1,
          12_000
        );
        if (features.length === 0) {
          features = await queryTennesseeParcels(
            buildTennesseeParcelWhere(input.county, input.parcelId),
            8,
            18_000
          );
        }
        const matches = features.map(mapFeature);
        return {
          matches,
          normalizedParcelId: parcelValidation.normalized,
          source: "Tennessee Comptroller Property Boundaries Public Use",
          sourceUpdated: "monthly",
          referenceNotice: "Parcel boundaries and assessment details are reference information only, not a legal survey. Review the official county record before relying on them.",
        };
      } catch (error) {
        console.error("[parcel.lookup] Tennessee property lookup failed", error);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Tennessee Property Viewer is unavailable right now. Enter the property address manually or try again shortly.",
        });
      }
    }),
});
