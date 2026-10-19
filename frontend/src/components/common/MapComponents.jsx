import React, { useCallback, useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { MapPin, Search, X, Plus, Minus } from "lucide-react";

/* ═══ Setup ═══ */
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Browser-facing map keys come from .env (they are not server secrets).
if (GOOGLE_KEY) setOptions({ key: GOOGLE_KEY, v: "weekly" });

const MARKER_BASE = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/";
const PICKUP_ICON_URL = MARKER_BASE + "marker-icon-2x-blue.png";
const DROPOFF_ICON_URL = MARKER_BASE + "marker-icon-2x-orange.png";

/* ═══ Geoapify helpers ═══ */

// Click on map -> address
const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&format=json&apiKey=${GEOAPIFY_KEY}`
    );
    const data = await res.json();
    return data.results?.[0]?.formatted || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
};

// Get an actual road route from Geoapify. Both routes use the same helper.
// Geoapify returns [longitude, latitude]; Google Maps uses { lat, lng }.
async function fetchRoute(from, to) {
  if (!GEOAPIFY_KEY) return null;

  try {
    const url = `https://api.geoapify.com/v1/routing?waypoints=${from.lat},${from.lng}|${to.lat},${to.lng}&mode=drive&apiKey=${GEOAPIFY_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    // Supports both LineString and MultiLineString GeoJSON routes.
    const segments = feature.geometry.type === "MultiLineString"
      ? feature.geometry.coordinates
      : [feature.geometry.coordinates];
    const coords = segments.flatMap((segment) =>
      segment.map(([lng, lat]) => ({ lat, lng }))
    );
    if (coords.length < 2) return null;

    const distanceKm = (feature.properties.distance / 1000).toFixed(1);
    const durationMins = Math.max(1, Math.ceil(feature.properties.time / 60));
    return { coords, distanceKm, durationMins };
  } catch {
    return null; // No fake straight-line route when the routing API fails.
  }
}

