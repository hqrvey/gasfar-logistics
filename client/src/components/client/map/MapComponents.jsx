import React, { useCallback, useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { MapPin, Search, X, Plus, Minus } from "lucide-react";

/* ═══ Setup ═══ */
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Runs once when the file loads (not on every render)
setOptions({ key: GOOGLE_KEY, v: "weekly" });

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

// Route between two points (Geoapify routing)
const fetchRoute = async (pickup, dropoff) => {
  try {
    const url =
      `https://api.geoapify.com/v1/routing?` +
      `waypoints=${pickup.lat},${pickup.lng}|${dropoff.lat},${dropoff.lng}` +
      `&mode=drive&apiKey=${GEOAPIFY_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const feature = data.features?.[0];
    if (feature) {
      // Geoapify gives [lng, lat]; Google wants { lat, lng }
      const coords = feature.geometry.coordinates.flat().map(([lng, lat]) => ({ lat, lng }));
      const distanceKm = (feature.properties.distance / 1000).toFixed(1);
      const totalMins = Math.round(feature.properties.time / 60);
      const hours = Math.floor(totalMins / 60), mins = totalMins % 60;
      const durationLabel = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins} min`;
      return { coords, distanceKm, durationMins: totalMins, durationLabel };
    }
  } catch { /* silent */ }
  return null;
};

/* ═══ MapPicker ═══ */
const MapPicker = React.forwardRef(({ onPickupChange, onDropoffChange, onRouteChange, viewOnly = false, pickupCoords = null, dropoffCoords = null, driverCoords = null, mapMode = null, singlePoint = false, pinLabel = "PICKUP LOCATION" }, ref) => {
  const [pickup, setPickup] = useState(pickupCoords);
  const [dropoff, setDropoff] = useState(dropoffCoords);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [clickMode, setClickMode] = useState("pickup");
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef(null);           // the Google map
  const mapDivRef = useRef(null);        // the <div> the map is drawn in
  const infoWindowRef = useRef(null);    // the popup
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const prevPickup = useRef(null);
  const prevDropoff = useRef(null);

  React.useImperativeHandle(ref, () => ({ getMap: () => mapRef.current, setZoom: (z) => mapRef.current?.setZoom(z), getZoom: () => mapRef.current?.getZoom?.() ?? 13 }));

  const defaultCenter = { lat: 14.7969, lng: 120.8787 };
  const getUserLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null)
    );
  });
};

  const handlePickup = useCallback(async (pin) => { setPickup(pin); if (!singlePoint) setClickMode("dropoff"); onPickupChange && onPickupChange(pin); }, [onPickupChange, singlePoint]);
  const handleDropoff = useCallback(async (pin) => { setDropoff(pin); if (!singlePoint) setClickMode("pickup"); onDropoffChange && onDropoffChange(pin); }, [onDropoffChange, singlePoint]);

  // The map click listener is added only once, so it would "remember" old values.
  // Keeping the latest values in a ref fixes that.
  const latest = useRef({});
  latest.current = { clickMode, viewOnly, handlePickup, handleDropoff };

  /* 1. Create the map (once) */
