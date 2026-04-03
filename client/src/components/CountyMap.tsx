/**
 * CountyMap — dark-themed Google Map for county landing pages.
 * Uses the Geocoder API to find the county boundary, then draws
 * an amber polygon overlay and drops a branded marker at the center.
 */

/// <reference types="@types/google.maps" />

import { useRef, useCallback } from "react";
import { MapView } from "@/components/Map";

// Approximate center coordinates for each TN county we serve
const COUNTY_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  "davidson-county":    { lat: 36.1627, lng: -86.7816, zoom: 10 },
  "williamson-county":  { lat: 35.8940, lng: -86.8950, zoom: 10 },
  "rutherford-county":  { lat: 35.8440, lng: -86.4160, zoom: 10 },
  "wilson-county":      { lat: 36.1560, lng: -86.2980, zoom: 10 },
  "sumner-county":      { lat: 36.4660, lng: -86.4610, zoom: 10 },
  "robertson-county":   { lat: 36.5240, lng: -86.8690, zoom: 10 },
  "cheatham-county":    { lat: 36.2690, lng: -87.0840, zoom: 10 },
  "dickson-county":     { lat: 36.0770, lng: -87.3690, zoom: 10 },
  "maury-county":       { lat: 35.6140, lng: -87.0590, zoom: 10 },
  "wayne-county":       { lat: 35.2200, lng: -87.8440, zoom: 10 },
  "cannon-county":      { lat: 35.7960, lng: -86.0580, zoom: 10 },
  "bedford-county":     { lat: 35.5140, lng: -86.4580, zoom: 10 },
  "montgomery-county":  { lat: 36.4970, lng: -87.3590, zoom: 10 },
  "lewis-county":       { lat: 35.5290, lng: -87.4970, zoom: 10 },
  "perry-county":       { lat: 35.6070, lng: -87.8640, zoom: 10 },
  "benton-county":      { lat: 36.0580, lng: -88.0490, zoom: 10 },
  "hickman-county":     { lat: 35.7350, lng: -87.4560, zoom: 10 },
  "houston-county":     { lat: 36.2870, lng: -87.6990, zoom: 10 },
  "humphreys-county":   { lat: 36.0780, lng: -87.7640, zoom: 10 },
  "stewart-county":     { lat: 36.5100, lng: -87.8380, zoom: 10 },
};

// Dark map style matching the site's #121212 theme with amber accents
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#121212" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a0a0a0" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#E07B2A" }, { weight: 1.5 }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b6b6b" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#1e1e1e" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#242424" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1e2a1e" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a6741" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8a8a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a3a3a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b0b0b0" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0d1a26" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3d6b8a" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0d1a26" }],
  },
];

interface CountyMapProps {
  slug: string;   // e.g. "davidson-county"
  county: string; // e.g. "Davidson County"
  state: string;  // e.g. "Tennessee"
}

export default function CountyMap({ slug, county, state }: CountyMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;

      // Apply dark styles
      map.setOptions({
        styles: DARK_MAP_STYLES,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        scrollwheel: false,
        gestureHandling: "cooperative",
      });

      // Use the Data layer to load county boundary via geocoding
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { address: `${county}, ${state}, USA`, region: "US" },
        (results, status) => {
          if (status !== "OK" || !results || results.length === 0) return;

          const result = results[0];

          // Drop a branded marker at the county center
          const markerEl = document.createElement("div");
          markerEl.style.cssText = `
            width: 36px;
            height: 36px;
            background: #E07B2A;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          `;
          new window.google.maps.marker.AdvancedMarkerElement({
            map,
            position: result.geometry.location,
            title: `Noland Earthworks serves ${county}`,
            content: markerEl,
          });

          // Draw county boundary polygon using viewport bounds as a rectangle overlay
          // (Google Geocoder returns bounds, not polygon — we use a shaded rectangle)
          const bounds = result.geometry.viewport;
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();

          const countyRect = new window.google.maps.Rectangle({
            bounds: {
              north: ne.lat(),
              south: sw.lat(),
              east: ne.lng(),
              west: sw.lng(),
            },
            strokeColor: "#E07B2A",
            strokeOpacity: 0.9,
            strokeWeight: 2.5,
            fillColor: "#E07B2A",
            fillOpacity: 0.12,
            map,
          });

          // Fit map to county bounds with padding
          map.fitBounds(bounds, 40);

          // Info window on click
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="background:#1a1a1a;color:#F0EDE6;padding:12px 16px;font-family:'Lato',sans-serif;border-left:3px solid #E07B2A;min-width:200px;">
                <div style="font-family:'Oswald',sans-serif;font-size:1rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#E07B2A;margin-bottom:4px;">
                  Noland Earthworks
                </div>
                <div style="font-size:0.85rem;color:rgba(240,237,230,0.8);margin-bottom:8px;">
                  Serving all of ${county}
                </div>
                <a href="/quote" style="display:inline-block;background:#E07B2A;color:#fff;font-family:'Oswald',sans-serif;font-size:0.75rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:6px 14px;text-decoration:none;">
                  Get a Free Quote
                </a>
              </div>
            `,
          });

          countyRect.addListener("click", (e: google.maps.MapMouseEvent) => {
            infoWindow.setPosition(e.latLng);
            infoWindow.open(map);
          });
        }
      );
    },
    [county, state]
  );

  const center = COUNTY_CENTERS[slug] ?? { lat: 36.1, lng: -87.0, zoom: 9 };

  return (
    <div
      style={{
        borderTop: "1px solid rgba(224,123,42,0.2)",
        borderBottom: "1px solid rgba(224,123,42,0.2)",
      }}
    >
      <MapView
        initialCenter={{ lat: center.lat, lng: center.lng }}
        initialZoom={center.zoom}
        onMapReady={handleMapReady}
        className="w-full h-[420px]"
      />
    </div>
  );
}
