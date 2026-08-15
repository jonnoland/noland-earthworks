import { useEffect, useRef, useState } from "react";
import { MapView } from "@/components/Map";

const COUNTY_GEOJSON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/tn-served-counties-35-v2_c7cfca3b.json";
const SERVICE_AREA_CENTER = { lat: 35.85, lng: -87.5 };

/** A lazy, non-interruptive visual reference for the published 35-county service area. */
export default function ServiceAreaMiniMap() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadMap, setLoadMap] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setLoadMap(true);
        observer.disconnect();
      }
    }, { rootMargin: "180px" });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="relative h-44 overflow-hidden border border-[#E07B2A]/30 bg-[#151515]" aria-label="Map of Noland Earthworks supported Middle and West Tennessee counties">
      {loadMap ? <MapView className="h-full" initialCenter={SERVICE_AREA_CENTER} initialZoom={7} onMapReady={(map) => {
        map.setOptions({ disableDefaultUI: true, zoomControl: true, gestureHandling: "cooperative", styles: [{ featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] }] });
        void fetch(COUNTY_GEOJSON_URL).then((response) => response.ok ? response.json() : null).then((geoJson) => {
          if (!geoJson) return;
          map.data.addGeoJson(geoJson);
          map.data.setStyle({ fillColor: "#E07B2A", fillOpacity: 0.24, strokeColor: "#E07B2A", strokeOpacity: 0.9, strokeWeight: 1.3 });
          const bounds = new google.maps.LatLngBounds();
          map.data.forEach((feature) => feature.getGeometry()?.forEachLatLng((latLng) => bounds.extend(latLng)));
          if (!bounds.isEmpty()) map.fitBounds(bounds, 14);
        }).catch(() => undefined);
      }} /> : <div className="flex h-full items-center justify-center font-['Lato'] text-xs text-white/45">Loading service-area map…</div>}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-[#E07B2A]/30 bg-[#121212]/90 px-2 py-1.5 font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f0ede6]">35 approved Middle & West Tennessee counties</div>
    </div>
  );
}
