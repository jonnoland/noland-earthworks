import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapView } from "@/components/Map";
import { toast } from "sonner";
import { SERVICE_AREA_COUNTIES } from "@shared/serviceAreas";
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
  Plus,
  X,
  Truck,
  Tractor,
  MapPinned,
  ClipboardList,
  FileSearch,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { restoreRuralRoutePlan, RURAL_HAULING_PROFILE, serializeRuralRoutePlanNotes, type RuralRouteStop } from "@shared/ruralRoutePlan";
import { calculateTowingTravelEstimate } from "@shared/routeVehicleProfile";

// Default origin: Vanleer, TN
const DEFAULT_ORIGIN = "Vanleer, TN 37181";

interface PlannedRoute {
  distanceMiles: number;
  durationText: string;
  durationSeconds: number;
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
  routeStops: Array<RuralRouteStop & { latLng: { lat: number; lng: number } }>;
  unpavedRoads: Array<{ id: string; name: string; surface: string; geometry: Array<{ lat: number; lng: number }> }>;
  unpavedRouteApproximateMiles: number;
  roadSurfaceSource: string;
  routeRestrictions: Array<{
    id: string;
    osmType: "node" | "way";
    osmId: number;
    restrictionType: "height" | "physical_clearance" | "weight" | "gross_weight" | "axle_weight";
    value: string;
    name: string;
    lat: number;
    lng: number;
  }>;
  restrictionSource: string;
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

interface ParcelDestinationMatch {
  parcelId: string;
  county: string;
  address: string | null;
  deedAcreage: number | null;
  centroid: { lat: number; lng: number } | null;
  propertyViewerUrl: string | null;
}

interface ParcelBoundaryOverlay {
  parcelId: string;
  county: string;
  boundaryRings: Array<Array<{ lat: number; lng: number }>>;
}

interface RouteVehicleProfile {
  id: number;
  name: string;
  truck: string;
  trailer: string;
  loadDescription: string;
  towingMpg: number;
  towingTimeMultiplier: number;
  unpavedAverageMph: number;
  isDefault: boolean;
  notes: string | null;
}

const RURAL_ROUTE_CHECKS = [
  "Posted bridge, weight, and vehicle restrictions reviewed",
  "Unpaved-road condition, weather, and soft-ground risk reviewed",
  "Gate clearance, tight turns, and turnaround room confirmed",
  "Property access route confirmed with the owner or site contact",
] as const;

const EQUIPMENT_PROFILE = "2026 Ram 5500 · 84\" C/A · BigTex 25' Gooseneck · CAT 299D3 loaded";

const restrictionLabel: Record<PlannedRoute["routeRestrictions"][number]["restrictionType"], string> = {
  height: "Maximum height",
  physical_clearance: "Physical clearance",
  weight: "Maximum actual weight",
  gross_weight: "Maximum gross weight rating",
  axle_weight: "Maximum axle load",
};

export default function WeighStationPlanner() {
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState("");
  const [routeName, setRouteName] = useState("");
  const [plannedRoute, setPlannedRoute] = useState<PlannedRoute | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [expandedStation, setExpandedStation] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [parcelCounty, setParcelCounty] = useState("");
  const [parcelId, setParcelId] = useState("");
  const [parcelMatches, setParcelMatches] = useState<ParcelDestinationMatch[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<ParcelDestinationMatch | null>(null);
  const [selectedParcelBoundary, setSelectedParcelBoundary] = useState<ParcelBoundaryOverlay | null>(null);
  const [routeChecks, setRouteChecks] = useState<Record<string, boolean>>({});
  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const parcelPolygonRef = useRef<google.maps.Polygon | null>(null);
  const unpavedRoadPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const restrictionMarkersRef = useRef<google.maps.Marker[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const markerLibRef = useRef<google.maps.MarkerLibrary | null>(null);

  const [mpg, setMpg] = useState<number>(RURAL_HAULING_PROFILE.defaultMpg);
  const [stops, setStops] = useState<RuralRouteStop[]>([]);
  const [stopInput, setStopInput] = useState("");
  const [ruralAccessNotes, setRuralAccessNotes] = useState("");
  const [selectedVehicleProfileId, setSelectedVehicleProfileId] = useState<number | null>(null);
  const [showVehicleProfileForm, setShowVehicleProfileForm] = useState(false);
  const [vehicleProfileForm, setVehicleProfileForm] = useState({ name: "", truck: "", trailer: "", loadDescription: "", towingMpg: "9", towingTimeMultiplier: "1.15", unpavedAverageMph: "18", isDefault: false, notes: "" });

  const planRoute = trpc.routePlanner.planRoute.useMutation();
  const lookupParcel = trpc.parcel.lookup.useMutation();
  const loadParcelBoundary = trpc.parcel.boundary.useMutation();
  const saveRoute = trpc.routePlanner.saveRoute.useMutation();
  const deleteRoute = trpc.routePlanner.deleteRoute.useMutation();
  const { data: vehicleProfiles = [], refetch: refetchVehicleProfiles } = trpc.routePlanner.getVehicleProfiles.useQuery();
  const { data: savedRoutes, refetch: refetchSaved } =
    trpc.routePlanner.getSavedRoutes.useQuery();
  const { data: dieselData } = trpc.routePlanner.dieselPrice.useQuery();
  const routeReviewComplete = RURAL_ROUTE_CHECKS.every((check) => routeChecks[check]);
  const selectedVehicleProfile = (vehicleProfiles as RouteVehicleProfile[]).find((profile) => profile.id === selectedVehicleProfileId)
    ?? (vehicleProfiles as RouteVehicleProfile[]).find((profile) => profile.isDefault)
    ?? null;
  const saveVehicleProfile = trpc.routePlanner.saveVehicleProfile.useMutation({
    onSuccess: async (profile) => {
      await refetchVehicleProfiles();
      setSelectedVehicleProfileId(profile.id);
      setMpg(profile.towingMpg);
      setShowVehicleProfileForm(false);
      toast.success("Vehicle profile saved and selected.");
    },
    onError: (error) => toast.error(error.message ?? "Vehicle profile could not be saved."),
  });

  useEffect(() => {
    if (!selectedVehicleProfileId && selectedVehicleProfile) {
      setSelectedVehicleProfileId(selectedVehicleProfile.id);
      setMpg(selectedVehicleProfile.towingMpg);
    }
  }, [selectedVehicleProfileId, selectedVehicleProfile]);

  const clearParcelBoundary = useCallback(() => {
    if (parcelPolygonRef.current) {
      parcelPolygonRef.current.setMap(null);
      parcelPolygonRef.current = null;
    }
  }, []);

  const drawParcelBoundary = useCallback((boundary: ParcelBoundaryOverlay) => {
    const map = mapRef.current;
    if (!map || boundary.boundaryRings.length === 0) return;

    clearParcelBoundary();
    const polygon = new google.maps.Polygon({
      paths: boundary.boundaryRings,
      strokeColor: "#F59E0B",
      strokeOpacity: 0.95,
      strokeWeight: 3,
      fillColor: "#F59E0B",
      fillOpacity: 0.15,
      clickable: false,
      zIndex: 4,
      map,
    });
    parcelPolygonRef.current = polygon;

    const bounds = new google.maps.LatLngBounds();
    boundary.boundaryRings.flat().forEach((point) => bounds.extend(point));
    if (!bounds.isEmpty()) map.fitBounds(bounds, 80);
  }, [clearParcelBoundary]);

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
    unpavedRoadPolylinesRef.current.forEach((polyline) => polyline.setMap(null));
    unpavedRoadPolylinesRef.current = [];
    restrictionMarkersRef.current.forEach((marker) => marker.setMap(null));
    restrictionMarkersRef.current = [];
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

      route.unpavedRoads.forEach((road) => {
        const polyline = new google.maps.Polyline({
          path: road.geometry,
          map,
          strokeColor: "#A855F7",
          strokeOpacity: 0.95,
          strokeWeight: 5,
          zIndex: 6,
        });
        const infoWindow = new google.maps.InfoWindow({ content: `<div style="font-family:sans-serif;font-size:13px"><strong>${road.name}</strong><br/>OSM surface: ${road.surface}<br/><span style="color:#6B7280;font-size:11px">Reference only — confirm current road conditions.</span></div>` });
        polyline.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (event.latLng) infoWindow.setPosition(event.latLng);
          infoWindow.open({ map });
        });
        unpavedRoadPolylinesRef.current.push(polyline);
      });

      route.routeRestrictions.forEach((restriction) => {
        const marker = new google.maps.Marker({
          position: { lat: restriction.lat, lng: restriction.lng },
          map,
          title: `${restrictionLabel[restriction.restrictionType]}: ${restriction.value} — ${restriction.name}. Verify current signage and official restrictions.`,
          label: { text: "!", color: "#FFFFFF", fontWeight: "700" },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#DC2626",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
            scale: 10,
          },
          zIndex: 10,
        });
        restrictionMarkersRef.current.push(marker);
      });

