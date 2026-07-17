import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapView } from "@/components/Map";
import { toast } from "sonner";
import {
  MapPin,
  Navigation,
  Scale,
  Save,
  Trash2,
  Clock,
  Route,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Fuel,
  CircleDot,
} from "lucide-react";

// Default origin: Vanleer, TN
const DEFAULT_ORIGIN = "Vanleer, TN 37181";

interface PlannedRoute {
  distanceMiles: number;
  durationText: string;
  originLatLng: { lat: number; lng: number };
  destinationLatLng: { lat: number; lng: number };
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  weighStations: Array<{
    id: string;
    name: string;
    state: string;
    highway: string;
    direction: string;
    milepost: number | null;
    lat: number;
    lng: number;
    city: string;
    phone?: string;
    prepassEligible: boolean;
    notes?: string;
  }>;
  stationCount: number;
}

interface SavedRoute {
  id: number;
  name: string;
  originAddress: string;
  destinationAddress: string;
  distanceMiles: string | null;
  durationText: string | null;
  weighStationIds: string[];
  notes: string | null;
  createdAt: Date;
}

export default function WeighStationPlanner() {
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState("");
  const [routeName, setRouteName] = useState("");
  const [plannedRoute, setPlannedRoute] = useState<PlannedRoute | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [expandedStation, setExpandedStation] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const markerLibRef = useRef<google.maps.MarkerLibrary | null>(null);

  const [mpg, setMpg] = useState(9);
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  const planRoute = trpc.routePlanner.planRoute.useMutation();
  const saveRoute = trpc.routePlanner.saveRoute.useMutation();
  const deleteRoute = trpc.routePlanner.deleteRoute.useMutation();
  const { data: savedRoutes, refetch: refetchSaved } =
    trpc.routePlanner.getSavedRoutes.useQuery();
  const { data: stationStatus } = trpc.routePlanner.weighStationStatus.useQuery();
  const { data: dieselData } = trpc.routePlanner.dieselPrice.useQuery();

  // Build a normalized name -> status map from coopsareopen data
  const statusMap = useMemo(() => {
    const map: Record<string, "open" | "closed" | "unknown"> = {};
    if (!stationStatus?.stations) return map;
    for (const s of stationStatus.stations) {
      // Normalize: lowercase, strip punctuation
      const key = s.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      map[key] = s.status;
    }
    return map;
  }, [stationStatus]);

  // Look up open/closed for a station by matching normalized name
  const getStationStatus = useCallback(
    (stationName: string): "open" | "closed" | "unknown" => {
      const key = stationName.toLowerCase().replace(/[^a-z0-9]/g, "");
      // Try exact match first
      if (statusMap[key]) return statusMap[key];
      // Try partial match (station name may be longer in our dataset)
      const entries = Object.entries(statusMap) as Array<[string, "open" | "closed" | "unknown"]>;
      for (const [k, v] of entries) {
        if (key.includes(k) || k.includes(key)) return v;
      }
      return "unknown";
    },
    [statusMap]
  );

  // Clear map markers and directions
  const clearMap = useCallback(() => {
    // AdvancedMarkerElement uses m.map = null (not setMap) to detach from map
    markersRef.current.forEach((m) => {
      if (typeof m.setMap === "function") {
        m.setMap(null); // legacy google.maps.Marker
      } else {
        m.map = null; // AdvancedMarkerElement
      }
    });
    markersRef.current = [];
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
  }, []);

  // Draw route and weigh station markers on the map
  const drawRouteOnMap = useCallback(
    (route: PlannedRoute) => {
      if (!mapRef.current) return;
      const map = mapRef.current;

      clearMap();

      // Use Google Directions Service to render the route visually
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#D97706",
          strokeWeight: 5,
          strokeOpacity: 0.85,
        },
      });
      directionsRenderer.setMap(map);
      directionsRendererRef.current = directionsRenderer;

      directionsService.route(
        {
          origin: route.originLatLng,
          destination: route.destinationLatLng,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result) {
            directionsRenderer.setDirections(result);
          }
        }
      );

      // Use pre-loaded AdvancedMarkerElement library (loaded in onMapReady)
      const markerLib = markerLibRef.current;

      if (markerLib) {
        const { AdvancedMarkerElement, PinElement } = markerLib;

        // Origin marker — green pin
        const originPin = new PinElement({ background: "#16A34A", borderColor: "#15803D", glyphColor: "#fff", scale: 1.1 });
        const originMarker = new AdvancedMarkerElement({ position: route.originLatLng, map, title: "Origin", content: originPin.element, zIndex: 10 });
        markersRef.current.push(originMarker);

        // Destination marker — red pin
        const destPin = new PinElement({ background: "#DC2626", borderColor: "#B91C1C", glyphColor: "#fff", scale: 1.1 });
        const destMarker = new AdvancedMarkerElement({ position: route.destinationLatLng, map, title: "Destination", content: destPin.element, zIndex: 10 });
        markersRef.current.push(destMarker);

        // Weigh station markers
        const stationsToShow = showOpenOnly
          ? route.weighStations.filter((s) => getStationStatus(s.name) === "open")
          : route.weighStations;

        stationsToShow.forEach((station) => {
          const stStatus = getStationStatus(station.name);
          const statusColor = stStatus === "open" ? "#16A34A" : stStatus === "closed" ? "#DC2626" : "#9CA3AF";
          const statusText = stStatus === "open" ? "Open" : stStatus === "closed" ? "Closed" : "Status unknown";

          // Blue = PrePass eligible, amber = no bypass
          const pinBg = station.prepassEligible ? "#2563EB" : "#F59E0B";
          const pinBorder = stStatus === "open" ? "#16A34A" : stStatus === "closed" ? "#DC2626" : "#6B7280";

          // Custom truck/scale SVG glyph
          const glyphEl = document.createElement("div");
          glyphEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h14l3 9-3 3H6l-3-3 3-9z"/><line x1="6" y1="12" x2="6" y2="21"/><line x1="18" y1="12" x2="18" y2="21"/><line x1="3" y1="21" x2="21" y2="21"/></svg>`;
          glyphEl.style.display = "flex";
          glyphEl.style.alignItems = "center";
          glyphEl.style.justifyContent = "center";

          const stationPin = new PinElement({
            background: pinBg,
            borderColor: pinBorder,
            glyph: glyphEl,
            scale: 0.9,
          });

          const marker = new AdvancedMarkerElement({
            position: { lat: station.lat, lng: station.lng },
            map,
            title: station.name,
            content: stationPin.element,
            zIndex: 8,
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="font-family:sans-serif;font-size:13px;max-width:220px">
                <strong>${station.name}</strong><br/>
                ${station.highway} ${station.direction} — MM ${station.milepost ?? "N/A"}<br/>
                ${station.city}, ${station.state}<br/>
                ${station.prepassEligible ? '<span style="color:#2563EB">&#10003; PrePass/Drivewyze eligible</span>' : '<span style="color:#D97706">No bypass program</span>'}<br/>
                <span style="color:${statusColor};font-weight:600">&#9679; ${statusText}</span>
                ${station.notes ? `<br/><em>${station.notes}</em>` : ""}
                ${station.phone ? `<br/>&#128222; ${station.phone}` : ""}
              </div>
            `,
          });

          marker.addListener("click", () => { infoWindow.open(map, marker); });
          markersRef.current.push(marker);
        });
      } else {
        // Fallback: legacy markers if library not yet loaded
        const originMarker = new google.maps.Marker({ position: route.originLatLng, map, title: "Origin", icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#16A34A", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 }, zIndex: 10 });
        markersRef.current.push(originMarker);
        const destMarker = new google.maps.Marker({ position: route.destinationLatLng, map, title: "Destination", icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#DC2626", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 }, zIndex: 10 });
        markersRef.current.push(destMarker);
        const stationsToShow = showOpenOnly ? route.weighStations.filter((s) => getStationStatus(s.name) === "open") : route.weighStations;
        stationsToShow.forEach((station) => {
          const stStatus = getStationStatus(station.name);
          const statusColor = stStatus === "open" ? "#16A34A" : stStatus === "closed" ? "#DC2626" : "#9CA3AF";
          const statusText = stStatus === "open" ? "Open" : stStatus === "closed" ? "Closed" : "Status unknown";
          const marker = new google.maps.Marker({ position: { lat: station.lat, lng: station.lng }, map, title: station.name, icon: { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 7, fillColor: station.prepassEligible ? "#2563EB" : "#F59E0B", fillOpacity: 1, strokeColor: stStatus === "open" ? "#16A34A" : stStatus === "closed" ? "#DC2626" : "#fff", strokeWeight: stStatus !== "unknown" ? 2.5 : 1.5 }, zIndex: 8 });
          const infoWindow = new google.maps.InfoWindow({ content: `<div style="font-family:sans-serif;font-size:13px;max-width:220px"><strong>${station.name}</strong><br/>${station.highway} ${station.direction} — MM ${station.milepost ?? "N/A"}<br/>${station.city}, ${station.state}<br/>${station.prepassEligible ? '<span style="color:#2563EB">&#10003; PrePass/Drivewyze eligible</span>' : '<span style="color:#D97706">No bypass program</span>'}<br/><span style="color:${statusColor};font-weight:600">&#9679; ${statusText}</span>${station.notes ? `<br/><em>${station.notes}</em>` : ""}${station.phone ? `<br/>&#128222; ${station.phone}` : ""}</div>` });
          marker.addListener("click", () => { infoWindow.open(map, marker); });
          markersRef.current.push(marker);
        });
      }

      // Fit bounds
      const bounds = new google.maps.LatLngBounds(
        route.bounds.southwest,
        route.bounds.northeast
      );
      map.fitBounds(bounds, 60);
    },
    [clearMap, showOpenOnly, getStationStatus]
  );

  // Re-draw when map becomes ready and we have a route, or when open-only filter changes
  useEffect(() => {
    if (mapReady && plannedRoute) {
      drawRouteOnMap(plannedRoute);
    }
  }, [mapReady, plannedRoute, drawRouteOnMap, showOpenOnly]);

  const handlePlanRoute = async () => {
    if (!destination.trim()) {
      toast.error("Enter a destination address");
      return;
    }
    try {
      const result = await planRoute.mutateAsync({
        origin: origin.trim(),
        destination: destination.trim(),
      });
      setPlannedRoute(result as PlannedRoute);
      setShowSaveForm(false);
      if (mapReady) drawRouteOnMap(result as PlannedRoute);
      toast.success(
        `Route planned — ${result.stationCount} weigh station${result.stationCount !== 1 ? "s" : ""} along the way`
      );
    } catch (err: any) {
      toast.error(err.message ?? "Failed to plan route");
    }
  };

  const handleSaveRoute = async () => {
    if (!routeName.trim() || !plannedRoute) return;
    try {
      await saveRoute.mutateAsync({
        name: routeName.trim(),
        originAddress: origin,
        destinationAddress: destination,
        originLatLng: plannedRoute.originLatLng,
        destinationLatLng: plannedRoute.destinationLatLng,
        distanceMiles: plannedRoute.distanceMiles.toString(),
        durationText: plannedRoute.durationText,
        weighStationIds: plannedRoute.weighStations.map((s) => s.id),
      });
      toast.success("Route saved");
      setShowSaveForm(false);
      setRouteName("");
      refetchSaved();
    } catch {
      toast.error("Failed to save route");
    }
  };

  const handleLoadSaved = (route: SavedRoute) => {
    setOrigin(route.originAddress);
    setDestination(route.destinationAddress);
    toast.info("Addresses loaded — click Plan Route to re-run");
  };

  const handleDeleteSaved = async (id: number) => {
    try {
      await deleteRoute.mutateAsync({ id });
      toast.success("Route deleted");
      refetchSaved();
    } catch {
      toast.error("Failed to delete route");
    }
  };

  const statusBadge = (status: "open" | "closed" | "unknown") => {
    if (status === "open") return "bg-green-500/20 text-green-300 border-green-500/30";
    if (status === "closed") return "bg-red-500/20 text-red-300 border-red-500/30";
    return "bg-white/10 text-white/40 border-white/10";
  };

  const statusLabel = (status: "open" | "closed" | "unknown") => {
    if (status === "open") return "Open";
    if (status === "closed") return "Closed";
    return "Status unknown";
  };

  // Fuel cost calculation
  const fuelCost = useMemo(() => {
    if (!plannedRoute || !dieselData) return null;
    const gallons = plannedRoute.distanceMiles / mpg;
    const cost = gallons * dieselData.pricePerGallon;
    return { gallons: gallons.toFixed(1), cost: cost.toFixed(2) };
  }, [plannedRoute, dieselData, mpg]);

  const directionColor = (dir: string) => {
    if (dir === "NB" || dir === "EB") return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    return "bg-orange-500/20 text-orange-300 border-orange-500/30";
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#121212] text-[#F0EDE6]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-1">
          <Route className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Weigh Station Route Planner</h1>
        </div>
        <p className="text-sm text-white/50">
          Plan routes to job sites and see every weigh station along the way. Markers show
          PrePass/Drivewyze bypass eligibility.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-0 overflow-hidden">
        {/* Left panel — inputs + results */}
        <div className="w-full lg:w-96 flex-shrink-0 flex flex-col border-r border-white/10 overflow-y-auto">
          {/* Route inputs */}
          <div className="p-5 space-y-3 border-b border-white/10">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
                Origin
              </label>
              <Input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Vanleer, TN 37181"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wide">
                Destination
              </label>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Job site address or city"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
                onKeyDown={(e) => e.key === "Enter" && handlePlanRoute()}
              />
            </div>
            <Button
              onClick={handlePlanRoute}
              disabled={planRoute.isPending}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
            >
              {planRoute.isPending ? (
                <span className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 animate-pulse" /> Planning...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Navigation className="w-4 h-4" /> Plan Route
                </span>
              )}
            </Button>
          </div>

          {/* Route summary */}
          {plannedRoute && (
            <div className="p-5 border-b border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white">Route Summary</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-400 hover:text-amber-300 h-7 px-2"
                  onClick={() => setShowSaveForm(!showSaveForm)}
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Save
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-400">
                    {plannedRoute.distanceMiles}
                  </div>
                  <div className="text-xs text-white/50">miles</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-400">
                    {plannedRoute.durationText}
                  </div>
                  <div className="text-xs text-white/50">drive time</div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/5 rounded-lg p-3">
                <Scale className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-white">
                    {plannedRoute.stationCount}
                  </span>{" "}
                  <span className="text-white/70 text-sm">
                    weigh station{plannedRoute.stationCount !== 1 ? "s" : ""} on this route
                  </span>
                </div>
              </div>

              {/* Fuel cost estimator */}
              <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Fuel className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-white">Diesel Cost Estimate</span>
                </div>
                {dieselData ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>Diesel price ({dieselData.region})</span>
                      <span className="text-white font-medium">${dieselData.pricePerGallon.toFixed(3)}/gal</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>MPG</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setMpg((m) => Math.max(1, m - 1))}
                          className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white text-xs flex items-center justify-center"
                        >-</button>
                        <span className="text-white font-medium w-5 text-center">{mpg}</span>
                        <button
                          onClick={() => setMpg((m) => Math.min(30, m + 1))}
                          className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white text-xs flex items-center justify-center"
                        >+</button>
                      </div>
                    </div>
                    {fuelCost && (
                      <>
                        <div className="flex items-center justify-between text-xs text-white/50">
                          <span>Est. gallons</span>
                          <span className="text-white font-medium">{fuelCost.gallons} gal</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-white/10 pt-2 mt-1">
                          <span className="text-xs font-semibold text-white/70">Est. fuel cost</span>
                          <span className="text-base font-bold text-amber-400">${fuelCost.cost}</span>
                        </div>
                      </>
                    )}
                    <p className="text-[10px] text-white/30 mt-1">
                      {dieselData.source === "fallback" ? "Est. price (EIA unavailable)" : `Source: EIA · ${dieselData.region}`}{dieselData.period ? ` · ${dieselData.period}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-white/40">Loading diesel price...</p>
                )}
              </div>

              {/* Save form */}
              {showSaveForm && (
                <div className="space-y-2 bg-white/5 rounded-lg p-3">
                  <Input
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="Route name (e.g., Vanleer to Clarksville)"
                    className="bg-white/10 border-white/15 text-white placeholder:text-white/30 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveRoute}
                    disabled={!routeName.trim() || saveRoute.isPending}
                    className="w-full bg-green-700 hover:bg-green-600 text-white"
                  >
                    {saveRoute.isPending ? "Saving..." : "Save Route"}
                  </Button>
                </div>
              )}

              {/* Weigh station list */}
              {plannedRoute.weighStations.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                      Weigh Stations Along Route
                    </h3>
                    <div className="flex items-center gap-2">
                      {stationStatus?.fetchedAt && (
                        <span className="text-[10px] text-white/30">
                          coopsareopen.com
                        </span>
                      )}
                      <button
                        onClick={() => setShowOpenOnly((v) => !v)}
                        className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                          showOpenOnly
                            ? "bg-green-500/20 text-green-300 border-green-500/40"
                            : "bg-white/5 text-white/40 border-white/15 hover:text-white/60"
                        }`}
                        title={showOpenOnly ? "Showing open stations only — click to show all" : "Click to show open stations only"}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${showOpenOnly ? "bg-green-400" : "bg-white/30"}`} />
                        {showOpenOnly ? "Open only" : "All stations"}
                      </button>
                    </div>
                  </div>
                  {plannedRoute.weighStations
                    .filter((station) => !showOpenOnly || getStationStatus(station.name) === "open")
                    .map((station) => (
                    <div
                      key={station.id}
                      className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                    >
                      <button
                        className="w-full text-left p-3 flex items-start justify-between gap-2 hover:bg-white/5 transition-colors"
                        onClick={() =>
                          setExpandedStation(
                            expandedStation === station.id ? null : station.id
                          )
                        }
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <Scale className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {station.name}
                            </div>
                            <div className="text-xs text-white/50">
                              {station.highway} · MM {station.milepost ?? "N/A"} ·{" "}
                              {station.city}, {station.state}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-xs ${directionColor(station.direction)}`}
                          >
                            {station.direction}
                          </Badge>
                          {(() => {
                            const st = getStationStatus(station.name);
                            if (st !== "unknown") {
                              return (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${statusBadge(st)}`}
                                >
                                  {statusLabel(st)}
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                          {expandedStation === station.id ? (
                            <ChevronUp className="w-3.5 h-3.5 text-white/40" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                          )}
                        </div>
                      </button>

                      {expandedStation === station.id && (
                        <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2">
                          <div className="flex items-center gap-2">
                            {station.prepassEligible ? (
                              <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span className="text-xs text-white/70">
                              {station.prepassEligible
                                ? "PrePass / Drivewyze bypass eligible"
                                : "No bypass program — must enter if open"}
                            </span>
                          </div>
                          {station.notes && (
                            <p className="text-xs text-white/50 italic">{station.notes}</p>
                          )}
                          {station.phone && (
                            <p className="text-xs text-white/50">
                              <span className="text-white/40">Phone:</span> {station.phone}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4" />
                  No weigh stations detected on this route.
                </div>
              )}
            </div>
          )}

          {/* Saved routes */}
          {savedRoutes && savedRoutes.length > 0 && (
            <div className="p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
                Saved Routes
              </h2>
              {savedRoutes.map((route) => (
                <div
                  key={route.id}
                  className="bg-white/5 rounded-lg border border-white/10 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-white truncate">
                        {route.name}
                      </div>
                      <div className="text-xs text-white/40 truncate">
                        {route.originAddress} → {route.destinationAddress}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSaved(route.id)}
                      className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/50">
                    {route.distanceMiles && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {route.distanceMiles} mi
                      </span>
                    )}
                    {route.durationText && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {route.durationText}
                      </span>
                    )}
                    {route.weighStationIds.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        {route.weighStationIds.length} station
                        {route.weighStationIds.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs border-white/15 text-white/70 hover:text-white bg-transparent"
                    onClick={() => handleLoadSaved(route as SavedRoute)}
                  >
                    Load Addresses
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="p-5 mt-auto border-t border-white/10">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
              Map Legend
            </h3>
            <div className="space-y-1.5 text-xs text-white/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-600 flex-shrink-0" />
                Origin
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-600 flex-shrink-0" />
                Destination
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                Weigh station — PrePass/Drivewyze eligible
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
                Weigh station — no bypass program
              </div>
              <div className="border-t border-white/10 pt-1.5 mt-1 space-y-1.5">
                <div className="text-white/30 text-[10px] uppercase tracking-wide mb-1">Open/Closed Status (marker border)</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-transparent flex-shrink-0" />
                  Station reported open
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-transparent flex-shrink-0" />
                  Station reported closed
                </div>
                <p className="text-[10px] text-white/25 mt-1">Status: coopsareopen.com (crowdsourced){stationStatus?.fetchedAt ? ` · updated ${new Date(stationStatus.fetchedAt).toLocaleTimeString()}` : ""}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — map */}
        <div className="flex-1 min-h-[400px] lg:min-h-0 relative">
          <MapView
            onMapReady={async (map) => {
              mapRef.current = map;
              // Pre-load AdvancedMarkerElement library so drawRouteOnMap can use it synchronously
              try {
                markerLibRef.current = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
              } catch {
                // library load failed — will fall back to legacy markers
              }
              setMapReady(true);
              // Default view: Middle Tennessee
              map.setCenter({ lat: 36.25, lng: -87.53 });
              map.setZoom(8);
            }}
            className="w-full h-full min-h-[400px]"
          />
          {!plannedRoute && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-sm rounded-xl px-6 py-4 text-center border border-white/10">
                <Scale className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-white font-medium text-sm">Enter a destination and click Plan Route</p>
                <p className="text-white/40 text-xs mt-1">
                  Weigh stations will appear on the map along your route
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
