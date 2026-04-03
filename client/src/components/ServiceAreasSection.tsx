/*
 * DESIGN: Heavy Equipment Grit — dark section with county grid and interactive map
 * Map shows amber-outlined polygon boundaries for all 17 served counties.
 */
import { MapPin } from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import { MapView } from "@/components/Map";

const COUNTY_GEOJSON_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/tn-served-counties_0839aca6.json";

const counties: { name: string; slug?: string }[] = [
  { name: "Davidson County", slug: "davidson-county" },
  { name: "Williamson County", slug: "williamson-county" },
  { name: "Rutherford County", slug: "rutherford-county" },
  { name: "Wilson County", slug: "wilson-county" },
  { name: "Sumner County", slug: "sumner-county" },
  { name: "Robertson County", slug: "robertson-county" },
  { name: "Cheatham County", slug: "cheatham-county" },
  { name: "Dickson County", slug: "dickson-county" },
  { name: "Maury County", slug: "maury-county" },
  { name: "Montgomery County", slug: "montgomery-county" },
  { name: "Bedford County", slug: "bedford-county" },
  { name: "Wayne County", slug: "wayne-county" },
  { name: "Cannon County", slug: "cannon-county" },
  { name: "Lewis County", slug: "lewis-county" },
  { name: "Perry County", slug: "perry-county" },
  { name: "Benton County", slug: "benton-county" },
  { name: "Hickman County", slug: "hickman-county" },
  { name: "Houston County", slug: "houston-county" },
  { name: "Humphreys County", slug: "humphreys-county" },
  { name: "Stewart County", slug: "stewart-county" },
];

// Center of the 17-county service area (roughly middle of the cluster)
const MAP_CENTER = { lat: 36.18, lng: -87.35 };
const MAP_ZOOM = 8;

export default function ServiceAreasSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    // Apply dark map style to match site theme
    map.setOptions({
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1a" }] },
        { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4b6043" }] },
        { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
        { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#4b6043" }] },
        { featureType: "landscape.man_made", elementType: "geometry.stroke", stylers: [{ color: "#3f4f3f" }] },
        { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#1e2b1e" }] },
        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283528" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
        { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
        { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
        { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
        { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
        { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
        { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
      ],
    });

    // Fetch and draw county polygons
    fetch(COUNTY_GEOJSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`GeoJSON fetch failed: ${r.status}`);
        return r.json();
      })
      .then((geojson) => {
        // Clear any existing polygons
        polygonsRef.current.forEach((p) => p.setMap(null));
        polygonsRef.current = [];

        const features: GeoJSON.Feature[] = geojson.features ?? [];
        console.log(`[ServiceAreas] Loaded ${features.length} county features`);

        features.forEach((feature: GeoJSON.Feature) => {
          const geom = feature.geometry;
          if (!geom) return;

          const toLatLng = (coord: number[]) => ({
            lat: coord[1],
            lng: coord[0],
          });

          const rings: google.maps.LatLngLiteral[][] = [];

          if (geom.type === "Polygon") {
            (geom as GeoJSON.Polygon).coordinates.forEach((ring) => {
              rings.push(ring.map(toLatLng));
            });
          } else if (geom.type === "MultiPolygon") {
            (geom as GeoJSON.MultiPolygon).coordinates.forEach((poly) => {
              poly.forEach((ring) => rings.push(ring.map(toLatLng)));
            });
          }

          if (rings.length === 0) return;

          const polygon = new google.maps.Polygon({
            paths: rings,
            strokeColor: "#E07B2A",
            strokeOpacity: 0.9,
            strokeWeight: 2,
            fillColor: "#E07B2A",
            fillOpacity: 0.12,
            map,
          });

          // Hover effect
          polygon.addListener("mouseover", () => {
            polygon.setOptions({ fillOpacity: 0.28, strokeWeight: 3 });
          });
          polygon.addListener("mouseout", () => {
            polygon.setOptions({ fillOpacity: 0.12, strokeWeight: 2 });
          });

          polygonsRef.current.push(polygon);
        });
        console.log(`[ServiceAreas] Drew ${polygonsRef.current.length} county polygons`);
      })
      .catch((err) => {
        console.error("[ServiceAreas] Failed to load county GeoJSON:", err);
      });
  }, []);

  return (
    <section
      id="service-areas"
      style={{
        backgroundColor: "#0F1A0F",
        paddingTop: "6rem",
        paddingBottom: "6rem",
        borderTop: "1px solid rgba(224,123,42,0.15)",
      }}
    >
      <div className="container">
        {/* Header */}
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
            marginBottom: "3rem",
          }}
        >
          <div className="section-label mb-4">Coverage</div>
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "0.75rem",
            }}
          >
            Our Service Areas
          </h2>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1rem",
              color: "rgba(240,237,230,0.65)",
            }}
          >
            Noland Earthworks proudly serves 20 counties across Middle Tennessee.
            Check if we're available in your area.
          </p>
        </div>

        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s",
          }}
        >
          {/* County list */}
          <div>
            <div
              className="flex items-center gap-2 mb-4"
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.875rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#E07B2A",
              }}
            >
              <MapPin size={16} />
              Counties Served
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {counties.map((county) => {
                const inner = (
                  <>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "#E07B2A",
                        flexShrink: 0,
                        display: "block",
                      }}
                    />
                    {county.name}
                  </>
                );
                const sharedStyle = {
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 400,
                  fontSize: "0.8125rem" as const,
                  color: "rgba(240,237,230,0.75)",
                  letterSpacing: "0.02em",
                };
                return county.slug ? (
                  <a
                    key={county.name}
                    href={`/service-areas/${county.slug}`}
                    className="flex items-center gap-2 py-2 px-3"
                    style={{ ...sharedStyle, textDecoration: "none", transition: "border-color 0.2s" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(224,123,42,0.4)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)")}
                  >
                    {inner}
                  </a>
                ) : (
                  <div
                    key={county.name}
                    className="flex items-center gap-2 py-2 px-3"
                    style={sharedStyle}
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
            <p
              className="mt-4"
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.875rem",
                color: "rgba(240,237,230,0.5)",
                fontStyle: "italic",
              }}
            >
              Don't see your area? Contact us to discuss service availability.
            </p>
          </div>

          {/* Interactive map with county outlines */}
          <div
            style={{
              border: "1px solid rgba(224,123,42,0.2)",
              overflow: "hidden",
              height: "400px",
            }}
          >
            <MapView
              className="w-full h-full"
              initialCenter={MAP_CENTER}
              initialZoom={MAP_ZOOM}
              onMapReady={handleMapReady}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
