import React from "react";

export type WorkAreaMapPoint = { lat: number; lng: number };

const EARTH_RADIUS_METERS = 6_378_137;
const SQUARE_FEET_PER_SQUARE_METER = 10.7639104167;
const SQUARE_FEET_PER_ACRE = 43_560;

/**
 * Calculates the local geodesic area of a drawn polygon. Work areas are normally
 * small enough that a local tangent-plane projection provides a stable estimate
 * without depending on a maps-library callback.
 */
export function calculatePolygonAreaSquareFeet(points: WorkAreaMapPoint[]): number {
  if (points.length < 3) return 0;
  if (points.some((point) => !Number.isFinite(point.lat) || !Number.isFinite(point.lng))) return 0;

  const averageLatitudeRadians = points.reduce((total, point) => total + point.lat, 0) / points.length * Math.PI / 180;
  const projected = points.map((point) => ({
    x: EARTH_RADIUS_METERS * point.lng * Math.PI / 180 * Math.cos(averageLatitudeRadians),
    y: EARTH_RADIUS_METERS * point.lat * Math.PI / 180,
  }));
  const squareMeters = Math.abs(projected.reduce((total, point, index) => {
    const next = projected[(index + 1) % projected.length];
    return total + (point.x * next.y - next.x * point.y);
  }, 0) / 2);

  return squareMeters * SQUARE_FEET_PER_SQUARE_METER;
}

export function calculatePolygonAreaAcres(points: WorkAreaMapPoint[]): number {
  return calculatePolygonAreaSquareFeet(points) / SQUARE_FEET_PER_ACRE;
}

type WorkAreaMeasureMapProps = {
  lat: number;
  lng: number;
  parcelBoundary?: WorkAreaMapPoint[][] | null;
  onApply: (acres: number) => void;
  onClose: () => void;
};

/**
 * A map-first field-measurement overlay. The parcel outline remains a reference
 * layer; the orange polygon is the actual work area selected for the quote.
 */
