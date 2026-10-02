import React, { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Navigation, Search, X, Plus, Minus } from "lucide-react";
import "leaflet/dist/leaflet.css";

/* ═══ Map helpers ═══ */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
const pickupIcon = new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png", shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const dropoffIcon = new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png", shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const driverIcon = L.divIcon({
  className: "live-driver-marker",
  html: `<span class="live-driver-marker__pulse"></span><span class="live-driver-marker__dot"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></span>`,
  iconSize: [40, 40], iconAnchor: [20, 20],
});
const reverseGeocode = async (lat, lng) => {
  try { const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, { headers: { "Accept-Language": "en" } }); const data = await res.json(); return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
  catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
};
const fetchRoute = async (pickup, dropoff) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url); const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const distanceKm = (route.distance / 1000).toFixed(1);
      const totalMins = Math.round(route.duration / 60);
      const hours = Math.floor(totalMins / 60), mins = totalMins % 60;
      const durationLabel = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins} min`;
      return { coords, distanceKm, durationMins: totalMins, durationLabel };
    }
  } catch { /* silent */ }
  return null;
};
const MapClickHandler = ({ onPickup, onDropoff, mode }) => {
  useMapEvents({ click: async (e) => { const { lat, lng } = e.latlng; const address = await reverseGeocode(lat, lng); if (mode === "pickup") onPickup({ lat, lng, address }); else onDropoff({ lat, lng, address }); } });
  return null;
};
const MapFocus = ({ pickup, dropoff }) => {
  const map = useMap();
  const prevPickup = useRef(null), prevDropoff = useRef(null);
  useEffect(() => {
    const pChanged = pickup && (!prevPickup.current || prevPickup.current.lat !== pickup.lat || prevPickup.current.lng !== pickup.lng);
    const dChanged = dropoff && (!prevDropoff.current || prevDropoff.current.lat !== dropoff.lat || prevDropoff.current.lng !== dropoff.lng);
    if (pickup && dropoff && (pChanged || dChanged)) { const bounds = L.latLngBounds([pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]); map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 }); }
    else if (pChanged) map.flyTo([pickup.lat, pickup.lng], 16, { duration: 0.8 });
    else if (dChanged) map.flyTo([dropoff.lat, dropoff.lng], 16, { duration: 0.8 });
    prevPickup.current = pickup; prevDropoff.current = dropoff;
  }, [pickup, dropoff, map]);
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
  const mapRef = useRef(null);
  React.useImperativeHandle(ref, () => ({ getMap: () => mapRef.current, setZoom: (z) => mapRef.current?.setZoom(z), getZoom: () => mapRef.current?.getZoom?.() ?? 13 }));
  const defaultCenter = [14.7969, 120.8787];
  const handlePickup = useCallback(async (pin) => { setPickup(pin); if (!singlePoint) setClickMode("dropoff"); onPickupChange && onPickupChange(pin); }, [onPickupChange, singlePoint]);
  const handleDropoff = useCallback(async (pin) => { setDropoff(pin); if (!singlePoint) setClickMode("pickup"); onDropoffChange && onDropoffChange(pin); }, [onDropoffChange, singlePoint]);
  useEffect(() => {
    if (pickup && dropoff) {
      setLoading(true);
      fetchRoute(pickup, dropoff).then((result) => { setLoading(false); if (result) { setRoute(result.coords); const info = { distance: result.distanceKm, duration: result.durationMins, durationLabel: result.durationLabel }; setRouteInfo(info); onRouteChange && onRouteChange(info); } });
    } else { setRoute(null); setRouteInfo(null); }
  }, [pickup, dropoff, onRouteChange]);
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
      <MapContainer center={defaultCenter} zoom={13} className="map-picker__map" ref={mapRef} zoomControl={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapFocus pickup={pickup} dropoff={dropoff} />
        {!viewOnly && <MapClickHandler onPickup={handlePickup} onDropoff={handleDropoff} mode={clickMode} />}
        {pickup && (<Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}><Popup><div className="map-popup"><span className="map-popup__label pickup">{pinLabel}</span><p className="map-popup__address">{pickup.address}</p></div></Popup></Marker>)}
        {dropoff && (<Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}><Popup><div className="map-popup"><span className="map-popup__label dropoff">DROP-OFF LOCATION</span><p className="map-popup__address">{dropoff.address}</p></div></Popup></Marker>)}
        {driverCoords && (<Marker position={[driverCoords.lat, driverCoords.lng]} icon={driverIcon}><Popup><div className="map-popup"><span className="map-popup__label pickup">YOUR RIDER</span><p className="map-popup__address">Live location</p></div></Popup></Marker>)}
        {route && <Polyline positions={route} pathOptions={{ color: "#0D1B3E", weight: 5, opacity: 0.8 }} />}
      </MapContainer>
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
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=ph&limit=5`, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      setResults(data.map(d => ({ label: d.display_name.split(",")[0], address: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) })));
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