function validPoint(point) {
  return point && Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

// Popup text may contain addresses entered by a user.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

/* ═══ MapPicker — used by booking, driver, and customer pages ═══ */
const MapPicker = React.forwardRef(function MapPicker({
  onPickupChange,
  onDropoffChange,
  onRouteChange,
  onDriverRouteChange,
  viewOnly = false,
  pickupCoords = null,
  dropoffCoords = null,
  driverCoords = null,
  showDriverToPickup = false,
  mapMode = null,
  singlePoint = false,
  pinLabel = "PICKUP LOCATION",
}, ref) {
  const [pickup, setPickup] = useState(pickupCoords);
  const [dropoff, setDropoff] = useState(dropoffCoords);
  const [deliveryRoute, setDeliveryRoute] = useState(null);
  const [pickupRoute, setPickupRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [pickupRouteLoading, setPickupRouteLoading] = useState(false);
  const [pickupRouteError, setPickupRouteError] = useState(false);
  const [clickMode, setClickMode] = useState("pickup");
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const infoWindowRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const deliveryLineRef = useRef(null);
  const pickupLineRef = useRef(null);
  const driverRouteRequest = useRef({ time: 0, pickup: "", driver: null, id: 0 });
  const lastFittedStage = useRef(false);
  const skipInitialFitRef = useRef(false);
  const latestCallbacks = useRef({});

  React.useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    setZoom: (zoom) => mapRef.current?.setZoom(zoom),
    getZoom: () => mapRef.current?.getZoom() ?? 13,
  }));

  const handlePickup = useCallback((point) => {
    setPickup(point);
    if (!singlePoint) setClickMode("dropoff");
    onPickupChange?.(point);
  }, [onPickupChange, singlePoint]);

  const handleDropoff = useCallback((point) => {
    setDropoff(point);
    if (!singlePoint) setClickMode("pickup");
    onDropoffChange?.(point);
  }, [onDropoffChange, singlePoint]);

  // Google Maps click handlers are created once; refs always hold the latest props.
  latestCallbacks.current = { clickMode, viewOnly, handlePickup, handleDropoff };
  const onRouteChangeRef = useRef(onRouteChange);
  const onDriverRouteChangeRef = useRef(onDriverRouteChange);
  onRouteChangeRef.current = onRouteChange;
  onDriverRouteChangeRef.current = onDriverRouteChange;

  // Initialize Google Maps once per mounted component.
  useEffect(() => {
    let cancelled = false;
    async function initializeMap() {
      if (!GOOGLE_KEY) {
        setMapError("Add VITE_GOOGLE_MAPS_API_KEY to your .env to display the map.");
        return;
      }
      try {
        const { Map } = await importLibrary("maps");

        const currentLocation = await new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve(null);
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            () => resolve(null),
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            }
          );
        });

        if (cancelled || !mapDivRef.current) return;

        skipInitialFitRef.current = Boolean(currentLocation);

        mapRef.current = new Map(mapDivRef.current, {
          center: currentLocation ||
            (validPoint(pickupCoords)
              ? pickupCoords
              : { lat: 14.7969, lng: 120.8787 }),
          zoom: currentLocation ? 14 : 13,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        infoWindowRef.current = new google.maps.InfoWindow();
        mapRef.current.addListener("click", async (event) => {
          const { clickMode, viewOnly, handlePickup, handleDropoff } = latestCallbacks.current;
          if (viewOnly) return;
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          const address = await reverseGeocode(lat, lng);
          if (clickMode === "pickup") handlePickup({ lat, lng, address });
          else handleDropoff({ lat, lng, address });
        });
        setMapReady(true);
      } catch {
        if (!cancelled) setMapError("Could not load Google Maps. Check the map key and internet connection.");
      }
    }
    initializeMap();
    return () => {
      cancelled = true;
      if (mapRef.current) google.maps.event.clearInstanceListeners(mapRef.current);
    };
  }, []);

  // Update the markers rather than recreating them on every GPS update.
  function showMarker(markerRef, point, icon, label, text) {
    if (!validPoint(point)) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const marker = new google.maps.Marker({
        map: mapRef.current,
        position: { lat: point.lat, lng: point.lng },
        icon,
      });
      marker.addListener("click", () => {
        infoWindowRef.current.setContent(marker.popupHtml);
        infoWindowRef.current.open(mapRef.current, marker);
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setPosition({ lat: point.lat, lng: point.lng });
    }
    markerRef.current.popupHtml = `<div class="map-popup"><span class="map-popup__label ${label}">${text}</span><p class="map-popup__address">${escapeHtml(point.address || "GPS location")}</p></div>`;
  }

  useEffect(() => {
    if (!mapReady) return;
    const size = new google.maps.Size(25, 41);
    showMarker(pickupMarkerRef, pickup,
      { url: PICKUP_ICON_URL, scaledSize: size }, "pickup", pinLabel);
    showMarker(dropoffMarkerRef, dropoff,
      { url: DROPOFF_ICON_URL, scaledSize: size }, "dropoff", "DROP-OFF LOCATION");
  }, [pickup, dropoff, mapReady, pinLabel]);

  useEffect(() => {
    if (!mapReady) return;
    // Orange navigation-arrow pin, like the driver's position in the wireframe.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42"><circle cx="21" cy="21" r="17" fill="#F47B20" stroke="white" stroke-width="4"/><path d="M13 23L30 12L25 30L21 23Z" fill="white" stroke="white" stroke-linejoin="round"/></svg>`;
    const driverIcon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(42, 42),
      anchor: new google.maps.Point(21, 21),
    };
    showMarker(driverMarkerRef,
      validPoint(driverCoords) ? { ...driverCoords, address: "Driver GPS location" } : null,
      driverIcon, "pickup", "DRIVER LOCATION");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverCoords?.lat, driverCoords?.lng, mapReady]);

  // Fit the map to pickup, drop-off, and (when available) the driver's position.
  // Do not repeatedly zoom out every time the driver's GPS changes.
  useEffect(() => {
    if (!mapReady) return;

    // Keep the device location centered when the map first opens
    if (skipInitialFitRef.current) {
      skipInitialFitRef.current = false;
      return;
    }

    if (!validPoint(pickup)) return;
    // Refit once when GPS first becomes available, even if the map was
    // already fitted before the driver enabled location sharing.
    const stageKey = `${pickup.lat},${pickup.lng}|${dropoff?.lat},${dropoff?.lng}|${showDriverToPickup && validPoint(driverCoords) ? "driver-visible" : "no-driver"}`;
    if (viewOnly && lastFittedStage.current === stageKey) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: pickup.lat, lng: pickup.lng });
    if (validPoint(dropoff)) bounds.extend({ lat: dropoff.lat, lng: dropoff.lng });
    if (showDriverToPickup && validPoint(driverCoords)) {
      bounds.extend({ lat: driverCoords.lat, lng: driverCoords.lng });
    }
    if (validPoint(dropoff) || (showDriverToPickup && validPoint(driverCoords))) {
      mapRef.current.fitBounds(bounds, 55);
    } else {
      mapRef.current.panTo(pickup);
      mapRef.current.setZoom(15);
    }
    lastFittedStage.current = stageKey;
  }, [pickup, dropoff, driverCoords?.lat, driverCoords?.lng, showDriverToPickup, mapReady, viewOnly]);

  // Original pickup -> drop-off road route: always visible with both points.
  useEffect(() => {
    if (!validPoint(pickup) || !validPoint(dropoff)) {
      setDeliveryRoute(null);
      return;
    }
    let cancelled = false;
    setDeliveryRoute(null);
    setRouteLoading(true);
    fetchRoute(pickup, dropoff).then((result) => {
      if (cancelled) return;
      setDeliveryRoute(result?.coords || null);
      setRouteLoading(false);
      onRouteChangeRef.current?.(result ? {
        distance: result.distanceKm,
        duration: result.durationMins,
        durationLabel: `${result.durationMins} min`,
      } : null);
    });
    return () => { cancelled = true; };
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  // Extra route: driver's current GPS -> pickup, only while heading to pickup.
  // Throttling reduces routing API usage as GPS coordinates change.
  useEffect(() => {
    if (!showDriverToPickup || !validPoint(driverCoords) || !validPoint(pickup)) {
      setPickupRoute(null);
      setPickupRouteError(false);
      setPickupRouteLoading(false);
      // Ignore any road-route request that finishes after this stage ends.
      driverRouteRequest.current.id += 1;
      driverRouteRequest.current.pickup = "";
      onDriverRouteChangeRef.current?.(null);
      return;
    }

    const request = driverRouteRequest.current;
    const pickupKey = `${pickup.lat},${pickup.lng}`;
    const elapsed = Date.now() - request.time;
    const moved = !request.driver || Math.hypot(
      driverCoords.lat - request.driver.lat,
      driverCoords.lng - request.driver.lng
    ) > 0.0007; // About 75 metres.

    // Refresh after significant movement, but no more than every 20 seconds.
    if (request.pickup === pickupKey && (elapsed < 20000 || (!moved && elapsed < 60000))) return;

    const id = ++request.id;
    request.pickup = pickupKey;
    request.driver = { lat: driverCoords.lat, lng: driverCoords.lng };
    request.time = Date.now();
    setPickupRouteLoading(true);
    setPickupRouteError(false);

    fetchRoute(driverCoords, pickup).then((result) => {
      if (id !== driverRouteRequest.current.id) return;
      setPickupRoute(result?.coords || null);
      setPickupRouteLoading(false);
      setPickupRouteError(!result);
      onDriverRouteChangeRef.current?.(result ? {
        distance: result.distanceKm,
        duration: result.durationMins,
      } : null);
    });
  }, [showDriverToPickup, driverCoords?.lat, driverCoords?.lng, pickup?.lat, pickup?.lng]);

  // Render distinct route colours on the same Google map.
  useEffect(() => {
    if (!mapReady) return;
    deliveryLineRef.current?.setMap(null);
    deliveryLineRef.current = deliveryRoute ? new google.maps.Polyline({
      map: mapRef.current,
      path: deliveryRoute,
      strokeColor: "#0D1B3E",  // Pickup -> drop-off (navy).
      strokeWeight: 5,
      strokeOpacity: 0.9,
      zIndex: 1,
    }) : null;
  }, [deliveryRoute, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    pickupLineRef.current?.setMap(null);
    pickupLineRef.current = showDriverToPickup && pickupRoute
      ? new google.maps.Polyline({
          map: mapRef.current,
          path: pickupRoute,
          strokeColor: "#2486D1", // Driver -> pickup (blue).
          strokeWeight: 6,
          strokeOpacity: 0.95,
          zIndex: 2,
        })
      : null;
  }, [pickupRoute, showDriverToPickup, mapReady]);

  useEffect(() => {
    setPickup(pickupCoords ?? null);
    setDropoff(dropoffCoords ?? null);
  }, [pickupCoords?.lat, pickupCoords?.lng, dropoffCoords?.lat, dropoffCoords?.lng]);
  useEffect(() => { if (mapMode) setClickMode(mapMode); }, [mapMode]);

  return (
    <div className="map-picker">
      {(routeLoading || pickupRouteLoading) && (
        <div className="map-loading-bar"><span>Calculating road route…</span></div>
      )}
      {!viewOnly && !mapMode && !singlePoint && (
        <div className="map-mode-bar">
          <button className={`map-mode-btn ${clickMode === "pickup" ? "active-pickup" : ""}`} onClick={() => setClickMode("pickup")}><MapPin size={13} /> Set Pickup</button>
          <button className={`map-mode-btn ${clickMode === "dropoff" ? "active-dropoff" : ""}`} onClick={() => setClickMode("dropoff")}><MapPin size={13} /> Set Drop-off</button>
        </div>
      )}
      <div ref={mapDivRef} className="map-picker__map" />
      {mapError && <div role="alert" style={{ padding: 12, background: "white" }}>{mapError}</div>}
      {viewOnly && showDriverToPickup && (
        <div role="status" style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 1000,
          background: "white", borderRadius: 10, padding: "8px 12px",
          boxShadow: "0 2px 12px rgba(0,0,0,.12)",
          maxWidth: "calc(100% - 24px)", fontSize: 12, lineHeight: 1.6,
        }}>
          <span style={{ color: "#2486D1", fontWeight: 700 }}>●</span> Driver → pickup &nbsp; 
          <span style={{ color: "#0D1B3E", fontWeight: 700 }}>●</span> Pickup → drop-off
          {!validPoint(driverCoords) && <div>Waiting for the driver's GPS location to show the pickup route.</div>}
          {pickupRouteError && <div>Driver route unavailable. Check the Geoapify key and internet connection.</div>}
        </div>
      )}
    </div>
  );
});