      directionsService.route(
        {
          origin: route.originLatLng,
          destination: route.destinationLatLng,
          waypoints: route.routeStops.map((stop) => ({ location: stop.latLng, stopover: true })),
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

        route.routeStops.forEach((stop, index) => {
          const stopPin = new PinElement({ background: "#2563EB", borderColor: "#1D4ED8", glyphColor: "#fff", glyph: String(index + 1), scale: 1.05 });
          const marker = new AdvancedMarkerElement({ position: stop.latLng, map, title: stop.label, content: stopPin.element, zIndex: 9 });
          const infoWindow = new google.maps.InfoWindow({ content: `<div style="font-family:sans-serif;font-size:13px;max-width:240px"><strong>Stop ${index + 1}: ${stop.label}</strong><br/><span style="color:#6B7280">${stop.source === "parcel" ? "Parcel ID destination" : "Address stop"}</span></div>` });
          marker.addListener("click", () => { infoWindow.open(map, marker); });
          markersRef.current.push(marker);
        });

        // Weigh station markers — all stations shown (no open/closed filter; status not publicly available)
        route.weighStations.forEach((station) => {
          // All markers use neutral amber border — status is unknown
          const pinBg = "#F59E0B"; // amber — DOT scale house
          const pinBorder = "#6B7280"; // neutral gray border

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

          const dirLabel = station.direction !== "UNKNOWN" ? ` ${station.direction}` : "";
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="font-family:sans-serif;font-size:13px;max-width:240px">
                <strong>${station.name}</strong><br/>
                ${station.highway}${dirLabel}${station.milepost != null ? ` — MM ${station.milepost}` : ""}<br/>
                ${station.city ? `${station.city}, ` : ""}${station.state}<br/>
                <span style="color:#9CA3AF;font-size:11px">Live status not available — check PrePass or Trucker Path app</span>
                ${station.notes ? `<br/><em style="color:#9CA3AF;font-size:11px">${station.notes}</em>` : ""}
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
        route.routeStops.forEach((stop, index) => {
          const marker = new google.maps.Marker({ position: stop.latLng, map, title: `Stop ${index + 1}: ${stop.label}`, label: String(index + 1), icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#2563EB", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 }, zIndex: 9 });
          markersRef.current.push(marker);
        });
        route.weighStations.forEach((station) => {
          const dirLabel = station.direction !== "UNKNOWN" ? ` ${station.direction}` : "";
          const marker = new google.maps.Marker({ position: { lat: station.lat, lng: station.lng }, map, title: station.name, icon: { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 7, fillColor: "#F59E0B", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1.5 }, zIndex: 8 });
          const infoWindow = new google.maps.InfoWindow({ content: `<div style="font-family:sans-serif;font-size:13px;max-width:240px"><strong>${station.name}</strong><br/>${station.highway}${dirLabel}${station.milepost != null ? ` — MM ${station.milepost}` : ""}<br/>${station.city ? `${station.city}, ` : ""}${station.state}<br/><span style="color:#9CA3AF;font-size:11px">Live status not available — check PrePass or Trucker Path app</span></div>` });
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
    [clearMap]
  );

  // Re-draw when map becomes ready and we have a route
  useEffect(() => {
    if (mapReady && plannedRoute) {
      drawRouteOnMap(plannedRoute);
    }
  }, [mapReady, plannedRoute, drawRouteOnMap]);

  useEffect(() => {
    if (mapReady && selectedParcelBoundary) drawParcelBoundary(selectedParcelBoundary);
  }, [mapReady, selectedParcelBoundary, drawParcelBoundary]);

  useEffect(() => () => clearParcelBoundary(), [clearParcelBoundary]);

  const addAddressStop = () => {
    const location = stopInput.trim();
    if (!location) return;
    setStops((current) => [...current, { id: `address-${crypto.randomUUID()}`, label: location, location, source: "address" }]);
    setStopInput("");
  };

  const showParcelBoundary = async (match: ParcelDestinationMatch) => {
    try {
      const boundary = await loadParcelBoundary.mutateAsync({ county: match.county, parcelId: match.parcelId });
      const overlay = boundary as ParcelBoundaryOverlay;
      setSelectedParcelBoundary(overlay);
      if (mapReady) drawParcelBoundary(overlay);
    } catch (err: any) {
      toast.info(err.message ?? "Parcel boundary could not be drawn. The Parcel ID map point is still available for routing.");
    }
  };

  const addParcelStop = async (match: ParcelDestinationMatch, mode: "origin" | "destination" | "stop") => {
    if (!match.centroid) {
      toast.error("This Parcel ID did not return a map point. Use its job-site address instead.");
      return;
    }
    const location = `${match.centroid.lat},${match.centroid.lng}`;
    const label = `Parcel ${match.parcelId} · ${match.county} County`;
    if (mode === "origin") {
      setOrigin(location);
    } else if (mode === "destination") {
      setDestination(location);
    }
    else setStops((current) => [...current, { id: `parcel-${crypto.randomUUID()}`, label, location, source: "parcel" }]);
    setSelectedParcel(match);
    setParcelMatches([]);
    await showParcelBoundary(match);
    toast.success(mode === "stop" ? "Parcel added as a route stop" : `Parcel set as ${mode}`);
  };

  const handleParcelLookup = async () => {
    if (!parcelCounty.trim() || !parcelId.trim()) {
      toast.error("Enter both the Tennessee county and Parcel ID");
      return;
    }
    try {
      const result = await lookupParcel.mutateAsync({ county: parcelCounty.trim(), parcelId: parcelId.trim() });
      const matches = result.matches as ParcelDestinationMatch[];
      setParcelMatches(matches);
      if (matches.length === 0) {
        toast.error("No mapped Parcel ID match found. Use the job-site address instead.");
      } else {
        toast.success(`${matches.length} parcel match${matches.length === 1 ? "" : "es"} found.`);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Parcel lookup failed");
    }
  };

  const handlePlanRoute = async () => {
    if (!destination.trim()) {
      toast.error("Enter a destination address");
      return;
    }
    try {
      const result = await planRoute.mutateAsync({
        origin: origin.trim(),
        destination: destination.trim(),
        stops,
      });
      setPlannedRoute(result as PlannedRoute);
      setShowSaveForm(false);
      setRouteChecks({});
      if (mapReady) drawRouteOnMap(result as PlannedRoute);
      toast.success(
        `Route planned — ${result.stationCount} weigh station${result.stationCount !== 1 ? "s" : ""} along the way`
      );
    } catch (err: any) {
      toast.error(err.message ?? "Failed to plan route");
    }
  };

  const useParcelDestination = (parcel: ParcelDestinationMatch) => {
    if (!parcel.address && !parcel.centroid) {
      toast.error("This parcel does not include a routable address or map point.");
      return;
    }
    const destinationValue = parcel.centroid
      ? `${parcel.centroid.lat},${parcel.centroid.lng}`
      : parcel.address!;
    setDestination(destinationValue);
    setSelectedParcel(parcel);
    void showParcelBoundary(parcel);
    setPlannedRoute(null);
    toast.success(`Parcel ${parcel.parcelId} set as the job-route destination.`);
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
        notes: serializeRuralRoutePlanNotes(stops, ruralAccessNotes),
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
    const restoredPlan = restoreRuralRoutePlan(route.notes);
    setSelectedParcel(null);
    setSelectedParcelBoundary(null);
    if (restoredPlan.clearParcelBoundary) clearParcelBoundary();
    setStops(restoredPlan.stops);
    setRuralAccessNotes(restoredPlan.ruralAccessNotes);
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

  // Fuel cost calculation
  const fuelCost = useMemo(() => {
    if (!plannedRoute || !dieselData) return null;
    const gallons = plannedRoute.distanceMiles / mpg;
    const cost = gallons * dieselData.pricePerGallon;
    return { gallons: gallons.toFixed(1), cost: cost.toFixed(2) };
  }, [plannedRoute, dieselData, mpg]);

  const towingTravelEstimate = useMemo(() => {
    if (!plannedRoute || !selectedVehicleProfile) return null;
    return calculateTowingTravelEstimate({
      googleDurationSeconds: plannedRoute.durationSeconds,
      distanceMiles: plannedRoute.distanceMiles,
      knownUnpavedMiles: plannedRoute.unpavedRouteApproximateMiles,
      profile: selectedVehicleProfile,
    });
  }, [plannedRoute, selectedVehicleProfile]);

  const openNewVehicleProfile = () => {
    const selected = selectedVehicleProfile;
    setVehicleProfileForm({
      name: selected ? `${selected.name} copy` : "",
      truck: selected?.truck ?? "",
      trailer: selected?.trailer ?? "",
      loadDescription: selected?.loadDescription ?? "",
      towingMpg: String(selected?.towingMpg ?? 9),
      towingTimeMultiplier: String(selected?.towingTimeMultiplier ?? 1.15),
      unpavedAverageMph: String(selected?.unpavedAverageMph ?? 18),
      isDefault: false,
      notes: selected?.notes ?? "",
    });
    setShowVehicleProfileForm(true);
  };

  const handleSaveVehicleProfile = () => {
    saveVehicleProfile.mutate({
      name: vehicleProfileForm.name.trim(),
      truck: vehicleProfileForm.truck.trim(),
      trailer: vehicleProfileForm.trailer.trim(),
      loadDescription: vehicleProfileForm.loadDescription.trim(),
      towingMpg: Number(vehicleProfileForm.towingMpg),
      towingTimeMultiplier: Number(vehicleProfileForm.towingTimeMultiplier),
      unpavedAverageMph: Number(vehicleProfileForm.unpavedAverageMph),
      isDefault: vehicleProfileForm.isDefault,
      notes: vehicleProfileForm.notes.trim() || undefined,
    });
  };

  const directionColor = (dir: string) => {
    if (dir === "NB" || dir === "EB") return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    if (dir === "SB" || dir === "WB") return "bg-orange-500/20 text-orange-300 border-orange-500/30";
    if (dir === "BOTH") return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    return "bg-white/10 text-white/40 border-white/15"; // UNKNOWN
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#121212] text-[#F0EDE6]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-1">
          <Route className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Rural Hauling Route Planner</h1>
        </div>
        <p className="text-sm text-white/50">
          Plan rural job-site routes, Parcel ID destinations, and working stops for your loaded setup. DOT weigh stations remain on the map as one of several route checks.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-0 overflow-hidden">
        {/* Left panel — inputs + results */}
        <div className="w-full lg:w-96 flex-shrink-0 flex flex-col border-r border-white/10 overflow-y-auto">
          {/* Route inputs */}
          <div className="p-5 space-y-3 border-b border-white/10">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-start gap-2">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="text-xs font-semibold text-amber-100">Selected hauling profile</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/65">{selectedVehicleProfile ? `${selectedVehicleProfile.truck} · ${selectedVehicleProfile.trailer} · ${selectedVehicleProfile.loadDescription}` : EQUIPMENT_PROFILE}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/40">This keeps your hauling setup visible during planning. It does not calculate legal dimensions, operating weight, bridge clearance, or truck-legal routing.</p>
                </div>
              </div>
            </div>
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
                onChange={(e) => { setDestination(e.target.value); setSelectedParcel(null); setSelectedParcelBoundary(null); clearParcelBoundary(); }}
                placeholder="Job site address, rural road, or city"
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
                onKeyDown={(e) => e.key === "Enter" && handlePlanRoute()}
              />
            </div>
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm font-semibold text-amber-200"><span className="flex items-center gap-2"><Truck className="h-4 w-4" /> Vehicle profile</span><button type="button" onClick={openNewVehicleProfile} className="text-[11px] text-amber-200 underline underline-offset-2">Save new</button></div>
              <select
                value={selectedVehicleProfile?.id ?? ""}
                onChange={(event) => {
                  const profile = (vehicleProfiles as RouteVehicleProfile[]).find((item) => item.id === Number(event.target.value));
                  setSelectedVehicleProfileId(profile?.id ?? null);
                  if (profile) setMpg(profile.towingMpg);
                }}
                className="h-9 w-full rounded-md border border-white/15 bg-black/20 px-2 text-xs text-white outline-none focus:border-amber-400"
              >
                {(vehicleProfiles as RouteVehicleProfile[]).map((profile) => <option key={profile.id} value={profile.id} className="bg-[#121212]">{profile.name}{profile.isDefault ? " · default" : ""}</option>)}
              </select>
              {selectedVehicleProfile && <>
                <p className="text-xs text-white/65">{selectedVehicleProfile.truck}</p>
                <p className="text-xs text-white/65">{selectedVehicleProfile.trailer} · {selectedVehicleProfile.loadDescription}</p>
                <p className="text-[10px] text-amber-100/70">Towing pace ×{selectedVehicleProfile.towingTimeMultiplier.toFixed(2)} · unpaved reference speed {selectedVehicleProfile.unpavedAverageMph.toFixed(0)} mph · default MPG {selectedVehicleProfile.towingMpg.toFixed(1)}</p>
              </>}
              <p className="text-[11px] text-amber-100/70">Directions are planning guidance only. Confirm road surface, bridge limits, turns, gates, overhead clearance, and turnaround room before moving this setup.</p>
            </div>
            {showVehicleProfileForm && (
              <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-white">Save vehicle profile</p><button type="button" onClick={() => setShowVehicleProfileForm(false)} className="text-xs text-white/40 hover:text-white">Close</button></div>
                <Input value={vehicleProfileForm.name} onChange={(event) => setVehicleProfileForm((current) => ({ ...current, name: event.target.value }))} placeholder="Profile name" className="h-8 bg-white/5 border-white/15 text-xs text-white" />
                <Input value={vehicleProfileForm.truck} onChange={(event) => setVehicleProfileForm((current) => ({ ...current, truck: event.target.value }))} placeholder="Truck" className="h-8 bg-white/5 border-white/15 text-xs text-white" />
                <Input value={vehicleProfileForm.trailer} onChange={(event) => setVehicleProfileForm((current) => ({ ...current, trailer: event.target.value }))} placeholder="Trailer" className="h-8 bg-white/5 border-white/15 text-xs text-white" />
                <Input value={vehicleProfileForm.loadDescription} onChange={(event) => setVehicleProfileForm((current) => ({ ...current, loadDescription: event.target.value }))} placeholder="Load or equipment" className="h-8 bg-white/5 border-white/15 text-xs text-white" />
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" min="1" value={vehicleProfileForm.towingMpg} onChange={(event) => setVehicleProfileForm((current) => ({ ...current, towingMpg: event.target.value }))} placeholder="MPG" className="h-8 bg-white/5 border-white/15 text-xs text-white" />
                  <Input type="number" min="0.5" step="0.05" value={vehicleProfileForm.towingTimeMultiplier} onChange={(event) => setVehicleProfileForm((current) => ({ ...current, towingTimeMultiplier: event.target.value }))} placeholder="Time factor" className="h-8 bg-white/5 border-white/15 text-xs text-white" />
                  <Input type="number" min="3" value={vehicleProfileForm.unpavedAverageMph} onChange={(event) => setVehicleProfileForm((current) => ({ ...current, unpavedAverageMph: event.target.value }))} placeholder="Unpaved MPH" className="h-8 bg-white/5 border-white/15 text-xs text-white" />
                </div>
                <p className="text-[10px] text-white/40">MPG · towing time factor · unpaved reference speed</p>
                <label className="flex items-center gap-2 text-[11px] text-white/65"><input type="checkbox" checked={vehicleProfileForm.isDefault} onChange={(event) => setVehicleProfileForm((current) => ({ ...current, isDefault: event.target.checked }))} className="accent-amber-500" /> Use as the default profile</label>
                <Button type="button" size="sm" onClick={handleSaveVehicleProfile} disabled={saveVehicleProfile.isPending} className="w-full bg-amber-600 hover:bg-amber-500">{saveVehicleProfile.isPending ? "Saving..." : "Save profile"}</Button>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wide">Working stops</label>
              <div className="flex gap-2">
                <Input value={stopInput} onChange={(e) => setStopInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAddressStop()} placeholder="Fuel, supplier, gate, or job stop" className="bg-white/5 border-white/15 text-white placeholder:text-white/30" />
                <Button type="button" variant="outline" size="icon" onClick={addAddressStop} disabled={!stopInput.trim()} className="border-white/15 text-white hover:bg-white/10"><Plus className="h-4 w-4" /></Button>
              </div>
              {stops.length > 0 && <div className="space-y-1">{stops.map((stop, index) => <div key={stop.id} className="flex items-center justify-between gap-2 rounded bg-white/5 px-2 py-1.5 text-xs"><span className="min-w-0 truncate text-white/75"><span className="mr-1 text-blue-300">{index + 1}.</span>{stop.label}</span><button type="button" onClick={() => setStops((current) => current.filter((item) => item.id !== stop.id))} className="text-white/40 hover:text-red-300"><X className="h-3.5 w-3.5" /></button></div>)}</div>}
            </div>
            <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><MapPinned className="h-4 w-4 text-blue-300" /> Tennessee Parcel ID destination</div>
              <div className="flex items-center gap-2 text-xs font-semibold text-white/75">
                <FileSearch className="h-4 w-4 text-amber-400" />
                Use a Tennessee Parcel ID as destination or stop
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-white/45">Look up the official Tennessee Property Viewer parcel record and use its available address or map point as the job destination. It is a planning reference, not a legal survey.</p>
              <div className="mt-3 grid gap-2">
                <select
                  value={parcelCounty}
                  onChange={(event) => { setParcelCounty(event.target.value); setParcelMatches([]); }}
                  className="h-9 rounded-md border border-white/15 bg-white/5 px-2 text-xs text-white outline-none focus:border-amber-400"
                >
                  <option value="" className="bg-[#121212]">Select county</option>
                  {SERVICE_AREA_COUNTIES.map((county) => <option key={county} value={county} className="bg-[#121212]">{county}</option>)}
                </select>
                <div className="flex gap-2">
                  <Input
                    value={parcelId}
                    onChange={(event) => setParcelId(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleParcelLookup(); } }}
                    placeholder="Parcel ID"
                    className="h-9 bg-white/5 border-white/15 text-white placeholder:text-white/30 text-xs"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={handleParcelLookup} disabled={lookupParcel.isPending} className="h-9 shrink-0 border-amber-500/40 bg-transparent text-amber-200 hover:bg-amber-500/10">
                    {lookupParcel.isPending ? "Finding..." : "Find"}
                  </Button>
                </div>
                {parcelMatches.map((parcel) => (
                  <div key={`${parcel.county}-${parcel.parcelId}`} className="rounded border border-white/10 bg-black/20 p-2.5">
                    <p className="text-xs font-semibold text-white">{parcel.address ?? "Address unavailable"}</p>
                    <p className="mt-0.5 text-[10px] text-white/45">Parcel {parcel.parcelId} · {parcel.county}{parcel.deedAcreage ? ` · ${parcel.deedAcreage} acres reported` : ""}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => addParcelStop(parcel, "origin")} className="border-white/15 px-2 text-[10px] text-white">Origin</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => addParcelStop(parcel, "stop")} className="border-white/15 px-2 text-[10px] text-white">Stop</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => addParcelStop(parcel, "destination")} className="border-white/15 px-2 text-[10px] text-white">Use as destination</Button>
                      {parcel.propertyViewerUrl && <a href={parcel.propertyViewerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-sky-300 underline underline-offset-2">Official map <ExternalLink className="h-3 w-3" /></a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {selectedParcel && <p className="text-[11px] text-amber-200">Planning to Parcel {selectedParcel.parcelId}{selectedParcel.address ? ` · ${selectedParcel.address}` : ""}</p>}
            {selectedParcelBoundary && <p className="text-[11px] text-amber-100/70">Amber outline shows the selected Parcel ID boundary for route-planning reference only, not a legal survey.</p>}
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wide">Rural access notes</label>
              <textarea value={ruralAccessNotes} onChange={(e) => setRuralAccessNotes(e.target.value)} placeholder="Unpaved drive, gate contact, bridge or culvert concern, narrow turn, soft ground, turnaround plan..." rows={3} className="w-full resize-y rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-500" />
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

              {towingTravelEstimate && selectedVehicleProfile && (
                <div className="rounded-lg border border-blue-400/25 bg-blue-400/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-blue-300" /><span className="text-sm font-semibold text-blue-100">Loaded towing time</span></div>
                    <span className="text-base font-bold text-blue-200">{towingTravelEstimate.estimatedDurationText}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/55">Google baseline {plannedRoute.durationText} × {selectedVehicleProfile.towingTimeMultiplier.toFixed(2)} for {selectedVehicleProfile.name}. {towingTravelEstimate.knownUnpavedMiles > 0 ? `${towingTravelEstimate.knownUnpavedMiles.toFixed(1)} mapped unpaved mile${towingTravelEstimate.knownUnpavedMiles === 1 ? "" : "s"} is estimated at ${selectedVehicleProfile.unpavedAverageMph.toFixed(0)} mph.` : "No route miles were identified from OSM surface tags."}</p>
                </div>
              )}

              <div className="rounded-lg border border-purple-400/25 bg-purple-400/5 p-3">
                <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-semibold text-purple-100"><Route className="h-4 w-4" /> Unpaved-road reference</span><span className="text-xs font-semibold text-purple-200">{plannedRoute.unpavedRoads.length} mapped segment{plannedRoute.unpavedRoads.length === 1 ? "" : "s"}</span></div>
                <p className="mt-1 text-[11px] leading-relaxed text-white/55">Purple map lines show nearby OpenStreetMap ways explicitly tagged with an unpaved surface. The reference is incomplete and may include or miss route-adjacent roads; verify the actual road, weather, and access before travel.</p>
                {plannedRoute.unpavedRoads.length > 0 && <p className="mt-1 text-[10px] text-purple-200/80">Approx. {plannedRoute.unpavedRouteApproximateMiles.toFixed(1)} route mile{plannedRoute.unpavedRouteApproximateMiles === 1 ? "" : "s"} matched to mapped unpaved surface data.</p>}
              </div>

              {plannedRoute.routeRestrictions.length > 0 && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                  <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" /><div><p className="text-sm font-semibold text-red-100">{plannedRoute.routeRestrictions.length} mapped route restriction{plannedRoute.routeRestrictions.length === 1 ? "" : "s"} found</p><p className="mt-1 text-[11px] leading-relaxed text-red-100/70">Red map markers flag nearby OpenStreetMap weight, height, clearance, or axle-load tags. These are reference alerts only. A missing alert does not mean the route is clear; verify current official restrictions and posted signs before hauling.</p></div></div>
                  <div className="mt-3 space-y-2">
                    {plannedRoute.routeRestrictions.map((restriction) => (
                      <div key={restriction.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-red-400/20 bg-black/10 px-2.5 py-2">
                        <div><p className="text-xs font-semibold text-white">{restrictionLabel[restriction.restrictionType]}: <span className="text-red-200">{restriction.value}</span></p><p className="text-[10px] text-white/55">{restriction.name}</p></div>
                        <a href={`https://www.openstreetmap.org/${restriction.osmType}/${restriction.osmId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-200 underline underline-offset-2">Review map tag <ExternalLink className="h-3 w-3" /></a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

              <div className="rounded-lg border border-blue-400/20 bg-blue-400/5 p-3 text-xs text-white/70">
                <div className="flex items-center gap-2 font-semibold text-blue-200"><Tractor className="h-4 w-4" /> Planned with your loaded rural hauling setup</div>
                <p className="mt-1">{RURAL_HAULING_PROFILE.truck} · {RURAL_HAULING_PROFILE.trailer} · {RURAL_HAULING_PROFILE.load}</p>
                <p className="mt-1 text-white/50">{plannedRoute.routeStops.length} scheduled stop{plannedRoute.routeStops.length === 1 ? "" : "s"} · {ruralAccessNotes.trim() || "No rural access notes added."}</p>
              </div>

              <div className={routeReviewComplete ? "rounded-lg border border-green-500/25 bg-green-500/10 p-3" : "rounded-lg border border-amber-500/25 bg-amber-500/5 p-3"}>
                <div className="flex items-start gap-2">
                  <ShieldAlert className={routeReviewComplete ? "mt-0.5 h-4 w-4 shrink-0 text-green-400" : "mt-0.5 h-4 w-4 shrink-0 text-amber-400"} />
                  <div>
                    <p className="text-sm font-semibold text-white">Rural hauling route review</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/55">Google driving directions do not verify road surface, posted weight limits, bridge clearance, gate clearance, turnaround room, or a safe route for this loaded setup. Verify each item before departure.</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {RURAL_ROUTE_CHECKS.map((check) => (
                    <label key={check} className="flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-white/70">
                      <input type="checkbox" checked={Boolean(routeChecks[check])} onChange={(event) => setRouteChecks((current) => ({ ...current, [check]: event.target.checked }))} className="mt-0.5 h-3.5 w-3.5 accent-amber-500" />
                      {check}
                    </label>
                  ))}
                </div>
                <p className={routeReviewComplete ? "mt-3 text-[10px] text-green-300" : "mt-3 text-[10px] text-amber-200"}>{routeReviewComplete ? "Route review checklist complete. Continue to use posted signs and field judgment." : "Complete the route review before using this plan for a loaded rural trip."}</p>
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
                    <span className="text-[10px] text-white/30">via OpenStreetMap</span>
                  </div>
                  {plannedRoute.weighStations
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
                          {station.direction !== "UNKNOWN" && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${directionColor(station.direction)}`}
                            >
                              {station.direction}
                            </Badge>
                          )}
                          {expandedStation === station.id ? (
                            <ChevronUp className="w-3.5 h-3.5 text-white/40" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                          )}
                        </div>
                      </button>

                      {expandedStation === station.id && (
                        <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-white/40">
                              Live open/closed status is not publicly available. Check the PrePass or Trucker Path app for current station status.
                            </span>
                          </div>
                          {station.notes && (
                            <p className="text-xs text-white/30 italic">{station.notes}</p>
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
                <div className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0" />
                Working stop or Parcel ID stop
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
                DOT weigh station (OSM data)
              </div>
              <p className="text-[10px] text-white/25 mt-1">Station locations sourced from OpenStreetMap. Live open/closed status is not publicly available — check PrePass or Trucker Path for current status.</p>
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
                <p className="text-white font-medium text-sm">Enter a job destination and click Plan Route</p>
                <p className="text-white/40 text-xs mt-1">
                  Use an address or Tennessee Parcel ID; DOT scale stations will appear along your route
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