export default function WorkAreaMeasureMap({
  lat,
  lng,
  parcelBoundary,
  onApply,
  onClose,
}: WorkAreaMeasureMapProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [points, setPoints] = React.useState<WorkAreaMapPoint[]>([]);
  const [isDrawing, setIsDrawing] = React.useState(true);
  const [isFrameReady, setIsFrameReady] = React.useState(false);
  const acres = calculatePolygonAreaAcres(points);
  const hasPolygon = points.length >= 3 && acres > 0;

  const sendCommand = React.useCallback((command: "drawing" | "undo" | "clear", drawing?: boolean) => {
    iframeRef.current?.contentWindow?.postMessage({ type: "nolandWorkAreaCommand", command, drawing }, "*");
  }, []);

  React.useEffect(() => {
    if (isFrameReady) sendCommand("drawing", isDrawing);
  }, [isDrawing, isFrameReady, sendCommand]);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: string; points?: WorkAreaMapPoint[] } | null;
      if (data?.type !== "nolandWorkAreaChanged" || !Array.isArray(data.points)) return;
      setPoints(data.points.filter((point) => (
        typeof point?.lat === "number" && Number.isFinite(point.lat)
        && typeof point?.lng === "number" && Number.isFinite(point.lng)
      )));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const parcelBoundaryJson = JSON.stringify(parcelBoundary ?? []);
  const serverBase = "https://nolandearth-pymczdcn.manus.space";
  const srcdoc = `<!DOCTYPE html>
<html style="margin:0;padding:0;height:100%">
<head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#map{margin:0;padding:0;width:100%;height:100%;} .dot{width:23px;height:23px;border-radius:50%;background:#e87722;border:2px solid #fff;color:#1b1b1b;font:700 11px Arial;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 5px rgba(0,0,0,.55)}</style></head>
<body><div id="map"></div><script>
(async function(){
  const script=document.createElement('script');
  script.src='${serverBase}/api/maps/js?v=weekly&loading=async';
  script.async=true;document.head.appendChild(script);
  await new Promise(function(resolve){script.onload=resolve;});
  let attempts=0;
  while(typeof google==='undefined'||!google.maps||!google.maps.Map){if(++attempts>100)return;await new Promise(function(resolve){setTimeout(resolve,50);});}
  const center={lat:${lat},lng:${lng}};
  const map=new google.maps.Map(document.getElementById('map'),{center:center,zoom:17,mapTypeId:'satellite',disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy'});
  const parcelRings=${parcelBoundaryJson};
  const points=[];let drawing=true;let workPolygon=null;let workLine=null;let vertices=[];
  function clearOverlays(){if(workPolygon)workPolygon.setMap(null);if(workLine)workLine.setMap(null);vertices.forEach(function(marker){marker.setMap(null);});vertices=[];workPolygon=null;workLine=null;}
  function report(){window.parent.postMessage({type:'nolandWorkAreaChanged',points:points.map(function(point){return {lat:point.lat,lng:point.lng};})},'*');}
  function redraw(){clearOverlays();if(points.length>=2){workLine=new google.maps.Polyline({map:map,path:points,strokeColor:'#e87722',strokeOpacity:1,strokeWeight:3});}if(points.length>=3){if(workLine)workLine.setMap(null);workPolygon=new google.maps.Polygon({map:map,paths:points,strokeColor:'#e87722',strokeOpacity:1,strokeWeight:3,fillColor:'#e87722',fillOpacity:.26});}points.forEach(function(point,index){const marker=new google.maps.Marker({map:map,position:point,label:{text:String(index+1),color:'#1b1b1b',fontWeight:'700'},icon:{path:google.maps.SymbolPath.CIRCLE,fillColor:'#e87722',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:2,scale:10}});vertices.push(marker);});report();}
  if(parcelRings.length){const parcelBounds=new google.maps.LatLngBounds();parcelRings.forEach(function(ring){new google.maps.Polygon({map:map,paths:ring,strokeColor:'#49a7e8',strokeOpacity:.95,strokeWeight:2,fillOpacity:0,clickable:false});ring.forEach(function(point){parcelBounds.extend(point);});});parcelBounds.extend(center);map.fitBounds(parcelBounds,28);}
  new google.maps.Marker({map:map,position:center,title:'Property location',icon:{path:google.maps.SymbolPath.CIRCLE,fillColor:'#ffffff',fillOpacity:1,strokeColor:'#1f2937',strokeWeight:2,scale:6}});
  map.addListener('click',function(event){if(!drawing||!event.latLng)return;points.push({lat:event.latLng.lat(),lng:event.latLng.lng()});redraw();});
  window.addEventListener('message',function(event){const data=event.data||{};if(data.type!=='nolandWorkAreaCommand')return;if(data.command==='drawing'){drawing=Boolean(data.drawing);}if(data.command==='undo'){points.pop();redraw();}if(data.command==='clear'){points.splice(0,points.length);redraw();}});
  report();
})();<\/script></body></html>`;

  const applyMeasurement = () => {
    if (!hasPolygon) return;
    onApply(Math.round(acres * 100) / 100);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Measure work area" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(13, 15, 16, 0.92)", padding: 12, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 4px 11px" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: "var(--ne-cream)", fontWeight: 800, fontSize: 17, margin: 0 }}>Measure Work Area</p>
          <p style={{ color: "var(--ne-muted)", fontSize: 11, lineHeight: 1.35, margin: "3px 0 0" }}>Tap each corner of the area you plan to work. Blue is the parcel reference; orange is your work area.</p>
        </div>
        <button type="button" onClick={onClose} style={{ marginLeft: "auto", border: "1px solid var(--ne-border)", borderRadius: 8, background: "var(--ne-raised)", color: "var(--ne-cream)", padding: "8px 10px", fontWeight: 700, cursor: "pointer" }}>Close</button>
      </div>
      <div style={{ flex: 1, minHeight: 280, borderRadius: 12, overflow: "hidden", border: "1px solid oklch(0.65 0.18 50 / 0.55)" }}>
        <iframe ref={iframeRef} srcDoc={srcdoc} onLoad={() => setIsFrameReady(true)} style={{ width: "100%", height: "100%", border: "none", display: "block" }} title="Draw work area on satellite map" sandbox="allow-scripts allow-same-origin" />
      </div>
      <div style={{ marginTop: 10, borderRadius: 11, border: "1px solid var(--ne-border)", background: "var(--ne-raised)", padding: 10 }}>
        <p style={{ color: hasPolygon ? "oklch(0.75 0.18 145)" : "var(--ne-cream)", fontSize: 17, fontWeight: 800, margin: 0 }}>{hasPolygon ? `${acres.toFixed(2)} acres` : "Add at least 3 points"}</p>
        <p style={{ color: "var(--ne-muted)", fontSize: 10, lineHeight: 1.35, margin: "3px 0 9px" }}>{points.length} point{points.length === 1 ? "" : "s"} · Map estimate only; confirm the actual scope and conditions on site.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          <button type="button" onClick={() => setIsDrawing((current) => !current)} style={{ border: `1px solid ${isDrawing ? "var(--ne-amber)" : "var(--ne-border)"}`, borderRadius: 8, background: isDrawing ? "oklch(0.65 0.18 50 / 0.15)" : "transparent", color: isDrawing ? "var(--ne-amber)" : "var(--ne-cream)", padding: "8px 10px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{isDrawing ? "Drawing On" : "Enable Drawing"}</button>
          <button type="button" onClick={() => sendCommand("undo")} disabled={points.length === 0} style={{ border: "1px solid var(--ne-border)", borderRadius: 8, background: "transparent", color: points.length ? "var(--ne-cream)" : "var(--ne-muted)", padding: "8px 10px", fontWeight: 700, fontSize: 11, cursor: points.length ? "pointer" : "not-allowed" }}>Undo Point</button>
          <button type="button" onClick={() => sendCommand("clear")} disabled={points.length === 0} style={{ border: "1px solid var(--ne-border)", borderRadius: 8, background: "transparent", color: points.length ? "var(--ne-cream)" : "var(--ne-muted)", padding: "8px 10px", fontWeight: 700, fontSize: 11, cursor: points.length ? "pointer" : "not-allowed" }}>Clear</button>
          <button type="button" onClick={applyMeasurement} disabled={!hasPolygon} style={{ marginLeft: "auto", border: "none", borderRadius: 8, background: hasPolygon ? "var(--ne-amber)" : "var(--ne-raised)", color: hasPolygon ? "var(--ne-amber-ink)" : "var(--ne-muted)", padding: "8px 11px", fontWeight: 800, fontSize: 11, cursor: hasPolygon ? "pointer" : "not-allowed" }}>Use {hasPolygon ? `${acres.toFixed(2)} acres` : "Measured Area"}</button>
        </div>
      </div>
    </div>
  );
}