useEffect(() => {
  async function loadMap() {
    const { Map } = await importLibrary("maps");
    const userLocation = await getUserLocation();

    mapRef.current = new Map(mapDivRef.current, {
      center: userLocation || defaultCenter,
      zoom: 14,
      zoomControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });
    infoWindowRef.current = new google.maps.InfoWindow();

    mapRef.current.addListener("click", async (e) => {
      const { clickMode, viewOnly, handlePickup, handleDropoff } = latest.current;
      if (viewOnly) return;
      const lat = e.latLng.lat(), lng = e.latLng.lng();
      const address = await reverseGeocode(lat, lng);
      if (clickMode === "pickup") handlePickup({ lat, lng, address });
      else handleDropoff({ lat, lng, address });
    });
    setMapReady(true);
  }
  loadMap();
}, []);

  /* 2. Draw / move / remove a marker */
  const showMarker = (markerRef, point, icon, labelClass, labelText) => {
    if (!point) {
      if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null; }
      return;
    }
    const position = { lat: point.lat, lng: point.lng };
    if (!markerRef.current) {
      const marker = new google.maps.Marker({ map: mapRef.current, position, icon });
      marker.addListener("click", () => {
        infoWindowRef.current.setContent(marker.popupHtml);
        infoWindowRef.current.open(mapRef.current, marker);
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setPosition(position);
    }
    markerRef.current.popupHtml =
      `<div class="map-popup"><span class="map-popup__label ${labelClass}">${labelText}</span><p class="map-popup__address">${point.address || "Live location"}</p></div>`;
  };

  useEffect(() => {
    if (!mapReady) return;
    const size = new google.maps.Size(25, 41);
    showMarker(pickupMarkerRef, pickup, { url: PICKUP_ICON_URL, scaledSize: size }, "pickup", pinLabel);
    showMarker(dropoffMarkerRef, dropoff, { url: DROPOFF_ICON_URL, scaledSize: size }, "dropoff", "DROP-OFF LOCATION");
  }, [pickup, dropoff, mapReady, pinLabel]);

  useEffect(() => {
    if (!mapReady) return;
    const driverIcon = { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#2563eb", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 };
    showMarker(driverMarkerRef, driverCoords && { ...driverCoords, address: "Live location" }, driverIcon, "pickup", "YOUR RIDER");
  }, [driverCoords, mapReady]);

  /* 3. Zoom to the pins when they change */
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const pChanged = pickup && (!prevPickup.current || prevPickup.current.lat !== pickup.lat || prevPickup.current.lng !== pickup.lng);
    const dChanged = dropoff && (!prevDropoff.current || prevDropoff.current.lat !== dropoff.lat || prevDropoff.current.lng !== dropoff.lng);
    if (pickup && dropoff && (pChanged || dChanged)) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: pickup.lat, lng: pickup.lng });
      bounds.extend({ lat: dropoff.lat, lng: dropoff.lng });
      map.fitBounds(bounds, 60);
    } else if (pChanged) {
      map.panTo({ lat: pickup.lat, lng: pickup.lng }); map.setZoom(16);
    } else if (dChanged) {
      map.panTo({ lat: dropoff.lat, lng: dropoff.lng }); map.setZoom(16);
    }
    prevPickup.current = pickup; prevDropoff.current = dropoff;
  }, [pickup, dropoff, mapReady]);

  /* 4. Get the route from Geoapify */
  useEffect(() => {
    if (pickup && dropoff) {
      setLoading(true);
      fetchRoute(pickup, dropoff).then((result) => {
        setLoading(false);
        if (result) {
          setRoute(result.coords);
          const info = { distance: result.distanceKm, duration: result.durationMins, durationLabel: result.durationLabel };
          setRouteInfo(info);
          onRouteChange && onRouteChange(info);
        }
      });
    } else { setRoute(null); setRouteInfo(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff]);

  /* 5. Draw the route line on the map */
  useEffect(() => {
    if (!mapReady) return;
    if (routeLineRef.current) { routeLineRef.current.setMap(null); routeLineRef.current = null; }
    if (route) {
      routeLineRef.current = new google.maps.Polyline({
        map: mapRef.current,
        path: route,
        strokeColor: "#0D1B3E",
        strokeWeight: 5,
        strokeOpacity: 0.8,
      });
    }
  }, [route, mapReady]);

  useEffect(() => { setPickup(pickupCoords ?? null); setDropoff(dropoffCoords ?? null); }, [pickupCoords, dropoffCoords]);
  useEffect(() => { if (mapMode) setClickMode(mapMode); }, [mapMode]);

  return (
    <div className="map-picker">
      {loading && <div className="map-loading-bar"><span>Calculating route…</span></div>}
      {!viewOnly && !mapMode && !singlePoint && (
        <div className="map-mode-bar">
          <button className={`map-mode-btn ${clickMode === "pickup" ? "active-pickup" : ""}`} onClick={() => setClickMode("pickup")}><MapPin size={13} /> Set Pickup</button>
          <button className={`map-mode-btn ${clickMode === "dropoff" ? "active-dropoff" : ""}`} onClick={() => setClickMode("dropoff")}><MapPin size={13} /> Set Drop-off</button>
        </div>
      )}
      <div ref={mapDivRef} className="map-picker__map" />
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