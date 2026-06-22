/**
 * PropertyMapDrawer
 *
 * Embeds a Google Maps satellite view inside the Create Quote modal.
 * The user can:
 *   1. Search for an address to center the map
 *   2. Click "Draw Property" to enter polygon-drawing mode
 *   3. Click points on the map to trace the parcel boundary
 *   4. Double-click (or click "Finish") to close the polygon
 *   5. See the calculated acreage instantly
 *   6. Click "Apply" to push the acreage back to the parent form
 *
 * Uses Google Maps native Polygon + click listeners.
 * Area is computed via google.maps.geometry.spherical.computeArea()
 * and converted from m² → acres (1 acre = 4046.856 m²).
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState, useCallback } from "react";
import { loadMapScript } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MapPin,
  Pencil,
  Trash2,
  CheckCircle2,
  Search,
  RotateCcw,
  Loader2,
  Info,
} from "lucide-react";

// Middle Tennessee default center
const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 35.9606, lng: -86.7844 };
const DEFAULT_ZOOM = 15;
const SQ_METERS_PER_ACRE = 4046.8564224;

// Map script URL that includes the drawing + geometry libraries
const MAPS_SCRIPT_SRC = `/api/maps/js?v=weekly&libraries=marker,places,geocoding,geometry,drawing&loading=async`;

// Override the singleton script src so the drawing library is included.
// The Map.tsx singleton only loads once — if it already loaded without drawing,
// we detect that and fall back to manual polygon drawing (click-to-add-vertex).
function isDrawingLibraryAvailable(): boolean {
  return typeof window !== "undefined" &&
    typeof (window as any).google?.maps?.drawing?.DrawingManager === "function";
}

function sqMetersToAcres(sqMeters: number): number {
  return sqMeters / SQ_METERS_PER_ACRE;
}

interface PropertyMapDrawerProps {
  /** Called when user clicks "Apply" with the calculated acreage */
  onApply: (acres: number, polygonCoords: google.maps.LatLngLiteral[]) => void;
  /** Pre-fill address search */
  initialAddress?: string;
  /** Pre-existing polygon to show on open */
  initialPolygon?: google.maps.LatLngLiteral[];
}