const MapSearchBar = ({ mode = "pickup", onSearch }) => {
  const config = { pickup: { placeholder: "Search pickup location…", tag: "Pickup" }, dropoff: { placeholder: "Search drop-off location…", tag: "Drop-off" }, location: { placeholder: "Search address…", tag: "Address" } }[mode] || { placeholder: "Search address…", tag: "Address" };
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const timerRef = React.useRef(null);
  const search = async (val) => {
    if (val.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(val)}&filter=countrycode:ph&limit=5&format=json&apiKey=${GEOAPIFY_KEY}`
      );
      const data = await res.json();
      setResults((data.results || []).map(d => ({ label: d.name || d.formatted.split(",")[0], address: d.formatted, lat: Number(d.lat), lng: Number(d.lon) })));
    } catch { setResults([]); }
    setLoading(false);
  };
  const handleChange = (e) => { setQ(e.target.value); clearTimeout(timerRef.current); timerRef.current = setTimeout(() => search(e.target.value), 400); };
  const select = (r) => { onSearch({ lat: r.lat, lng: r.lng, address: r.address }); setQ(""); setResults([]); };
  return (
    <div className="map-search-bar">
      {results.length > 0 && (
        <div className="map-search-bar__results">
          {results.map((r, i) => (<button key={i} type="button" onClick={() => select(r)} className="map-search-bar__result"><MapPin size={14} className="map-search-bar__result-icon" /><div><div className="map-search-bar__result-title">{r.label}</div><div className="map-search-bar__result-sub">{r.address.split(",").slice(1, 3).join(",").trim()}</div></div></button>))}
        </div>
      )}
      <div className="map-search-bar__input-wrap">
        <span className={`map-search-bar__lead-icon map-search-bar__lead-icon--${mode}`}>
          {loading ? (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="map-search-bar__spinner"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>) : <Search size={16} strokeWidth={2} />}
        </span>
        <input value={q} onChange={handleChange} placeholder={config.placeholder} className="map-search-bar__input" />
        {q && <button type="button" onClick={() => { setQ(""); setResults([]); }} className="map-search-bar__clear"><X size={14} /></button>}
        <span className={`map-search-bar__mode-tag map-search-bar__mode-tag--${mode}`}>{config.tag}</span>
      </div>
    </div>
  );
};
const MapZoomControls = ({ mapRef }) => {
  const zoom = (delta) => { const map = mapRef?.current; if (map) map.setZoom(map.getZoom() + delta); };
  return (<div className="map-zoom">{[{ delta: 1, Icon: Plus }, { delta: -1, Icon: Minus }].map(({ delta, Icon }) => (<button key={delta} type="button" onClick={() => zoom(delta)} className="map-zoom__btn"><Icon size={16} strokeWidth={2} /></button>))}</div>);
};
const MapModeSwitcher = ({ mode, setMode, pickup, dropoff, onClear }) => (
  <div className="map-mode-switch">
    {["pickup", "dropoff"].map(m => (<button key={m} type="button" onClick={() => setMode(m)} className={`map-mode-switch__btn${mode === m ? ` map-mode-switch__btn--active-${m}` : ""}`}>{m === "pickup" ? "Set Pickup" : "Set Drop-off"}</button>))}
    {(pickup || dropoff) && (<button type="button" onClick={onClear} className="map-mode-switch__clear"><X size={12} /> Clear</button>)}
  </div>
);

export { MapPicker, MapSearchBar, MapZoomControls, MapModeSwitcher };