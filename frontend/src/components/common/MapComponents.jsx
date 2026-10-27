import React, { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Search, X, Plus, Minus } from "lucide-react";

/*
  GASFAR MAPS (BEGINNER-FRIENDLY VERSION)

  OpenFreeMap provides the street map. No Google Maps key is needed.
  MapLibre draws that map, clickable pins, and lines on the screen.
  Geoapify is STILL used for address lookup and road directions.
  Driver GPS is handled by DriverTrackingProvider across driver pages.

  Important: A new GPS coordinate only MOVES an existing marker.
  It does NOT create another map or request more map tiles itself.
*/
// MapLibre GL JS v6 needs the Vite-bundled map worker.
// The worker draws/decodes vector-map data on a separate browser thread.
// This must be configured BEFORE we create a Map. Without it, the map
// can stay blank even if the OpenFreeMap style URL is valid.
maplibregl.setWorkerUrl(workerUrl);

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_CENTER = [120.8787, 14.7969]; // MapLibre coordinates = [longitude, latitude].
const EMPTY_GEOJSON = { type: "FeatureCollection", features: [] };

// A point stored by GASFAR uses { lat, lng }. Check before drawing it.
function validPoint(point) {
  return point && Number.isFinite(point.lat) && Number.isFinite(point.lng)
    && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
}

// MapLibre needs [longitude, latitude], while our existing pages use { lat, lng }.
function mapPoint(point) {
  return [point.lng, point.lat];
}

// Turn an array of GASFAR points into a GeoJSON line for MapLibre.
function lineData(points) {
  if (!points || points.length < 2) return EMPTY_GEOJSON;
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: points.map(mapPoint) },
    }],
  };
}

// A nearby-pickup circle needs a GeoJSON polygon.
// We calculate 48 points approximately 1,000 metres around the driver.
function nearbyCircle(point) {
  if (!validPoint(point)) return EMPTY_GEOJSON;
  const coordinates = [];
  const radiusInKm = 1;
  const latRadians = point.lat * Math.PI / 180;
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLng = Math.max(0.01, 111.32 * Math.cos(latRadians));
  for (let i = 0; i <= 48; i += 1) {
    const angle = (i / 48) * 2 * Math.PI;
    const lat = point.lat + (Math.cos(angle) * radiusInKm / kmPerDegreeLat);
    const lng = point.lng + (Math.sin(angle) * radiusInKm / kmPerDegreeLng);
    coordinates.push([lng, lat]);
  }
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature", properties: {},
      geometry: { type: "Polygon", coordinates: [coordinates] },
    }],
  };
}

// Geoapify reverse geocoding: convert a clicked coordinate into an address.
async function reverseGeocode(lat, lng) {
  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  if (!GEOAPIFY_KEY) return fallback;
  try {
    const params = new URLSearchParams({ lat, lon: lng, format: "json", apiKey: GEOAPIFY_KEY });
    const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.results?.[0]?.formatted || fallback;
  } catch (error) {
    console.warn("Geoapify could not find the address:", error);
    return fallback;
  }
}

// Keep completed routes briefly in memory. This avoids calling Geoapify again
// for identical locations when a customer revisits a page or opens history.
// In-memory means it disappears when the page is closed/reloaded: no database.
const routeCache = new Map();
const ROUTE_CACHE_MS = 5 * 60 * 1000;
// Recompute a selected booking's driver-to-destination road route no more
// often than once per minute. GPS marker updates are intentionally separate.
const DRIVER_ROUTE_REFRESH_MS = 60_000;

