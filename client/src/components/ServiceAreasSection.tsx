/*
 * DESIGN: Heavy Equipment Grit — dark section with county grid and interactive map
 * Map shows amber-outlined polygon boundaries for all 35 served counties.
 * Address search bar with Google Places autocomplete and service area check.
 */
import { MapPin, Search, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import { MapView } from "@/components/Map";
import { Link } from "wouter";

const COUNTY_GEOJSON_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/tn-served-counties-35-v2_c7cfca3b.json";

const counties: { name: string; slug?: string }[] = [
  { name: "Bedford County", slug: "bedford-county" },
  { name: "Benton County", slug: "benton-county" },
  { name: "Cannon County", slug: "cannon-county" },
  { name: "Carroll County", slug: "carroll-county" },
  { name: "Cheatham County", slug: "cheatham-county" },
  { name: "Chester County", slug: "chester-county" },
  { name: "Davidson County", slug: "davidson-county" },
  { name: "Decatur County", slug: "decatur-county" },
  { name: "Dickson County", slug: "dickson-county" },
  { name: "Gibson County", slug: "gibson-county" },
  { name: "Giles County", slug: "giles-county" },
  { name: "Hardin County", slug: "hardin-county" },
  { name: "Henderson County", slug: "henderson-county" },
  { name: "Henry County", slug: "henry-county" },
  { name: "Hickman County", slug: "hickman-county" },
  { name: "Houston County", slug: "houston-county" },
  { name: "Humphreys County", slug: "humphreys-county" },
  { name: "Lawrence County", slug: "lawrence-county" },
  { name: "Lewis County", slug: "lewis-county" },
  { name: "Lincoln County", slug: "lincoln-county" },
  { name: "Madison County", slug: "madison-county" },
  { name: "Marshall County", slug: "marshall-county" },
  { name: "Maury County", slug: "maury-county" },
  { name: "Montgomery County", slug: "montgomery-county" },
  { name: "Moore County", slug: "moore-county" },
  { name: "Perry County", slug: "perry-county" },
  { name: "Robertson County", slug: "robertson-county" },
  { name: "Rutherford County", slug: "rutherford-county" },
  { name: "Stewart County", slug: "stewart-county" },
  { name: "Sumner County", slug: "sumner-county" },
  { name: "Trousdale County", slug: "trousdale-county" },
  { name: "Wayne County", slug: "wayne-county" },
  { name: "Weakley County", slug: "weakley-county" },
  { name: "Williamson County", slug: "williamson-county" },
  { name: "Wilson County", slug: "wilson-county" },
];

// Center of the 35-county service area (85-mile radius from Vanleer, TN)
const MAP_CENTER = { lat: 35.85, lng: -87.5 };
const MAP_ZOOM = 7;

// Point-in-polygon ray casting algorithm
function pointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]): boolean {
  let inside = false;
  const x = point.lng;
  const y = point.lat;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

type SearchStatus = "idle" | "searching" | "in-service" | "out-of-service" | "error";

interface AutocompleteSuggestion {
  description: string;
  placeId: string;
}

export default function ServiceAreasSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const geojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const autocompleteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchResult, setSearchResult] = useState<{ county: string; slug?: string } | null>(null);
  const [searchError, setSearchError] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Initialize autocomplete service once map (and Google Maps SDK) is ready
    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();

    // Apply dark map style
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

    // Create a shared InfoWindow for county name tooltips
    infoWindowRef.current = new google.maps.InfoWindow({
      disableAutoPan: true,
    });

    // Fetch and draw county polygons
    fetch(COUNTY_GEOJSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`GeoJSON fetch failed: ${r.status}`);
        return r.json();
      })
      .then((geojson: GeoJSON.FeatureCollection) => {
        geojsonRef.current = geojson;
        polygonsRef.current.forEach((p) => p.setMap(null));
        polygonsRef.current = [];

        const features: GeoJSON.Feature[] = geojson.features ?? [];
        features.forEach((feature: GeoJSON.Feature) => {
          const geom = feature.geometry;
          if (!geom) return;
          const countyName = ((feature.properties as Record<string, string>)?.NAME ?? "") + " County";
          const toLatLng = (coord: number[]) => ({ lat: coord[1], lng: coord[0] });
          const rings: google.maps.LatLngLiteral[][] = [];
          if (geom.type === "Polygon") {
            (geom as GeoJSON.Polygon).coordinates.forEach((ring) => rings.push(ring.map(toLatLng)));
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
          polygon.addListener("mouseover", (e: google.maps.MapMouseEvent) => {
            polygon.setOptions({ fillOpacity: 0.28, strokeWeight: 3 });
            if (infoWindowRef.current && e.latLng) {
              infoWindowRef.current.setContent(
                `<div style="font-family:sans-serif;font-size:13px;font-weight:600;color:#1a1a1a;padding:2px 4px;">${countyName}</div>`
              );
              infoWindowRef.current.setPosition(e.latLng);
              infoWindowRef.current.open(map);
            }
          });
          polygon.addListener("mousemove", (e: google.maps.MapMouseEvent) => {
            if (infoWindowRef.current && e.latLng) {
              infoWindowRef.current.setPosition(e.latLng);
            }
          });
          polygon.addListener("mouseout", () => {
            polygon.setOptions({ fillOpacity: 0.12, strokeWeight: 2 });
            infoWindowRef.current?.close();
          });
          polygonsRef.current.push(polygon);
        });
      })
      .catch((err) => console.error("[ServiceAreas] Failed to load county GeoJSON:", err));
  }, []);

  // Check if a lat/lng point is inside any served county polygon
  const checkPointInServiceArea = useCallback((lat: number, lng: number): { county: string; slug?: string } | null => {
    const geojson = geojsonRef.current;
    if (!geojson) return null;
    for (const feature of geojson.features) {
      const geom = feature.geometry;
      const countyName = (feature.properties as Record<string, string>)?.NAME ?? "";
      const countyEntry = counties.find(c => c.name.replace(" County", "") === countyName);
      const toLatLng = (coord: number[]) => ({ lat: coord[1], lng: coord[0] });
      let rings: { lat: number; lng: number }[][] = [];
      if (geom.type === "Polygon") {
        rings = (geom as GeoJSON.Polygon).coordinates.map(ring => ring.map(toLatLng));
      } else if (geom.type === "MultiPolygon") {
        (geom as GeoJSON.MultiPolygon).coordinates.forEach(poly => {
          poly.forEach(ring => rings.push(ring.map(toLatLng)));
        });
      }
      for (const ring of rings) {
        if (pointInPolygon({ lat, lng }, ring)) {
          return { county: countyName + " County", slug: countyEntry?.slug };
        }
      }
    }
    return null;
  }, []);

  // Geocode and check a given address string
  const geocodeAndCheck = useCallback((address: string) => {
    if (!window.google?.maps) {
      setSearchStatus("error");
      setSearchError("Map not ready yet. Please wait a moment and try again.");
      return;
    }
    setSearchStatus("searching");
    setSearchResult(null);
    setSearchError("");
    setShowSuggestions(false);
    setSuggestions([]);

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(
      { address, componentRestrictions: { country: "US" } },
      (results, status) => {
        if (status !== "OK" || !results || results.length === 0) {
          setSearchStatus("error");
          setSearchError("Address not found. Please try a more specific address.");
          return;
        }
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();

        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(11);
        }

        if (markerRef.current) markerRef.current.setMap(null);

        if (mapRef.current) {
          markerRef.current = new google.maps.Marker({
            map: mapRef.current,
            position: { lat, lng },
            title: results[0].formatted_address,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: "#E07B2A",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2.5,
            },
          });
        }

        const match = checkPointInServiceArea(lat, lng);
        if (match) {
          setSearchStatus("in-service");
          setSearchResult(match);
        } else {
          setSearchStatus("out-of-service");
        }
      }
    );
  }, [checkPointInServiceArea]);

  // Fetch autocomplete suggestions with debounce
  const fetchSuggestions = useCallback((input: string) => {
    if (autocompleteDebounceRef.current) clearTimeout(autocompleteDebounceRef.current);
    if (!input.trim() || input.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    autocompleteDebounceRef.current = setTimeout(() => {
      if (!autocompleteServiceRef.current) return;
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: "us" },
          types: ["address"],
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(
              predictions.slice(0, 5).map((p) => ({
                description: p.description,
                placeId: p.place_id,
              }))
            );
            setShowSuggestions(true);
            setActiveSuggestionIndex(-1);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    }, 250);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchStatus("idle");
    setSearchResult(null);
    fetchSuggestions(val);
  }, [fetchSuggestions]);

  const handleSuggestionClick = useCallback((suggestion: AutocompleteSuggestion) => {
    setSearchQuery(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    geocodeAndCheck(suggestion.description);
  }, [geocodeAndCheck]);

  const handleSearch = useCallback(() => {
    const query = searchQuery.trim();
    if (!query) return;
    geocodeAndCheck(query);
  }, [searchQuery, geocodeAndCheck]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        handleSuggestionClick(suggestions[activeSuggestionIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }, [activeSuggestionIndex, suggestions, handleSuggestionClick, handleSearch]);

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
            Forestry Mulching &amp; Land Management Service Areas in Tennessee
          </h2>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1rem", color: "rgba(240,237,230,0.65)" }}>
            Noland Earthworks proudly serves 35 counties across Middle and West Tennessee.
            Enter your address below to check if we serve your area.
          </p>
        </div>

        {/* Address Search Bar with Autocomplete */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
            marginBottom: "2rem",
          }}
        >
          <div style={{ maxWidth: "600px", position: "relative" }} ref={dropdownRef}>
            {/* Input row */}
            <div
              style={{
                display: "flex",
                border: "1px solid rgba(224,123,42,0.4)",
                overflow: "hidden",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder="Enter your address (e.g. 123 Main St, Franklin, TN)"
                autoComplete="off"
                style={{
                  flex: 1,
                  padding: "0.875rem 1rem",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9375rem",
                  color: "#F0EDE6",
                  minWidth: 0,
                }}
              />
              <button
                onClick={handleSearch}
                disabled={searchStatus === "searching" || !searchQuery.trim()}
                style={{
                  padding: "0.875rem 1.25rem",
                  backgroundColor: "#E07B2A",
                  border: "none",
                  cursor: searchStatus === "searching" || !searchQuery.trim() ? "not-allowed" : "pointer",
                  opacity: !searchQuery.trim() ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  color: "#fff",
                  transition: "background-color 0.2s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (searchQuery.trim()) (e.currentTarget as HTMLElement).style.backgroundColor = "#c96d1f"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#E07B2A"; }}
              >
                {searchStatus === "searching" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                Check Area
              </button>
            </div>

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(224,123,42,0.35)",
                  borderTop: "none",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  overflow: "hidden",
                }}
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.placeId}
                    onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(suggestion); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      width: "100%",
                      padding: "0.75rem 1rem",
                      background: index === activeSuggestionIndex ? "rgba(224,123,42,0.15)" : "transparent",
                      border: "none",
                      borderBottom: index < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      cursor: "pointer",
                      textAlign: "left" as const,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(224,123,42,0.1)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = index === activeSuggestionIndex ? "rgba(224,123,42,0.15)" : "transparent"; }}
                  >
                    <MapPin size={14} style={{ color: "#E07B2A", flexShrink: 0 }} />
                    <span
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.875rem",
                        color: "rgba(240,237,230,0.85)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {suggestion.description}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Search result feedback */}
            {searchStatus === "in-service" && searchResult && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.875rem 1rem",
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <CheckCircle size={20} style={{ color: "#22c55e", flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "#22c55e", margin: 0 }}>
                    Great news — we serve your area!
                  </p>
                  <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.875rem", color: "rgba(240,237,230,0.7)", margin: "0.25rem 0 0" }}>
                    Your address is in{" "}
                    {searchResult.slug ? (
                      <Link href={`/service-areas/${searchResult.slug}`} style={{ color: "#E07B2A", textDecoration: "underline" }}>
                        {searchResult.county}
                      </Link>
                    ) : (
                      <strong style={{ color: "#F0EDE6" }}>{searchResult.county}</strong>
                    )}
                    .{" "}
                    <a href="/quote" style={{ color: "#E07B2A", textDecoration: "underline" }}>
                      Get a free quote →
                    </a>
                  </p>
                </div>
              </div>
            )}

            {searchStatus === "out-of-service" && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.875rem 1rem",
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <XCircle size={20} style={{ color: "#ef4444", flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "#ef4444", margin: 0 }}>
                    Outside our current service area
                  </p>
                  <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.875rem", color: "rgba(240,237,230,0.7)", margin: "0.25rem 0 0" }}>
                    We don't currently serve that location, but{" "}
                    <a href="/quote" style={{ color: "#E07B2A", textDecoration: "underline" }}>contact us</a>{" "}
                    to discuss your project — we may be able to help.
                  </p>
                </div>
              </div>
            )}

            {searchStatus === "error" && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.875rem 1rem",
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <XCircle size={20} style={{ color: "#ef4444", flexShrink: 0 }} />
                <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 400, fontSize: "0.875rem", color: "rgba(240,237,230,0.7)", margin: 0 }}>
                  {searchError}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Interactive map with county outlines — full width */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s",
            border: "1px solid rgba(224,123,42,0.2)",
            overflow: "hidden",
            height: "420px",
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
    </section>
  );
}