export default function PropertyMapDrawer({
  onApply,
  initialAddress,
  initialPolygon,
}: PropertyMapDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const dblClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [vertices, setVertices] = useState<google.maps.LatLngLiteral[]>([]);
  const [finishedPolygon, setFinishedPolygon] = useState<google.maps.LatLngLiteral[] | null>(
    initialPolygon ?? null
  );
  const [acres, setAcres] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState(initialAddress ?? "");
  const [searching, setSearching] = useState(false);

  // ─── Load map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Try to load with drawing library. If the singleton already loaded
        // without it, we fall through to manual click-drawing mode.
        if (!isDrawingLibraryAvailable()) {
          // Inject a fresh script tag with drawing library if not yet loaded
          const existing = document.querySelector(`script[src*="maps/api/js"]`);
          if (!existing) {
            await new Promise<void>((resolve, reject) => {
              const s = document.createElement("script");
              s.src = MAPS_SCRIPT_SRC;
              s.async = true;
              s.crossOrigin = "anonymous";
              s.onload = () => {
                // Poll for google.maps.Map
                const start = Date.now();
                const check = setInterval(() => {
                  if (typeof window.google?.maps?.Map === "function") {
                    clearInterval(check);
                    resolve();
                  } else if (Date.now() - start > 15000) {
                    clearInterval(check);
                    reject(new Error("Maps timeout"));
                  }
                }, 50);
              };
              s.onerror = reject;
              document.head.appendChild(s);
            });
          } else {
            await loadMapScript();
          }
        }
      } catch {
        if (!cancelled) setMapError(true);
        return;
      }

      if (cancelled || !containerRef.current) return;

      const map = new window.google.maps.Map(containerRef.current, {
        zoom: DEFAULT_ZOOM,
        center: DEFAULT_CENTER,
        mapTypeId: "satellite",
        tilt: 0,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        mapId: "DEMO_MAP_ID",
      });

      mapRef.current = map;

      // If we have an initial polygon, render it immediately
      if (initialPolygon && initialPolygon.length >= 3) {
        renderFinishedPolygon(map, initialPolygon);
        const computed = computeAcres(initialPolygon);
        setAcres(computed);
        setFinishedPolygon(initialPolygon);
        // Fit bounds
        const bounds = new window.google.maps.LatLngBounds();
        initialPolygon.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 40);
      } else if (initialAddress) {
        geocodeAddress(map, initialAddress);
      }

      setMapReady(true);
    }

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function computeAcres(coords: google.maps.LatLngLiteral[]): number {
    if (coords.length < 3) return 0;
    const path = coords.map((c) => new window.google.maps.LatLng(c.lat, c.lng));
    const sqM = window.google.maps.geometry.spherical.computeArea(path);
    return sqMetersToAcres(sqM);
  }

  function clearVertexMarkers() {
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
  }

  function clearPolygon() {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
  }

  function removeClickListeners() {
    if (clickListenerRef.current) {
      window.google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }
    if (dblClickListenerRef.current) {
      window.google.maps.event.removeListener(dblClickListenerRef.current);
      dblClickListenerRef.current = null;
    }
  }

  function renderFinishedPolygon(map: google.maps.Map, coords: google.maps.LatLngLiteral[]) {
    clearPolygon();
    const poly = new window.google.maps.Polygon({
      paths: coords,
      strokeColor: "#E07B2A",
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: "#E07B2A",
      fillOpacity: 0.2,
      map,
    });
    polygonRef.current = poly;
  }

  function renderInProgressPolygon(map: google.maps.Map, coords: google.maps.LatLngLiteral[]) {
    clearPolygon();
    if (coords.length < 2) return;
    const poly = new window.google.maps.Polygon({
      paths: coords,
      strokeColor: "#E07B2A",
      strokeOpacity: 0.7,
      strokeWeight: 2,
      fillColor: "#E07B2A",
      fillOpacity: 0.1,
      map,
    });
    polygonRef.current = poly;
  }

  function addVertexMarker(map: google.maps.Map, pos: google.maps.LatLngLiteral, index: number) {
    const dot = document.createElement("div");
    dot.style.cssText = `
      width: 10px; height: 10px; border-radius: 50%;
      background: #E07B2A; border: 2px solid #fff;
      box-shadow: 0 0 4px rgba(0,0,0,0.6);
    `;
    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position: pos,
      content: dot,
      title: `Vertex ${index + 1}`,
    });
    markersRef.current.push(marker);
  }

  function geocodeAddress(map: google.maps.Map, address: string) {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        map.setCenter(results[0].geometry.location);
        map.setZoom(17);
      }
    });
  }

  // ─── Drawing mode ─────────────────────────────────────────────────────────────
  const startDrawing = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear any existing polygon + state
    clearPolygon();
    clearVertexMarkers();
    removeClickListeners();
    setFinishedPolygon(null);
    setAcres(null);
    setVertices([]);
    setIsDrawing(true);

    const currentVertices: google.maps.LatLngLiteral[] = [];

    // Change cursor
    map.setOptions({ draggableCursor: "crosshair" });

    clickListenerRef.current = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      currentVertices.push(pos);
      setVertices([...currentVertices]);
      addVertexMarker(map, pos, currentVertices.length - 1);
      renderInProgressPolygon(map, currentVertices);
    });

    dblClickListenerRef.current = map.addListener("dblclick", (e: google.maps.MapMouseEvent) => {
      e.stop?.();
      if (currentVertices.length >= 3) {
        finishDrawing(map, currentVertices);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishDrawing = useCallback((
    map: google.maps.Map,
    verts: google.maps.LatLngLiteral[]
  ) => {
    removeClickListeners();
    clearVertexMarkers();
    map.setOptions({ draggableCursor: "" });
    setIsDrawing(false);

    if (verts.length < 3) {
      clearPolygon();
      setVertices([]);
      return;
    }

    renderFinishedPolygon(map, verts);
    const computed = computeAcres(verts);
    setFinishedPolygon(verts);
    setAcres(computed);
    setVertices(verts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFinishClick = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    // Grab current vertices from state via ref trick — we need the latest value
    setVertices((current) => {
      if (current.length >= 3) {
        finishDrawing(map, current);
      }
      return current;
    });
  }, [finishDrawing]);

  const handleClear = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    removeClickListeners();
    clearPolygon();
    clearVertexMarkers();
    map.setOptions({ draggableCursor: "" });
    setIsDrawing(false);
    setVertices([]);
    setFinishedPolygon(null);
    setAcres(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Address search ───────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !searchValue.trim()) return;
    setSearching(true);
    try {
      await new Promise<void>((resolve) => {
        geocodeAddress(map, searchValue.trim());
        setTimeout(resolve, 800);
      });
    } finally {
      setSearching(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  // ─── Apply ────────────────────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    if (acres !== null && finishedPolygon) {
      onApply(parseFloat(acres.toFixed(2)), finishedPolygon);
    }
  }, [acres, finishedPolygon, onApply]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (mapError) {
    return (
      <div className="flex items-center justify-center h-48 rounded-md bg-secondary/20 border border-border text-sm text-muted-foreground">
        Map unavailable. Check your connection and try again.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Address search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search address or property location..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSearch}
          disabled={!mapReady || searching}
          className="h-8 px-3 text-xs"
        >
          {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Go"}
        </Button>
      </div>

      {/* Map container */}
      <div className="relative rounded-md overflow-hidden border border-border">
        <div ref={containerRef} className="w-full h-64" />

        {/* Loading overlay */}
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {/* Drawing hint overlay */}
        {isDrawing && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none whitespace-nowrap">
            Click to add points &bull; Double-click or press Finish to close
          </div>
        )}

        {/* Vertex count badge while drawing */}
        {isDrawing && vertices.length > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none">
            {vertices.length} point{vertices.length !== 1 ? "s" : ""}
            {vertices.length >= 3 ? " — ready to finish" : ""}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <TooltipProvider>
          {!isDrawing ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startDrawing}
                  disabled={!mapReady}
                  className="h-7 text-xs gap-1.5"
                >
                  <Pencil className="h-3 w-3" />
                  {finishedPolygon ? "Redraw" : "Draw Property"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Click points on the map to trace the property boundary
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleFinishClick}
                disabled={vertices.length < 3}
                className="h-7 text-xs gap-1.5"
              >
                <CheckCircle2 className="h-3 w-3" />
                Finish ({vertices.length} pts)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 text-xs gap-1.5 text-muted-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Cancel
              </Button>
            </>
          )}

          {finishedPolygon && !isDrawing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 text-xs gap-1.5 text-muted-foreground"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </Button>
          )}
        </TooltipProvider>

        {/* Acreage result */}
        {acres !== null && !isDrawing && (
          <div className="flex items-center gap-2 ml-auto">
            <Badge
              variant="outline"
              className="text-xs gap-1 border-primary/40 text-primary"
            >
              <MapPin className="h-3 w-3" />
              {acres.toFixed(2)} acres
            </Badge>
            <Button
              size="sm"
              onClick={handleApply}
              className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
            >
              <CheckCircle2 className="h-3 w-3" />
              Apply to Quote
            </Button>
          </div>
        )}
      </div>

      {/* Instruction hint */}
      {!finishedPolygon && !isDrawing && mapReady && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3 shrink-0" />
          Search for the property address, then click "Draw Property" to trace the boundary and calculate acreage.
        </p>
      )}
    </div>
  );
}
