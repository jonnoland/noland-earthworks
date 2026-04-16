/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.manus.ai";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

// Singleton promise — ensures the Maps script is only injected once per page lifetime.
// IMPORTANT: Never reset this to null after it's set, even on error, to prevent
// duplicate script injection which causes "This page can't load Google Maps correctly".
let _mapsScriptPromise: Promise<void> | null = null;

export function loadMapScript() {
  // Already loading or loaded — return the same promise
  if (_mapsScriptPromise) return _mapsScriptPromise;

  // If Google Maps is already loaded (e.g. SSR hydration or script already in DOM), resolve immediately
  if (typeof window !== "undefined" && window.google?.maps) {
    _mapsScriptPromise = Promise.resolve();
    return _mapsScriptPromise;
  }

  // Check if a Maps script tag already exists in the DOM to avoid duplicate injection
  const existingScript = document.querySelector(`script[src*="maps/api/js"]`);
  if (existingScript) {
    // Script already injected — wait for google.maps to become available
    _mapsScriptPromise = new Promise<void>((resolve, reject) => {
      const check = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      // Timeout after 15 seconds
      setTimeout(() => {
        clearInterval(check);
        if (window.google?.maps) {
          resolve();
        } else {
          reject(new Error("Google Maps failed to initialize (timeout)"));
        }
      }, 15000);
    });
    return _mapsScriptPromise;
  }

  _mapsScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = (err) => {
      // Do NOT reset _mapsScriptPromise here — resetting it would allow a second
      // script tag to be injected, causing the "can't load Google Maps correctly" error.
      console.error("Google Maps script failed to load:", err);
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return _mapsScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState(false);

  const init = usePersistFn(async () => {
    try {
      await loadMapScript();
    } catch (err) {
      console.error("Could not load Google Maps:", err);
      setMapError(true);
      return;
    }
    if (!mapContainer.current) {
      console.error("Map container not found");
      return;
    }
    // Avoid re-initializing if map already exists on this container
    if (map.current) return;

    map.current = new window.google.maps.Map(mapContainer.current, {
      zoom: initialZoom,
      center: initialCenter,
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      streetViewControl: true,
    });
    if (onMapReady) {
      onMapReady(map.current);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  if (mapError) {
    return (
      <div
        className={cn(
          "w-full h-[500px] flex items-center justify-center",
          className
        )}
        style={{ background: "#1a1a1a", border: "1px solid rgba(224,123,42,0.2)" }}
      >
        <div style={{ textAlign: "center", color: "#a0a0a0" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🗺️</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", color: "#E07B2A", marginBottom: "0.25rem" }}>
            Map Unavailable
          </div>
          <div style={{ fontSize: "0.85rem" }}>Please call us at 615-406-4819 for service area information.</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}