export async function fetchRoute(from, to) {
  if (!GEOAPIFY_KEY || !validPoint(from) || !validPoint(to)) return null;
  const key = `${from.lat.toFixed(5)},${from.lng.toFixed(5)}|${to.lat.toFixed(5)},${to.lng.toFixed(5)}`;
  const cached = routeCache.get(key);
  if (cached && Date.now() < cached.expires) return cached.value;
  if (cached) routeCache.delete(key);

  // An in-progress request is stored too, so two map components don't
  // request the same route from Geoapify at the same moment.
  const request = (async () => {
    try {
      // Geoapify waypoints are latitude,longitude (not MapLibre's order).
      const waypoints = `${from.lat},${from.lng}|${to.lat},${to.lng}`;
      const params = new URLSearchParams({ waypoints, mode: "drive", apiKey: GEOAPIFY_KEY });
      const response = await fetch(`https://api.geoapify.com/v1/routing?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const feature = data.features?.[0];
      if (!feature || !feature.geometry || !feature.properties) {
        throw new Error("Geoapify returned no road route.");
      }

      // GeoJSON uses [longitude, latitude]. Convert to our { lat, lng } format.
      let segments = [];
      if (feature.geometry.type === "MultiLineString") {
        segments = feature.geometry.coordinates;
      } else if (feature.geometry.type === "LineString") {
        segments = [feature.geometry.coordinates];
      }
      const coords = [];
      for (const segment of segments) {
        for (const pair of segment) {
          const point = { lat: pair[1], lng: pair[0] };
          if (!validPoint(point)) throw new Error("Invalid road coordinate.");
          coords.push(point);
        }
      }
      if (coords.length < 2) throw new Error("Road route is empty.");
      const distance = Number(feature.properties.distance);
      const seconds = Number(feature.properties.time);
      if (!Number.isFinite(distance) || !Number.isFinite(seconds)) {
        throw new Error("Geoapify returned invalid route measurements.");
      }
      const result = {
        coords,
        distanceKm: (distance / 1000).toFixed(1),
        distanceKmExact: distance / 1000,
        durationMins: Math.max(1, Math.ceil(seconds / 60)),
      };
      routeCache.set(key, { value: result, expires: Date.now() + ROUTE_CACHE_MS });
      // Limit memory usage: remember only the last 60 different routes.
      if (routeCache.size > 60) routeCache.delete(routeCache.keys().next().value);
      return result;
    } catch (error) {
      routeCache.delete(key); // Do not remember failures.
      console.warn("Geoapify routing failed:", error);
      return null;
    }
  })();
  routeCache.set(key, { value: request, expires: Date.now() + ROUTE_CACHE_MS });
  return request;
}

// Create a clickable pin using ordinary HTML and CSS.
// Using local HTML instead of remote pin images eliminates extra image requests.
function makePin(kind, text) {
  const element = document.createElement("div");
  element.className = `gasfar-map-pin gasfar-map-pin--${kind}`;
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", text);
  element.title = text;
  // Clicking a marker must not also select a pickup/drop-off on the map.
  element.addEventListener("click", (event) => event.stopPropagation());
  if (kind === "driver") {
    element.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>';
  }
  return element;
}

function makePopup(title, address, kind) {
  const box = document.createElement("div");
  box.className = "map-popup";
  const titleElement = document.createElement("span");
  titleElement.className = `map-popup__label ${kind}`;
  titleElement.textContent = title;
  const addressElement = document.createElement("p");
  addressElement.className = "map-popup__address";
  addressElement.textContent = address || "GPS location";
  box.append(titleElement, addressElement);
  return box;
}

/* Shared component: the SAME props that the current GASFAR pages already use. */
const MapPicker = React.forwardRef(function MapPicker({
  onPickupChange,
  onDropoffChange,
  onRouteChange,
  onDriverRouteChange,
  viewOnly = false,
  pickupCoords = null,
  dropoffCoords = null,
  driverCoords = null,
  userCoords = null, // A known customer GPS fix is used for camera centering only (no blue dot).
  viewerCoords, // Driver page uses its existing GPS watcher for camera centering.
  focusOnRoute = false, // Only selected booking details should automatically frame a route.
  showDriverMarker = false, // Never show a tracked driver outside selected booking details.
  nearbyPickups,
  onNearbyPickupClick = null,
  showDriverToPickup = false,
  driverRouteTarget = "pickup", // After pickup, the current destination becomes drop-off.
  mapMode = null,
  singlePoint = false,
  pinLabel = "PICKUP LOCATION",
}, ref) {
  const [pickup, setPickup] = useState(pickupCoords);
  const [dropoff, setDropoff] = useState(dropoffCoords);
  const [deliveryRoute, setDeliveryRoute] = useState(null);
  const [pickupRoute, setPickupRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(false);
  const [pickupRouteLoading, setPickupRouteLoading] = useState(false);
  const [pickupRouteError, setPickupRouteError] = useState(false);
  const [clickMode, setClickMode] = useState("pickup");
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  // The viewer means the PERSON looking at this map, not the delivery driver
  // that a customer is tracking. Keep these two locations separate.
  const [viewerPosition, setViewerPosition] = useState(() => {
    if (validPoint(viewerCoords)) return viewerCoords;
    if (validPoint(userCoords)) return userCoords;
    return null;
  });

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const lastDriverPositionRef = useRef(null); // Last REAL GPS fix, not a fabricated location.
  const nearbyMarkerRefs = useRef(new Map());
  const hasCenteredViewerRef = useRef(false);
  const userMovedMapRef = useRef(false);
  const lastFittedStage = useRef("");
  const mapClickRequestId = useRef(0);
  const driverRouteRequest = useRef({ time: 0, pickup: "", id: 0 });

  // Event handlers created once must read the CURRENT values, not old React state.
  const latestCallbacks = useRef({});
  const onRouteChangeRef = useRef(onRouteChange);
  const onDriverRouteChangeRef = useRef(onDriverRouteChange);
  const nearbyClickRef = useRef(onNearbyPickupClick);
  onRouteChangeRef.current = onRouteChange;
  onDriverRouteChangeRef.current = onDriverRouteChange;
  nearbyClickRef.current = onNearbyPickupClick;

  const handlePickup = useCallback((point) => {
    setPickup(point);
    if (!singlePoint) setClickMode("dropoff");
    if (onPickupChange) onPickupChange(point);
  }, [singlePoint, onPickupChange]);

  const handleDropoff = useCallback((point) => {
    setDropoff(point);
    if (!singlePoint) setClickMode("pickup");
    if (onDropoffChange) onDropoffChange(point);
  }, [singlePoint, onDropoffChange]);

  latestCallbacks.current = { clickMode, viewOnly, handlePickup, handleDropoff };

  // Preserve the ref API used by BookDeliveryPage.jsx and MapZoomControls.
  React.useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    setZoom: (zoom) => mapRef.current?.setZoom(zoom),
    getZoom: () => mapRef.current?.getZoom() ?? 13,
  }));

  // IMPORTANT: This effect has [] as its dependency array.
  // React creates the map ONCE when this component mounts, NOT on GPS updates.
  useEffect(() => {
    if (!mapDivRef.current) return;
    let map;
    try {
      // Prefer the actual viewer GPS if already available. If permission is
      // pending, the map shows the saved location/area temporarily and later
      // moves to the real GPS point ONCE when the browser returns it.
      const center = validPoint(viewerPosition) ? mapPoint(viewerPosition)
        : validPoint(pickupCoords) ? mapPoint(pickupCoords)
        : DEFAULT_CENTER;
      if (validPoint(viewerPosition)) hasCenteredViewerRef.current = true;
      map = new maplibregl.Map({
        container: mapDivRef.current,
        style: MAP_STYLE,
        center,
        zoom: 13,
        attributionControl: true,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      // Remember when a person drags/zooms the map. An asynchronous GPS fix
      // should NOT suddenly pull them away from the place they're viewing.
      map.on("movestart", (event) => {
        if (event.originalEvent) userMovedMapRef.current = true;
      });

      // The style is ready before every street tile has necessarily loaded.
      // Initialize our markers and route layers as soon as the STYLE loads,
      // rather than waiting for all street tiles (which could fail on a network).
      let styleReady = false;
      map.on("style.load", () => {
        styleReady = true;
        map.addSource("gasfar-delivery", { type: "geojson", data: EMPTY_GEOJSON });
        map.addLayer({
          id: "gasfar-delivery-line", type: "line", source: "gasfar-delivery",
          paint: { "line-color": "#0D1B3E", "line-width": 5, "line-opacity": 0.9 },
          layout: { "line-join": "round", "line-cap": "round" },
        });
        map.addSource("gasfar-driver-pickup", { type: "geojson", data: EMPTY_GEOJSON });
        map.addLayer({
          id: "gasfar-driver-pickup-line", type: "line", source: "gasfar-driver-pickup",
          // Driver -> pickup: the groupmate UI uses a BROKEN GREEN road line.
          // No new Geoapify requests are needed just to draw these dashes.
          paint: { "line-color": "#16A34A", "line-width": 5,
            "line-opacity": 0.9, "line-dasharray": [2, 1.7] },
          layout: { "line-join": "round", "line-cap": "round" },
        });
        map.addSource("gasfar-nearby-circle", { type: "geojson", data: EMPTY_GEOJSON });
        map.addLayer({
          id: "gasfar-nearby-fill", type: "fill", source: "gasfar-nearby-circle",
          paint: { "fill-color": "#16A34A", "fill-opacity": 0.08 },
        });
        map.addLayer({
          id: "gasfar-nearby-border", type: "line", source: "gasfar-nearby-circle",
          paint: { "line-color": "#16A34A", "line-width": 2, "line-opacity": 0.65 },
        });
        setMapError("");
        setMapReady(true);
      });

      map.on("click", async (event) => {
        const values = latestCallbacks.current;
        if (values.viewOnly) return;
        const lat = event.lngLat.lat;
        const lng = event.lngLat.lng;
        const id = ++mapClickRequestId.current;
        const address = await reverseGeocode(lat, lng);
        if (id !== mapClickRequestId.current) return; // Ignore older clicks.
        const point = { lat, lng, address };
        const current = latestCallbacks.current;
        if (current.clickMode === "pickup") current.handlePickup(point);
        else current.handleDropoff(point);
      });

      map.on("error", (event) => {
        const actualError = event.error;
        const message = actualError?.message || String(actualError || "Unknown map error");

        // See the REAL error in Chrome DevTools instead of assuming that
        // the user's internet is down. This helps identify blocked URLs,
        // failed tile requests, or worker / WebGL problems.
        console.error("GASFAR MapLibre error:", message, actualError);

        // Show the error only when it affects loading the map itself.
        // Minor rendering warnings should not hide a working map.
        const resourceFailed = /fetch|network|tile|worker|404|403|webgl|load/i.test(message);
        if (!styleReady || resourceFailed) {
          const explanation = message.length > 150 ? `${message.slice(0, 150)}…` : message;
          setMapError(`Map loading issue: ${explanation}`);
        }
      });
    } catch (error) {
      console.error("MapLibre could not initialize:", error);
      setMapError("Unable to display the interactive map.");
    }

    // Stop map tile requests and destroy the map when React removes this page.
    return () => {
      mapClickRequestId.current += 1;
      nearbyMarkerRefs.current.forEach((marker) => marker.remove());
      nearbyMarkerRefs.current.clear();
      pickupMarkerRef.current?.remove();
      dropoffMarkerRef.current?.remove();
      driverMarkerRef.current?.remove();
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;
      driverMarkerRef.current = null;
      if (map) map.remove();
      mapRef.current = null;
    };
    // We intentionally do not depend on driverCoords, pickup, or dropoff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DriverHomePage already watches GPS continuously; use that GPS as the
  // driver's own map centre. On customer pages, userCoords can also supply
  // a location after the user clicks "Use my current location".
  useEffect(() => {
    if (validPoint(viewerCoords)) setViewerPosition(viewerCoords);
  }, [viewerCoords?.lat, viewerCoords?.lng]);
  useEffect(() => {
    if (validPoint(userCoords)) setViewerPosition(userCoords);
  }, [userCoords?.lat, userCoords?.lng]);

  // Customer maps don't have a shared GPS watcher. Ask the browser for ONE
  // location per map mount; GPS itself needs no Geoapify or Google API calls.
  // If permission is denied, keep showing the route/normal fallback map.
  useEffect(() => {
    // `viewerCoords` exists on driver pages (even when currently null).
    // There, the existing watchPosition in DriverHomePage handles GPS.
    if (viewerCoords !== undefined || validPoint(userCoords)) return;
    if (!navigator.geolocation) return;
    let mounted = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mounted) return;
        setViewerPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => {
        // A rejected permission is not a map error; we don't invent a position.
        console.info("Viewer location unavailable:", error.message);
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 }
    );
    return () => { mounted = false; };
    // Only once per mount. Another booking poll must not ask for GPS again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // An unselected map centres on the viewer's current GPS, but it NEVER
  // puts a customer location marker on the map. In booking-detail mode the
  // route owns the camera, including if a late GPS fix arrives afterward.
  // Do not chase GPS updates or override manual panning in the idle map.
  useEffect(() => {
    if (!mapReady || focusOnRoute || !validPoint(viewerPosition) || hasCenteredViewerRef.current) return;
    if (userMovedMapRef.current) return;
    mapRef.current?.jumpTo({ center: mapPoint(viewerPosition), zoom: 14 });
    hasCenteredViewerRef.current = true;
  }, [mapReady, focusOnRoute, viewerPosition?.lat, viewerPosition?.lng]);

  // If an existing map switches back from a selected booking to idle,
  // discard the old route camera and return to the viewer's GPS position.
  const priorFocusOnRouteRef = useRef(focusOnRoute);
  useEffect(() => {
    if (!mapReady) return;
    if (priorFocusOnRouteRef.current && !focusOnRoute) {
      lastFittedStage.current = "";
      userMovedMapRef.current = false;
      hasCenteredViewerRef.current = false;
      if (validPoint(viewerPosition)) {
        mapRef.current?.jumpTo({ center: mapPoint(viewerPosition), zoom: 14 });
        hasCenteredViewerRef.current = true;
      }
    }
    priorFocusOnRouteRef.current = focusOnRoute;
  }, [mapReady, focusOnRoute, viewerPosition?.lat, viewerPosition?.lng]);

  // Give the customer/driver a way to return to their location after panning.
  function recenterOnViewer() {
    userMovedMapRef.current = true; // An explicit choice from the viewer.
    if (validPoint(viewerPosition)) {
      mapRef.current?.easeTo({ center: mapPoint(viewerPosition), zoom: 14, duration: 450 });
      return;
    }
    // Useful if they initially denied permission but want to try again.
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        const gps = { lat: position.coords.latitude, lng: position.coords.longitude };
        setViewerPosition(gps);
        mapRef.current?.easeTo({ center: mapPoint(gps), zoom: 14, duration: 450 });
        hasCenteredViewerRef.current = true;
      },
      (error) => console.info("Viewer location unavailable:", error.message),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 }
    );
  }

  // Showing the whole route is optional; it does NOT call Geoapify again.
  function showFullRoute() {
    if (!mapRef.current || !validPoint(pickup)) return;
    userMovedMapRef.current = true;
    const hasDriver = focusOnRoute && showDriverToPickup && showDriverMarker && validPoint(driverCoords);
    if (!validPoint(dropoff) && !hasDriver) {
      mapRef.current.easeTo({ center: mapPoint(pickup), zoom: 15, duration: 450 });
      return;
    }
    const bounds = new maplibregl.LngLatBounds(mapPoint(pickup), mapPoint(pickup));
    if (validPoint(dropoff)) bounds.extend(mapPoint(dropoff));
    if (hasDriver) bounds.extend(mapPoint(driverCoords));
    mapRef.current.fitBounds(bounds, { padding: 65, maxZoom: 15, duration: 450 });
  }

  // Create a marker once; on the next GPS update only call setLngLat().
  function showMarker(markerRef, point, kind, title, address) {
    if (!validPoint(point)) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const element = makePin(kind, title);
      const marker = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat(mapPoint(point))
        .addTo(mapRef.current);
      marker.setPopup(new maplibregl.Popup({ offset: 20 }).setDOMContent(makePopup(title, address, kind)));
      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat(mapPoint(point));
      markerRef.current.getPopup()?.setDOMContent(makePopup(title, address, kind));
    }
  }

  // Pickup and drop-off pins stay in the same place until the customer edits them.
  useEffect(() => {
    if (!mapReady) return;
    showMarker(pickupMarkerRef, pickup, "pickup", pinLabel, pickup?.address);
    showMarker(dropoffMarkerRef, dropoff, "dropoff", "DROP-OFF LOCATION", dropoff?.address);
  }, [mapReady, pickup, dropoff, pinLabel]);

  // Don't remove the rider as soon as a temporary GPS reading goes missing.
  // Keep the most recent ACTUAL coordinate and distinguish it from a fresh fix.
  // Never invent a GPS position: the icon appears after the first real fix.
  useEffect(() => {
    if (!mapReady) return;
    // A previously selected job must not leave its driver icon behind when
    // the map returns to the list. Clear the retained fix too, so a later
    // selection cannot accidentally reuse another booking's GPS point.
    if (!showDriverMarker) {
      lastDriverPositionRef.current = null;
      showMarker(driverMarkerRef, null, "driver", "", "");
      return;
    }
    if (validPoint(driverCoords)) {
      lastDriverPositionRef.current = driverCoords;
    }
    const visiblePoint = lastDriverPositionRef.current;
    if (visiblePoint) {
      const label = validPoint(driverCoords) ? "Driver GPS location" : "Last known driver location";
      showMarker(driverMarkerRef, visiblePoint, "driver", label,
        validPoint(driverCoords) ? "GPS position" : "Waiting for a new GPS update");
    }
  }, [mapReady, showDriverMarker, driverCoords?.lat, driverCoords?.lng]);

  // Customer GPS is intentionally NOT rendered as a map marker. The location
  // remains available for initial camera centering and the My location button.

  // Keep nearby pickup markers by booking ID, instead of deleting all of them
  // and recreating them every time the driver's GPS changes.
  useEffect(() => {
    if (!mapReady) return;
    const seen = new Set();
    const jobs = Array.isArray(nearbyPickups) ? nearbyPickups : [];
    for (const booking of jobs) {
      const point = booking.pickup;
      if (!validPoint(point)) continue;
      const id = String(booking.id);
      seen.add(id);
      let marker = nearbyMarkerRefs.current.get(id);
      if (!marker) {
        const element = makePin("nearby", "Booking " + id);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          if (nearbyClickRef.current) nearbyClickRef.current(booking.id);
        });
        marker = new maplibregl.Marker({ element, anchor: "center" })
          .setLngLat(mapPoint(point)).addTo(mapRef.current);
        nearbyMarkerRefs.current.set(id, marker);
      } else {
        marker.setLngLat(mapPoint(point));
      }
    }
    for (const [id, marker] of nearbyMarkerRefs.current) {
      if (!seen.has(id)) {
        marker.remove();
        nearbyMarkerRefs.current.delete(id);
      }
    }
  }, [mapReady, nearbyPickups]);

  // A 1-km circle follows driver GPS. Updating its GeoJSON costs NO routing API calls.
  useEffect(() => {
    if (!mapReady) return;
    const source = mapRef.current.getSource("gasfar-nearby-circle");
    // Only driver-list maps pass the nearbyPickups prop.
    // Show the radius even if there are currently zero bookings nearby.
    if (source) source.setData(nearbyCircle(Array.isArray(nearbyPickups) ? driverCoords : null));
  }, [mapReady, Array.isArray(nearbyPickups), driverCoords?.lat, driverCoords?.lng]);

  // Only an OPENED booking owns the camera. A booking wizard (even after
  // its pins are selected), customer booking list, or driver dashboard stays
  // centred on the viewer instead of jumping to the first available route.
  // We frame once per booking/leg (and once if driver GPS becomes available),
  // not on every subsequent GPS poll. The Full route button is still manual.
  useEffect(() => {
    if (!mapReady || !focusOnRoute || !validPoint(pickup)) {
      lastFittedStage.current = "";
      return;
    }
    const hasDriver = showDriverToPickup && showDriverMarker && validPoint(driverCoords);
    const stageKey = `${pickup.lat},${pickup.lng}|${dropoff?.lat},${dropoff?.lng}|${driverRouteTarget}|${hasDriver ? "with-driver" : "no-driver"}`;
    if (lastFittedStage.current === stageKey) return;
    const bounds = new maplibregl.LngLatBounds(mapPoint(pickup), mapPoint(pickup));
    if (validPoint(dropoff)) bounds.extend(mapPoint(dropoff));
    if (hasDriver) bounds.extend(mapPoint(driverCoords));
    if (validPoint(dropoff) || hasDriver) {
      mapRef.current?.fitBounds(bounds, { padding: 65, maxZoom: 16, duration: 0 });
    } else {
      mapRef.current?.jumpTo({ center: mapPoint(pickup), zoom: 15 });
    }
    lastFittedStage.current = stageKey;
    hasCenteredViewerRef.current = false;
    userMovedMapRef.current = false;
  }, [mapReady, focusOnRoute, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng,
    showDriverToPickup, showDriverMarker, driverRouteTarget,
    Boolean(showDriverToPickup && showDriverMarker && validPoint(driverCoords))]);

  // Pickup -> drop-off route is requested ONLY when the selected coordinates change.
  useEffect(() => {
    let active = true;
    if (!validPoint(pickup) || !validPoint(dropoff)) {
      setDeliveryRoute(null);
      setRouteLoading(false);
      setRouteError(false);
      onRouteChangeRef.current?.(null);
      return;
    }
    setDeliveryRoute(null);
    setRouteLoading(true);
    setRouteError(false);
    fetchRoute(pickup, dropoff).then((result) => {
      if (!active) return;
      setDeliveryRoute(result?.coords || null);
      setRouteLoading(false);
      setRouteError(!result);
      onRouteChangeRef.current?.(result ? {
        distance: result.distanceKm,
        distanceExact: result.distanceKmExact,
        duration: result.durationMins,
        durationLabel: `${result.durationMins} min`,
      } : null);
    });
    return () => { active = false; };
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  // Driver -> CURRENT destination: request once when a booking/leg is selected,
  // then no sooner than once every 60 seconds on a later GPS update.
  // The driver marker continues moving between these routing calculations.
  useEffect(() => {
    // Keep the existing prop name for compatibility with older pages.
    // Before pickup target=pickup; after pickup target=dropoff.
    const destination = driverRouteTarget === "dropoff" ? dropoff : pickup;
    if (!focusOnRoute || !showDriverMarker || !showDriverToPickup || !validPoint(driverCoords) || !validPoint(destination)) {
      setPickupRoute(null);
      setPickupRouteLoading(false);
      setPickupRouteError(false);
      driverRouteRequest.current.id += 1;
      driverRouteRequest.current.pickup = "";
      onDriverRouteChangeRef.current?.(null);
      return;
    }
    // Within 40 metres of pickup we are already there. Remove the green line
    // rather than requesting a short, confusing loop around the block.
    const latDifference = (driverCoords.lat - destination.lat) * 111320;
    const lngDifference = (driverCoords.lng - destination.lng) * 111320 * Math.cos(destination.lat * Math.PI / 180);
    if (Math.hypot(latDifference, lngDifference) < 40) {
      driverRouteRequest.current.id += 1; // Invalidate an earlier inflight route.
      setPickupRoute(null);
      setPickupRouteLoading(false);
      setPickupRouteError(false);
      onDriverRouteChangeRef.current?.({ distance: "0.0", duration: 0 });
      return;
    }
    const request = driverRouteRequest.current;
    const pickupKey = `${driverRouteTarget}:${destination.lat},${destination.lng}`;
    const elapsed = Date.now() - request.time;
    // Same leg: keep the current line and ETA until at least 60 seconds have
    // elapsed. A newly opened booking or switch from pickup to drop-off uses
    // a different key and is routed immediately.
    if (request.pickup === pickupKey && elapsed < DRIVER_ROUTE_REFRESH_MS) return;
    const id = ++request.id;
    request.time = Date.now();
    request.pickup = pickupKey;
    setPickupRouteLoading(true);
    setPickupRouteError(false);
    fetchRoute(driverCoords, destination).then((result) => {
      if (id !== driverRouteRequest.current.id) return;
      setPickupRoute(result?.coords || null);
      setPickupRouteLoading(false);
      setPickupRouteError(!result);
      onDriverRouteChangeRef.current?.(result ? {
        distance: result.distanceKm,
        duration: result.durationMins,
      } : null);
    });
  }, [focusOnRoute, showDriverMarker, showDriverToPickup, driverRouteTarget, driverCoords?.lat, driverCoords?.lng,
      pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  // Draw routes by changing the GeoJSON SOURCE; never recreate the base map.
  useEffect(() => {
    if (!mapReady) return;
    mapRef.current.getSource("gasfar-delivery")?.setData(lineData(deliveryRoute));
  }, [mapReady, deliveryRoute]);

  useEffect(() => {
    if (!mapReady) return;
    const visibleRoute = focusOnRoute && showDriverMarker && showDriverToPickup ? pickupRoute : null;
    mapRef.current.getSource("gasfar-driver-pickup")?.setData(lineData(visibleRoute));
  }, [mapReady, pickupRoute, focusOnRoute, showDriverMarker, showDriverToPickup]);

  // When a parent page selects a search result, keep this map's pins in sync.
  useEffect(() => { setPickup(pickupCoords ?? null); }, [pickupCoords?.lat, pickupCoords?.lng, pickupCoords?.address]);
  useEffect(() => { setDropoff(dropoffCoords ?? null); }, [dropoffCoords?.lat, dropoffCoords?.lng, dropoffCoords?.address]);
  useEffect(() => { if (mapMode) setClickMode(mapMode); }, [mapMode]);

  return (
    <div className="map-picker">
      {(routeLoading || pickupRouteLoading) && (
        <div className="map-loading-bar"><span>Calculating road route…</span></div>
      )}
      {!viewOnly && !mapMode && !singlePoint && (
        <div className="map-mode-bar">
          <button type="button" className={`map-mode-btn ${clickMode === "pickup" ? "active-pickup" : ""}`} onClick={() => setClickMode("pickup")}><MapPin size={13} /> Set Pickup</button>
          <button type="button" className={`map-mode-btn ${clickMode === "dropoff" ? "active-dropoff" : ""}`} onClick={() => setClickMode("dropoff")}><MapPin size={13} /> Set Drop-off</button>
        </div>
      )}
      <div ref={mapDivRef} className="map-picker__map" />
      <div className="gasfar-map-camera-actions">
        <button type="button" className="gasfar-map-camera-btn" onClick={recenterOnViewer} title="Center on my current location" aria-label="Center map on my location">
          <span aria-hidden="true">◎</span> My location
        </button>
        {validPoint(pickup) && (
          <button type="button" className="gasfar-map-camera-btn" onClick={showFullRoute} title="Show the pickup and drop-off on the map" aria-label="Show full delivery route">
            <span aria-hidden="true">↗</span> Full route
          </button>
        )}
      </div>
      {mapError && <div role="alert" className="gasfar-map-error">{mapError}</div>}
      {routeError && validPoint(pickup) && validPoint(dropoff) && (
        <div role="status" className="gasfar-map-error">Road route unavailable. Check your Geoapify key or connection.</div>
      )}
      {viewOnly && focusOnRoute && showDriverToPickup && (
        <div className="gasfar-map-route-legend" role="status">
          <span className="gasfar-map-route-key gasfar-map-route-key--driver" /> Driver → {driverRouteTarget === "dropoff" ? "drop-off" : "pickup"} &nbsp;
          <span className="gasfar-map-route-key gasfar-map-route-key--delivery" /> Pickup → drop-off
          {!validPoint(driverCoords) && <div>Waiting for driver GPS location.</div>}
          {pickupRouteError && <div>Driver route unavailable. Check Geoapify and internet access.</div>}
        </div>
      )}
    </div>
  );
});

// Keep Geoapify address autocomplete. Typing waits 600ms before searching.
// AbortController cancels an earlier request when the customer types again.
const MapSearchBar = ({ mode = "pickup", onSearch }) => {
  const modes = {
    pickup: { placeholder: "Search pickup location…", tag: "Pickup" },
    dropoff: { placeholder: "Search drop-off location…", tag: "Drop-off" },
    location: { placeholder: "Search address…", tag: "Address" },
  };
  const config = modes[mode] || modes.location;
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const requestRef = useRef(0);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();
    requestRef.current += 1;
  }, []);

  function changeQuery(value) {
    setQ(value);
    clearTimeout(timerRef.current);
    abortRef.current?.abort();
    const id = ++requestRef.current;
    setResults([]);
    setLoading(false);
    if (value.trim().length < 3 || !GEOAPIFY_KEY) return;

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          text: value.trim(), filter: "countrycode:ph", limit: "5",
          format: "json", apiKey: GEOAPIFY_KEY,
        });
        const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (id !== requestRef.current) return;
        const locations = [];
        for (const location of data.results || []) {
          const lat = Number(location.lat);
          const lng = Number(location.lon);
          if (!validPoint({ lat, lng })) continue;
          const address = location.formatted || `${lat}, ${lng}`;
          locations.push({
            lat, lng, address,
            label: location.name || address.split(",")[0],
          });
        }
        setResults(locations);
      } catch (error) {
        if (error.name !== "AbortError") console.warn("Geoapify search failed:", error);
        if (id === requestRef.current) setResults([]);
      } finally {
        if (id === requestRef.current) setLoading(false);
      }
    }, 600);
  }

  function select(location) {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();
    requestRef.current += 1;
    if (onSearch) onSearch({ lat: location.lat, lng: location.lng, address: location.address });
    setQ("");
    setResults([]);
    setLoading(false);
  }

  return (
    <div className="map-search-bar">
      {results.length > 0 && (
        <div className="map-search-bar__results">
          {results.map((result, index) => (
            <button key={index} type="button" onClick={() => select(result)} className="map-search-bar__result">
              <MapPin size={14} className="map-search-bar__result-icon" />
              <div><div className="map-search-bar__result-title">{result.label}</div><div className="map-search-bar__result-sub">{result.address.split(",").slice(1, 3).join(",").trim()}</div></div>
            </button>
          ))}
        </div>
      )}
      <div className="map-search-bar__input-wrap">
        <span className={`map-search-bar__lead-icon map-search-bar__lead-icon--${mode}`}>
          {loading ? <span aria-label="Searching…">…</span> : <Search size={16} strokeWidth={2} />}
        </span>
        <input value={q} onChange={(event) => changeQuery(event.target.value)} placeholder={config.placeholder} className="map-search-bar__input" />
        {q && <button type="button" onClick={() => changeQuery("")} className="map-search-bar__clear"><X size={14} /></button>}
        <span className={`map-search-bar__mode-tag map-search-bar__mode-tag--${mode}`}>{config.tag}</span>
      </div>
    </div>
  );
};

const MapZoomControls = ({ mapRef }) => {
  function zoom(amount) {
    const map = mapRef?.current;
    if (map) map.setZoom(map.getZoom() + amount);
  }
  return (
    <div className="map-zoom">
      <button type="button" onClick={() => zoom(1)} className="map-zoom__btn" aria-label="Zoom in"><Plus size={16} /></button>
      <button type="button" onClick={() => zoom(-1)} className="map-zoom__btn" aria-label="Zoom out"><Minus size={16} /></button>
    </div>
  );
};

const MapModeSwitcher = ({ mode, setMode, pickup, dropoff, onClear }) => (
  <div className="map-mode-switch">
    {["pickup", "dropoff"].map((value) => (
      <button key={value} type="button" onClick={() => setMode(value)}
        className={`map-mode-switch__btn${mode === value ? ` map-mode-switch__btn--active-${value}` : ""}`}>
        {value === "pickup" ? "Set Pickup" : "Set Drop-off"}
      </button>
    ))}
    {(pickup || dropoff) && <button type="button" onClick={onClear} className="map-mode-switch__clear"><X size={12} /> Clear</button>}
  </div>
);

export { MapPicker, MapSearchBar, MapZoomControls, MapModeSwitcher };
